require("dotenv").config(); //Force load environment variables first

const app = require("./app"); // Import the configured app
const { PORT } = require("./config/dotenv.config.js");


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
