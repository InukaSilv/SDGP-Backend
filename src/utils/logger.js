const colors = require("colors"); // Optional for better console output (install it using `npm install colors`)

// Log information
const logInfo = (message) => {
    console.log(colors.cyan(`[INFO]: ${message}`)); // Logs in cyan
};

// Log warnings
const logWarning = (message) => {
    console.warn(colors.yellow(`[WARNING]: ${message}`)); // Logs in yellow
};

// Log errors
const logError = (message) => {
    console.error(colors.red(`[ERROR]: ${message}`)); // Logs in red
};

module.exports = {
    logInfo,
    logWarning,
    logError,
};
