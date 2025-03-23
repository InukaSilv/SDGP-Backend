const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const cron = require("node-cron");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { PRICES } = require("../config/constants");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailUtils");

// Generates an auth token for success redirect
const generateAuthToken = (user) => {
    return `mocked_token_for_${user._id}`;
};

//  Initiates a Stripe payment (called when user starts payment)
const createCheckoutSession = asyncHandler(async (req, res) => {
    const { planType, planDuration } = req.body;
    const userId = req.user ? req.user.id : null;
    
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized. User ID missing." });
    }

    // Check if user exists and is verified
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    if (!user.isEmailVerified) {
        return res.status(403).json({ error: "Email not verified. Please verify your email before making a payment." });
    }

    // Check for active subscription & extend if applicable
    const activePayment = await Payment.findOne({ 
        userId, 
        status: "success",
        subscriptionExpiry: { $gt: new Date() }
     });
     
    if (activePayment) {
        const currentPlan = activePayment.planType;

        // Prevent users from buying the same plan again
        if (currentPlan === planType) {
            return res.status(400).json({
                error: `You already have an active ${planType} plan. No need to pay again.`
            });
        }

        // Allow upgrades immediately gold to platinem
        if (currentPlan === "gold" && planType === "platinum") {
            logger.info(`User ${userId} upgraded from Gold to Platinum.`);
        }

        //  Delay downgrades until current plan expires
        if (currentPlan === "platinum" && planType === "gold") {
            return res.status(400).json({
                error: "Your Platinum plan is still active. You can downgrade after expiry."
            });
        }   
    }

    const role = user.role.toLowerCase();
    const priceId = PRICES[`${role}_${planType.toLowerCase()}`];

    if (!priceId) {
        return res.status(400).json({ error: "Invalid plan or role" });
    }

    const userToken = generateAuthToken(user);
    try {
        // Create Stripe payment session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price: priceId ,// Dynamically select the correct price
                    quantity: 1,
                },
            ],
    
            success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&token=${userToken}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            metadata: {
                userId,
                planType,
                planDuration,
                role
            },
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error(`Checkout session creation failed: ${error.message}`);
        res.status(500).json({ error: "Failed to create checkout session"});
    }
});



