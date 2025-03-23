const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables 
dotenv.config({ path: '../.env' });

// Connect to the database
connectDB();

const app = express();


app.use(express.json());
app.use(cors());

// Routes 
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/listing", require("./routes/LstRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));

// Error handling middleware
// const { errorHandler } = require("./middlewares/errorHandler");
// app.use(errorHandler);

module.exports = app;
