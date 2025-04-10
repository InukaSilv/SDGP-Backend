const express = require("express");
const router = express.Router();
const { createCheckoutSession, handleWebhook, getPaymentHistory, cancelSubscription } = require("../controllers/paymentcontroller");
const { protect } = require("../middlewares/authMiddleware");

// Route to create a Stripe payment intent
router.post("/create-checkout-session", protect, createCheckoutSession);


// Route to get payment history
router.get("/history", protect, getPaymentHistory);


router.post('/cancel-subscription',protect, cancelSubscription);

module.exports = router;
