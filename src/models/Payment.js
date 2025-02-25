// models/Payment.js
const mongoose = require("mongoose");

// Define the schema for storing payment details in MongoDB
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  featureType: { type: String, enum: ["stakeholder", "student"], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "LKR" },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },// Tracks payment status
  transactionId: { type: String, unique: true,required: true},
  createdAt: { type: Date, default: Date.now },// Timestamp for when the payment was made
});

module.exports = mongoose.model("Payments", paymentSchema);