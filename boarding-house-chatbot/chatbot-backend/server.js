const express = require("express");
const { MongoClient } = require("mongodb");
const axios = require("axios");
const cors = require("cors");
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(cors());

// MongoDB Connection URI
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(process.env.DB_NAME || "boarding_house_chatbot");
    
    // Create indexes if needed
    await db.collection("chats").createIndex({ conversation_id: 1 });
    
    return true;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return false;
  }
}

// Middleware to ensure database connection
app.use(async (req, res, next) => {
  if (!db) {
    const connected = await connectToDatabase();
    if (!connected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }
  next();
});

// Route to handle chat messages
app.post('/api/chat', async (req, res) => {
  console.log("Received chat request:", req.body);
  const { userId, message, conversationId } = req.body;

  if (!userId || !message || !conversationId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Forward request to AI service
    console.log(`Forwarding to AI service at ${process.env.AI_SERVICE_URL}/chat`);
    const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/chat`, {
      user_id: userId,
      message: message,
      conversation_id: conversationId
    });

    console.log("AI service response:", aiResponse.data);

    // Send response back to client
    res.json(aiResponse.data);
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({
      error: 'Error processing message',
      details: error.response?.data || error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle application shutdown
process.on('SIGINT', async () => {
  console.log('Closing MongoDB connection');
  await client.close();
  process.exit(0);
});