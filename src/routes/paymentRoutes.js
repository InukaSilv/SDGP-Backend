const express = require('express');
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const { protect } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');
const Payment = require("../models/Payment");

// Create a payment intent for Stripe transactions
router.post("/create-payment-intent", protect, async (req, res) => {
    const { amount, currency, featureType } = req.body;

    if (!amount || !currency || !featureType) {
        return res.status(400).json({ message: "Amount, currency, and featureType are required" });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert amount to cents for Stripe
            currency,
            metadata: { userId: req.user.id, featureType }, // Store user metadata
        });

        // Save payment details in MongoDB
        const newPayment = new Payment({
            userId: req.user.id,
            featureType,
            amount,
            currency,
            status: "pending",
            transactionId: paymentIntent.id,
        });
        await newPayment.save();

        res.status(201).json({ clientSecret: paymentIntent.client_secret }); // Return client secret for frontend payment processing
    } catch (error) {
        logger.error("Error creating payment intent", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Handle Stripe webhook events for payment success/failure
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const payload = req.body;
    const sig = req.headers["stripe-signature"];

    try {
        const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);
        logger.info(`Webhook received: ${event.type}`);

        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object;
                logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);

                const userId = paymentIntent.metadata?.userId; // Extract userId from metadata

                if (!userId) {
                    logger.error("User ID missing in metadata");
                    return res.status(400).send("User ID missing");
                }

                // Update payment status in MongoDB
                await Payment.findOneAndUpdate(
                    { transactionId: paymentIntent.id },
                    { status: "success" }
                );
                break;

            case "payment_intent.payment_failed":
                const failedIntent = event.data.object;
                logger.warn(`PaymentIntent failed: ${failedIntent.id}`);

                // Update failed payment in MongoDB
                await Payment.findOneAndUpdate(
                    { transactionId: failedIntent.id },
                    { status: "failed" }
                );
                break;

            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }

        res.status(200).send("Webhook received"); // Confirm webhook receipt
    } catch (error) {
        logger.error("Webhook error", error);
        res.status(400).send("Webhook error");
    }
});

// Retrieve a user's payment history from MongoDB
router.get("/history", protect, async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 }); // Fetch payments sorted by most recent
        res.status(200).json(payments);
    } catch (error) {
        logger.error("Error retrieving payment history", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
