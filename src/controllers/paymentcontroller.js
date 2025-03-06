const asyncHandler = require("express-async-handler");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const Payment = require("../models/Payment");
const User = require("../models/User");
const { PRICES } = require("../config/constants");
const logger = require("../utils/logger");

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
    // 🔹 Prevent duplicate payments (if user already has an active premium subscription)
    const existingPayment = await Payment.findOne({ userId, featureType, status: "success" });
    if (existingPayment) {
        return res.status(400).json({ error: "You already have an active subscription." });
    }

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

//Handle successful payment    
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        //Update payment status in MongoDB
        const payment = await Payment.findOneAndUpdate(
            { transactionId: paymentIntent.id },
            { status: "success" },
            { new: true }
        );

        if (payment) {
            // Upgrade user to Premium after successful payment
            await User.findByIdAndUpdate(payment.userId, { isPremium: true });

        logger.info(`Payment successful: ${paymentIntent.id}| User upgraded to Premium`);
        }   
    }     
//Handle failed payment        
    else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        await Payment.findOneAndUpdate(
            { transactionId: paymentIntent.id },
            { status: "failed" }
        );
        logger.warn(`Payment failed: ${paymentIntent.id}`);
    }

    res.status(200).json({ received: true });
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
