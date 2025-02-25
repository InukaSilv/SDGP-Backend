const app = require("./app"); // Import the configured app
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const PORT = process.env.PORT || 5001;
console.log("Stripe API Key:", process.env.STRIPE_API_KEY);

const server = app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Handle server errors
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
        process.exit(1); // Exit the process to avoid hanging
    } else {
        console.error("❌ Server error:", err);
    }
});
