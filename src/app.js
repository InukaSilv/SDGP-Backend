const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config(); // Load environment variables
connectDB(); // Connect to the database


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const userRoutes = require("./routes/userRoutes");



// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/payments", paymentRoutes);


// Error handling middleware
const { errorHandler } = require("./middlewares/errorHandler");
app.use(errorHandler);

module.exports = app;