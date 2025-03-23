const express = require('express');
const axios = require('axios');
const router = express.Router();

const CHATBOT_SERVICE_URL = process.env.CHATBOT_SERVICE_URL || 'https://chatbot-service-590336222818.us-central1.run.app';

// Route to forward chat requests to the chatbot service
router.post('/api/chat', async (req, res) => {
    try {
        const response = await axios.post(`${CHATBOT_SERVICE_URL}/chat`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling chatbot service:', error.message);
        res.status(500).json({ error: 'Failed to communicate with chatbot service' });
    }
});

module.exports = router;