const mongoose = require('mongoose');
const { MONGO_URI } = require('./dotenv.config');
const { logInfo, logError } = require("../utils/logger"); 

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: false,
        });
        logInfo(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        logError(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;