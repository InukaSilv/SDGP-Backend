const express = require("express");
const router = express.Router();
const { initiatePayment, handleWebhook, getPaymentHistory } = require("../controllers/paymentcontroller");
const { protect } = require("../middlewares/authMiddleware");

// Route to create a Stripe payment intent
router.post("/create-payment-intent", protect, (req, res, next) => {
    console.log("✅ Payment initiation route hit!");
    next();
}, initiatePayment);

//Route to handle Stripe webhook events
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// Route to get payment history
router.get("/history", protect, getPaymentHistory);

module.exports = router;
