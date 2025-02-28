const Payment = require("../models/Payment");

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
