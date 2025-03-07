
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables (adjust the path if .env is in the project root)
dotenv.config({ path: '../.env' });

// Connect to the database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes 
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/listing", require("./routes/LstRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/listings", require("./routes/listingRoutes"));
// app.use("/api/payments", require("./routes/paymentRoutes"));

// Error handling middleware (if you have one)
// const { errorHandler } = require("./middlewares/errorHandler");
// app.use(errorHandler);

module.exports = app;
