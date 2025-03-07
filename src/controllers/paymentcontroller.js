const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const cron = require("node-cron");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { PRICES } = require("../config/constants");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailUtils");

//  Initiates a Stripe payment (called when user starts payment)
const initiatePayment = asyncHandler(async (req, res) => {
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
    let expiryDate = new Date();
    const activePayment = await Payment.findOne({ userId, featureType, status: "success" });
    if (activePayment && new Date(activePayment.subscriptionExpiry) > new Date()) {
        expiryDate = new Date(activePayment.subscriptionExpiry);
    }
    expiryDate.setDate(expiryDate.getDate() + 30)

    const amount = PRICES[featureType]; // Use fixed price

    try {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to cents
            currency,
            metadata: { userId, featureType, userRole: user.role},
        });

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
            subscriptionExpiry: null, 
        });

        await newPayment.save();
        logger.info(`Payment initiated: ${user.email} - ${featureType} - ${user.role} - LKR ${amount}`);
        res.json({ success: true, clientSecret: paymentIntent.client_secret });

    } catch (error) {
        logger.error(`Payment initiation failed: ${error.message}`);
        res.status(500).json({ error: "Payment initiation failed", message: error.message });
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
    if (event.type === "payment_intent.succeeded") {
        payment.status = "success";

        // Update user's subscription status
        await User.findByIdAndUpdate(payment.userId, { 
            isPremium: true, 
        });

        logger.info(`Payment successful: ${paymentIntent.id}| User upgraded to Premium`);
        
        // Send email confirmation
        const user = await User.findById(payment.userId);
        if (user) {
            sendEmail(user.email, "Subscription Activated", `
                <p>Dear ${user.firstName},</p>
                <p>Your <strong>${payment.featureType}</strong> subscription is now active.</p>
                <p>Subscription Expiry Date: ${expiryDate.toDateString()}</p>
                <p>Thank you for your support!</p>
                <p>Best Regards, <br/> RiVVE Team</p>
            `);
        } 
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
    logger.info("Running daily subscription expiry check...");
    const expiredPayments = await Payment.find({ status: "success", subscriptionExpiry: { $lt: new Date() } });

    for (const payment of expiredPayments) {
        await User.findByIdAndUpdate(payment.userId, { isPremium: false });
        logger.info(`User ${payment.userId} downgraded due to expired subscription.`);
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

module.exports = { initiatePayment, handleWebhook, getPaymentHistory };
