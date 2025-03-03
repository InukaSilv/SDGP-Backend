const Payment = require("../models/Payment");
const axios = require("axios");

exports.initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { featureType, amount } = req.body;

    if (!featureType || !amount) {
      return res.status(400).json({ error: "Feature type and amount are required" });
    }

    const newPayment = new Payment({
      userId,
      featureType,
      amount,
      status: "pending",
    });

    await newPayment.save();

    const paymentData = {
      merchant_id: process.env.MERCHANT_ID,  // Use environment variables
      return_url: "http://localhost:5000/api/payments/success",
      cancel_url: "http://localhost:5000/api/payments/cancel",
      notify_url: "http://localhost:5000/api/payments/webhook",
      order_id: newPayment._id.toString(),
      items: `Premium ${featureType} Subscription`,
      currency: "LKR",
      amount: amount.toFixed(2),
      first_name: req.user.name || "N/A",
      email: req.user.email || "N/A",
      phone: req.user.phone || "N/A",
    };

    // Send payment request to the gateway (if required)
    // Replace the URL with your actual payment provider's API endpoint
    const response = await axios.post("https://sandbox.payhere.lk/pay/checkout", paymentData);
    
    res.json({ success: true, paymentUrl: response.data.payment_url });

  } catch (error) {
    console.error("Payment initiation error:", error);
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
    console.error("Payment update error:", error);
    res.status(500).json({ error: "Payment update failed" });
  }
};