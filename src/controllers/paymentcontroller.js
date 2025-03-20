const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const cron = require("node-cron");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { PRICES } = require("../config/constants");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailUtils");

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

    let expiryDate = new Date();

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

    try {
        // Create Stripe payment session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price: PRICES[`${role.toLowerCase()}_${planType.toLowerCase()}`], // Dynamically select the correct price
                    quantity: 1,
                },
            ],
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
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
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        return res.status(400).json({ error: "Webhook verification failed", message: error.message });
    }

    const session = event.data.object;
    
    // Handle successful payment    
    if (event.type === "checkout.session.completed") {
        const { userId, planType, planDuration, role } = session.metadata;

         // Get amount and currency from the session
        const amount = session.amount_total / 100; // Convert from cents to dollars/rupees
        const currency = session.currency;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

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
            logger.info(`Extending existing subscription for user ${userId} from ${expiryDate}`);
        }

        // If downgrading from Platinum to Gold, schedule Gold for after Platinum expires
        else if (activePayment && activePayment.planType === "platinum" && planType === "gold") {
            expiryDate = new Date(activePayment.subscriptionExpiry);
            logger.info(`User ${userId} scheduled downgrade from Platinum to Gold.`);
        }

        const durationDays = planDuration === "monthly" ? 30 : 365;
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        // If no payment record exists, create one
        const payment = new Payment({
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

        await payment.save();
        logger.info(`Payment initiated: ${user.email} - ${planType} - ${role} - ${currency} ${amount}`);
      
        // Update user's premium status
        await User.findByIdAndUpdate(userId, { isPremium: true });
        logger.info(`User upgraded to Premium: ${userId} | Expiry: ${expiryDate}`);
        
        // Send email confirmation with appropriate plan name
        const planName = planType === "gold" ? "Gold (Monthly)" : "Platinum (Annual)";
        const roleName = role.charAt(0).toUpperCase() + role.slice(1); // Capitalize first letter
        sendEmail(user.email, `${roleName} ${planName} Subscription Activated`, `
            <p>Dear ${user.firstName},</p>
            p>Your <strong>${roleName} ${planName} ${planDurationText}</strong> subscription is now active.</p>
            <p>Subscription Expiry Date: ${new Date(payment.subscriptionExpiry).toDateString()}</p>
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
    res.status(200).json({ received: true });
});

// Auto-downgrade expired subscriptions
cron.schedule("0 0 * * *", async () => {
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


//Gets a user's payment history
const getPaymentHistory = asyncHandler(async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(payments);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch payment history" });
    }
});

module.exports = { createCheckoutSession, handleWebhook, getPaymentHistory };
