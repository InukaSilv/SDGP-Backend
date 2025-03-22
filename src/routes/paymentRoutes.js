const express = require("express");
const router = express.Router();
const { createCheckoutSession, handleWebhook, getPaymentHistory, verifyPaymentSession } = require("../controllers/paymentcontroller");
const { protect } = require("../middlewares/authMiddleware");

// Route to create a Stripe payment intent
router.post("/create-checkout-session", protect, createCheckoutSession);

//Route to handle Stripe webhook events
router.post("/webhook",handleWebhook);

// Route to get payment history
router.get("/history", protect, getPaymentHistory);

router.get('/verify/:sessionId', protect, verifyPaymentSession);

module.exports = router;
