const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config(); // Load environment variables
connectDB(); // Connect to the database

const paymentRoutes = require("./routes/paymentRoutes");
const app = express();

// Stripe requires raw body parsing for webhooks
app.use(express.json());
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(cors());

// Routes
app.use("/api/payments", paymentRoutes);

// Error handling middleware
const { errorHandler } = require("./middlewares/errorHandler");
app.use(errorHandler);

module.exports = app;