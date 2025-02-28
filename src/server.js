require("dotenv").config(); //Force load environment variables first

const express = require("express");
const app = require("./app"); // Import the configured app
const { PORT } = require("./config/dotenv.config");

// Stripe requires raw body parsing for webhooks
app.use("/api/payments/webhook", express.raw({ type: "application/json" }))

console.log("Stripe API Key:", process.env.STRIPE_API_KEY);
console.log("MONGO_URI:", process.env.MONGO_URI);

// This is where the server starts
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Handle process exit to free port
process.on("SIGINT", () => {
    console.log("Shutting down server...");
    server.close(() => {
        console.log("Server shut down. Exiting process...");
        process.exit(0);
    });
});
