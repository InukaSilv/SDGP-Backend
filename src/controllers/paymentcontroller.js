const Payment = require("../models/Payment");
const axios = require("axios");

exports.initiatePayment = async (req, res) => {
  try {
    const { userId, featureType, amount } = req.body;

    const newPayment = new Payment({
      userId,
      featureType,
      amount,
      status: "pending",
    });

    await newPayment.save();

    const paymentData = {
      merchant_id: "YOUR_MERCHANT_ID",
      return_url: "http://localhost:5000/api/payments/success",
      cancel_url: "http://localhost:5000/api/payments/cancel",
      notify_url: "http://localhost:5000/api/payments/webhook",
      order_id: newPayment._id.toString(),
      items: `Premium ${featureType} Subscription`,
      currency: "LKR",
      amount: amount,
      first_name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
    };

    res.json({ success: true, paymentData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Payment initiation failed" });
  }
};

exports.paymentSuccess = async (req, res) => {
  const { order_id, status } = req.body;

  try {
    const payment = await Payment.findById(order_id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    payment.status = status === "success" ? "success" : "failed";
    await payment.save();

    res.json({ success: true, message: "Payment updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Payment update failed" });
  }
};