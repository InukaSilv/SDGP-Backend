require('dotenv').config

module.exports = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Hasindu@123',
    database: process.env.DB_DATABASE || 'boarding_house_chatbot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
