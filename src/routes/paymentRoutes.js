const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// Create a payment intent
router.post('/create-payment-intent', protect, async (req, res) => {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
        return res.status(400).json({ message: 'Amount and currency are required' });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to smallest currency unit (e.g., cents)
            currency,
            metadata: { userId: req.user.id },
        });

        res.status(201).json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        logger.error('Error creating payment intent', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Handle Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const payload = req.body;
    const sig = req.headers['stripe-signature'];

    try {
        const event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET);

        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);
                // Add your logic to update the database here
                break;
            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                logger.warn(`PaymentIntent failed: ${failedIntent.id}`);
                break;
            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        logger.error('Webhook error', error);
        res.status(400).send('Webhook error');
    }
});

// Retrieve user's payment history
router.get('/history', protect, async (req, res) => {
    try {
        const charges = await stripe.charges.list({ limit: 10 });
        const userCharges = charges.data.filter(charge => charge.metadata.userId === req.user.id);

        res.status(200).json(userCharges);
    } catch (error) {
        logger.error('Error retrieving payment history', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
