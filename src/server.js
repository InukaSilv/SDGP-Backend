const app = require("./app"); // Import the configured app
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables

const PORT = process.env.PORT || 5000; // Use PORT from .env or default to 5000
console.log("Stripe API Key:", process.env.STRIPE_API_KEY);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
