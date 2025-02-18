// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  featureType: { type: String, enum: ["stakeholder", "student"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "LKR" },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  transactionId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);