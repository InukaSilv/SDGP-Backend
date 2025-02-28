const mongoose = require("mongoose");
const { logInfo, logError } = require("../utils/logger");

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined. Check your .env file.");
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        logInfo(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logError(`MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;