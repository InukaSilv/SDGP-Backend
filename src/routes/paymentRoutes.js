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

module.exports = router;