// Handles Stripe webhook (for payment success/failure)
const handleWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig, 
            process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log("Webhook received:", event.type)
        
        // Handle successful payment    
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const { userId, planType, planDuration, role } = session.metadata;

            if (!userId || !planType || !planDuration || !role) {
                console.error("Missing metadata fields in session object.");
                return res.status(400).json({ error: "Invalid metadata in webhook payload" });
            }

            // Get amount and currency from the session
            const amount = session.amount_total / 100; // Convert from cents to dollars/rupees
            const currency = session.currency;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                console.error("User ID is missing in metadata!");
                return res.status(404).json({ error: "User not found" });
            }

            await User.findByIdAndUpdate(userId, { isPremium: true });
            // Calculate subscription expiry date
            let expiryDate = new Date();
            const activePayment = await Payment.findOne({ 
                userId, 
                status: "success",
                subscriptionExpiry: {$gt: new Date()}
            });

            // If there's an active subscription, extend from its expiry date
            if (activePayment && activePayment.planType === "gold" && planType === "platinum") {
                expiryDate = new Date();
                logger.info(`Extending existing subscription for user ${userId}`);
            }

            // If downgrading from Platinum to Gold, schedule Gold for after Platinum expires
            else if (activePayment && activePayment.planType === "platinum" && planType === "gold") {
                expiryDate = new Date(activePayment.subscriptionExpiry);
                logger.info(`User ${userId} scheduled downgrade from Platinum to Gold.`);
            }

            const durationDays = planDuration === "monthly" ? 30 : 365;
            expiryDate.setDate(expiryDate.getDate() + durationDays);

            // If no payment record exists, create one
            const newPayment = new Payment({
                userId,
                userRole: role,
                planType,
                planDuration,
                amount,
                currency,
                status: "success",
                transactionId: session.id,
                boughtDate: new Date(),
                subscriptionExpiry: expiryDate, 
            });

            await newPayment.save();
            logger.info(`Payment initiated: ${user.email} - ${planType} - ${role} - ${currency} ${amount}`);
        
            // Update user's premium status
            await User.findByIdAndUpdate(userId, { isPremium: true });
            logger.info(`User upgraded to Premium: ${userId} | Expiry: ${expiryDate}`);
            
            // Send email confirmation with appropriate plan name
            const planName = planType === "gold" ? "Gold " : "Platinum ";
            
            const PLAN_DETAILS = {
                student: {
                    gold:{features: [
                        "Unlimited Property Searches & Filters ",
                        "Ad-Free Experience ",
                        "Priority Booking ",
                        "Direct Chat with Landlords",
                        "Early Access to New Listings ",
                        "Tenant Rating System"
                    ]},
                    platinum:{features: [
                        "Unlimited Property Searches & Filters",
                        "Ad-Free Experience ",
                        "Priority Booking ",
                        "Direct Chat with Landlords",
                        "Early Access to New Listings",
                        "Tenant Rating System",
                        "Exclusive Rent Discounts"
                    ]},
                },
                    landlord: {
                    gold:{features: [
                        "Unlimited Property Listings ",
                        "Boosted Ads",
                        "Direct Chat with Tenants ",
                        "Verified Badge",
                        "roperty Analytics ",
                        "Featured Listing on Homepage",     
                    ]},
                    platinum:{features:[
                        "Unlimited Property Listings ",
                        "Boosted Ads",
                        "Direct Chat with Tenants ",
                        "Verified Badge",
                        "roperty Analytics ",
                        "Featured Listing on Homepage",
                        "Discounted Renewal "
                    ]}
                }
            };
            
            const planDurationText = planDuration === "monthly" ? "Monthly" : "Annual";

            
            const roleName = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize first letter
            sendEmail(user.email, `${roleName} ${planName} Subscription Activated`, `
                <p>Dear ${user.firstName},</p>
                p>Your <strong>${roleName} ${planName} ${planDurationText}</strong> subscription is now active.</p>
                <p>Subscription Expiry Date: ${new Date(newPayment.subscriptionExpiry).toDateString()}</p>
                <p>Features included:</p>
                <ul>
                    ${PLAN_DETAILS[role][planType].features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <p>Thank you for your support!</p>
                <p>Best Regards, <br/> RiVVE Team</p>
            `);
            logger.info(`Email sent to ${user.email} | Payment ID: ${session.id}`);   
        }  

//Handle failed payment        
        else if (event.type === "payment_intent.payment_failed") {
            const paymentIntent = event.data.object;
            const payment = await Payment.findOne({ transactionId: paymentIntent.id });
            
            if (payment) {
                payment.status = "failed";
                await payment.save();
                logger.warn(`Payment failed: ${paymentIntent.id}`);
                
                // Notify user about failed payment
                const user = await User.findById(payment.userId);
                if (user) {
                    sendEmail(user.email, "Payment Failed", `
                        <p>Dear ${user.firstName},</p>
                        <p>We're sorry, but your recent payment attempt failed.</p>
                        <p>Please check your payment information and try again.</p>
                        <p>If you continue to experience issues, please contact our support team.</p>
                        <p>Best Regards, <br/> RiVVE Team</p>
                    `);
                    logger.info(`Payment failure email sent to ${user.email}`);
                }
            }
        }

