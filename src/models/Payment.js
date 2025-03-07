// models/Payment.js
const mongoose = require("mongoose");

// Define the schema for storing payment details in MongoDB
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userRole: { type: String, enum: ["Landlord", "Student"], required: true }, //  Stores user role
  featureType: { type: String, enum: ["standard", "advanced"], required: true }, 
  amount: { type: Number, required: true },
  currency: { type: String, default: "LKR" },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },// Tracks payment status
  transactionId: { type: String, unique: true,required: true},
  boughtDate:{ type: Date, default:Date.now },
  subscriptionExpiry: { type: Date, required: true },
  // Timestamp for when the payment was made
} ,{ timestamps: true });

module.exports = mongoose.model("Payments", paymentSchema);