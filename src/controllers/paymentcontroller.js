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
    const { featureType, currency = "LKR" } = req.body;
    const userId = req.user.id;

    // Check if user exists and is verified
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    if (!user.isEmailVerified) {
        return res.status(403).json({ error: "Email not verified. Please verify your email before making a payment." });
    }

    // Prevent wrong feature purchases
    if (user.role === "student" && featureType !== "standard") {
        return res.status(400).json({ error: "Students can only purchase Standard features." });
    }
    if (user.role === "landlord" && featureType !== "advanced") {
        return res.status(400).json({ error: "Landlords can only purchase Advanced features." });
    }

    // Check for active subscription & extend if applicable
    const activePayment = await Payment.findOne({ userId, featureType, status: "success" });
    let expiryDate = new Date();
    if (activePayment && new Date(activePayment.subscriptionExpiry) > new Date()) {
        expiryDate = new Date(activePayment.subscriptionExpiry); // Extend from current expiry
    }
    expiryDate.setDate(expiryDate.getDate() + 30)

    const amount = PRICES[featureType] * 100; // Use fixed price

    try {
        // Create Stripe payment session
        const session = await stripe.paymentIntents.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price_data: {
                        currency: "LKR",
                        product_data: {
                            name: `${featureType.toUpperCase()} Subscription`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/cancel`,
            metadata: {
                userId,
                featureType,
                userRole: user.role,
            },
        });

        res.json({ url: session.url });

    } catch (error) {
        logger.error(`Checkout session creation failed: ${error.message}`);
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

    const paymentIntent =event.data.object;
    const payment = await Payment.findOne({transactionId: paymentIntent.id});
    if(!payment) return res.status(404).json({error: "Payment record not found."});

//Handle successful payment    
    if (event.type === "checkout.session.completed") {
        payment.status = "success";
        const session = event.data.object;
        const { userId, featureType } = session.metadata;

    // Extend or replace subscription expiry based on user plan
        const user = await User.findById(payment.userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let expiryDate = new Date();
        const activePayment = await Payment.findOne({ userId: payment.userId, status: "success" });

        if (activePayment && new Date(activePayment.subscriptionExpiry) > new Date()) {
            expiryDate = new Date(activePayment.subscriptionExpiry); // Extend from current expiry
        }

        expiryDate.setDate(expiryDate.getDate() + 30);

        // Store payment details in MongoDB
        const newPayment = new Payment({
            userId,
            userRole: user.role,
            featureType,
            amount,
            currency,
            status: "pending",
            transactionId: paymentIntent.id,
            boughtDate: new Date(),
            subscriptionExpiry: expiryDate, 
        });

        await newPayment.save();
        logger.info(`Payment initiated: ${user.email} - ${featureType} - ${user.role} - LKR ${amount}`);
        res.json({ success: true, clientSecret: paymentIntent.client_secret });

        // If upgrading, remove the previous subscription
        if (user.isPremium && user.role === "student" && payment.featureType === "advanced") {
            await Payment.updateMany({ userId: payment.userId, status: "success" }, { status: "inactive" });
            logger.info(`Upgraded to Advanced: ${payment.userId}`);
        }

        await User.findByIdAndUpdate(payment.userId, { isPremium: true });

        logger.info(`Payment successful: ${paymentIntent.id} | User upgraded to Premium | Expiry: ${expiryDate}`);

        
        // Send email confirmation
        sendEmail(user.email, "Subscription Activated", `
            <p>Dear ${user.firstName},</p>
            <p>Your <strong>${payment.featureType}</strong> subscription is now active.</p>
            <p>Subscription Expiry Date: ${new Date(payment.subscriptionExpiry).toDateString()}</p>
            <p>Thank you for your support!</p>
            <p>Best Regards, <br/> RiVVE Team</p>
        `);
        logger.info(`Email sent to ${user.email} | Payment ID: ${paymentIntent.id}`);
        res.status(200).json({ received: true });
        
    }     
//Handle failed payment        
    else if (event.type === "payment_intent.payment_failed") {
        payment.status = "failed";
        logger.warn(`Payment failed: ${paymentIntent.id}`);
    }

    // Save updates to payment collection
    await payment.save()
    res.status(200).json({ received: true });
});

// Auto-downgrade expired subscriptions
cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    const expiredUsers = await Payment.find({ subscriptionExpiry: { $lt: now }, status: "success" });

    for (let payment of expiredUsers) {
        await User.findByIdAndUpdate(payment.userId, { isPremium: false });
        await Payment.updateOne({ _id: payment._id }, { status: "expired" });
        logger.info(`Subscription expired: User ${payment.userId} downgraded.`);
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