// Handle subscription cancellation
        else if (event.type === "customer.subscription.deleted") {
            const subscription = event.data.object;
            const payment = await Payment.findOne({ transactionId: subscription.id });
        
            if (payment) {
                payment.status = "cancelled";
                await payment.save();
        
                await User.findByIdAndUpdate(payment.userId, { isPremium: false });
                logger.info(`Subscription cancelled: User ${payment.userId} downgraded.`);

                // Send email notification
                const user = await User.findById(payment.userId);
                if (user) {
                    sendEmail(user.email, "Subscription Cancelled", `
                        <p>Dear ${user.firstName},</p>
                        <p>Your subscription has been cancelled.</p>
                        <p>If you did not request this cancellation, please contact our support team.</p>
                        <p>Best Regards, <br/> RiVVE Team</p>
                    `);
                    logger.info(`Cancellation email sent to ${user.email}`);
                }
            }
        }
        res.status(200).json({ received: true });
    } catch (error) {
        console.error("webhook signature verification failed.")
        return res.status(400).json({ error: "Webhook verification failed", message: error.message });
    }
});


exports.verifySession = async (req, res) => {
    try {
      const { sessionId } = req.query;
  
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
  
      // Retrieve session details from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
  
      // Check if the payment was successful
      if (session.payment_status === 'paid') {
        res.status(200).json({ message: 'Payment successful!' });
      } else {
        res.status(400).json({ error: 'Payment not completed.' });
      }
    } catch (err) {
      console.error('Error verifying session:', err);
      res.status(500).json({ error: 'Internal server error. Please try again.' });
    }
};

// Auto-downgrade expired subscriptions
subscribtionCron = cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    const expiredPayments = await Payment.find({ 
        subscriptionExpiry: { $lt: now }, 
        status: "success" 
    });

    for (let payment of expiredPayments) {
        const hasActiveSubscription = await Payment.findOne({
            userId: payment.userId,
            status: "success",
            subscriptionExpiry: { $gt: now },
            _id: { $ne: payment._id }
        });

        if (!hasActiveSubscription) {
            // Check if user has other active subscriptions before downgrading
            await User.findByIdAndUpdate(payment.userId, { isPremium: false });
            logger.info(`Subscription expired: User ${payment.userId} downgraded.`);
            
            // Notify user about subscription expiration
            const user = await User.findById(payment.userId);
            if (user) {
                sendEmail(user.email, "Subscription Expired", `
                    <p>Dear ${user.firstName},</p>
                    <p>Your subscription has expired.</p>
                    <p>To continue enjoying premium features, please renew your subscription.</p>
                    <p>Best Regards, <br/> RiVVE Team</p>
                `);
                logger.info(`Expiration email sent to ${user.email}`);
            }
        }
        await Payment.updateOne({ _id: payment._id }, { status: "expired" });
    }
    logger.info("Auto-downgrade task completed.");
});


const cancelSubscription = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Find active subscription
        const activePayment = await Payment.findOne({ 
            userId, 
            status: "success",
            subscriptionExpiry: { $gt: new Date() }
        });
        
        if (!activePayment) {
            return res.status(404).json({ error: "No active subscription found" });
        }
        
        const stripeSubscriptionId = activePayment.transactionId;
        await stripe.subscriptions.del(stripeSubscriptionId);

        // Update payment status
        activePayment.status = "cancelled";
        await activePayment.save();
        
        // Update user premium status
        await User.findByIdAndUpdate(userId, { isPremium: false });
        
        // Get user details for email
        const user = await User.findById(userId);
        
        // Send cancellation email
        sendEmail(user.email, "Subscription Cancelled", `
            <p>Dear ${user.firstName},</p>
            <p>Your subscription has been cancelled as requested.</p>
            <p>You will continue to have access to premium features until ${new Date(activePayment.subscriptionExpiry).toDateString()}.</p>
            <p>We hope to see you again soon!</p>
            <p>Best Regards, <br/> RiVVE Team</p>
        `);
        
        logger.info(`Subscription manually cancelled: User ${userId}`);
        
        res.status(200).json({ message: "Subscription cancelled successfully" });
        
    } catch (error) {
        console.error(`Subscription cancellation failed: ${error.message}`);
        res.status(500).json({ error: "Failed to cancel subscription" });
    }
});

//Gets a user's payment history
const getPaymentHistory = asyncHandler(async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch payment history" });
    }
});


module.exports = { createCheckoutSession, handleWebhook, getPaymentHistory, cancelSubscription };
