const express = require("express");
const mysql = require("mysql2/promise");
const axios = require("axios");
const cors = require("cors");
const dbConfig = require('./config/db.config');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

//Create connection
const pool = mysql.createPool(dbConfig);

//Check database connection
app.use(async (req, res, next) =>{
    try{
        const connection = await pool.getConnection();
        await connection.release();
        next();
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ error: 'Database connection failed'});
    }
});

//Route to handle chat messages
app.post('api/chat', async (req, res) => {
    const { userId, message, conversationId } = req.body; 

    if (!userId || !message || !conversationId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try{
        //Forward request to AI service
        const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/chat`,{
            user_id: userId,
            message: message,
            conversation_id: conversationId
        });

        res.json(aiResponse.data);
    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({
            error: 'Error processing message',
            details: error.response?.data || error.message
        });
    }
});

//Route to get chat hostory
app.get('/api/chat-history/:conversationId', async (req, res) => {
    const { conversationId } = req.params;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM chats WHERE conversation_id = ? ORDER BY timestamp ASC',
            [conversationId]
        );
        res.join(rows);
    } catch (error) {
        console.error('Error fetching chat hostory: ', error);
        res.status(500).json({ error: 'Error fatching chat hostory'});
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});