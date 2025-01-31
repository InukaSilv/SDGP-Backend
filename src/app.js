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

// // Routes
// app.use("/api/auth", require("./routes/authRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/listings", require("./routes/listingRoutes"));
// app.use("/api/payments", require("./routes/paymentRoutes"));

// // Error handling middleware
// const { errorHandler } = require("./middlewares/errorHandler");
// app.use(errorHandler);

module.exports = app;