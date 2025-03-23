require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { handleWebhook } = require('./controllers/paymentcontroller');
const authRoutes = require('./routes/authRoutes');
const LstRoutes = require('./routes/LstRoutes');
const adminAuthRoute = require("./routes/adminAuth");
const userRoutes = require("./routes/userChatRoutes");
const messageRoutes = require("./routes/messagesChatRoute");
const wishlistRoutes = require("./routes/wishlistRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const admin = require('./config/firebaseAdmin'); 
const cors = require('cors');
const http = require("http");
const socket = require("socket.io");
const {initializeSocket} = require("./controllers/listingcontroller");

const app = express();
const server = http.createServer(app);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.io for listings
initializeSocket(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listing', LstRoutes);
app.use("/api/admin", adminAuthRoute);
app.use("/api/wishlist", wishlistRoutes)
app.use("/api/payments", paymentRoutes);
// Chat routes from index.js
app.use("/api/auth", userRoutes);
app.use("/api/messages", messageRoutes);

// Health check endpoint
app.get("/api/health-check", (req, res) => {
    res.status(200).json({ message: "Server is healthy" });
});

// Connect to MongoDB
// Main MongoDB connection from server.js
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
});

// Set up Socket.io for chat
const io = socket(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true
    },
    transports: ['polling']
  });

global.onlineUsers = new Map();

io.on("connection", (socket) => {
    global.chatSocket = socket;
    
    socket.on("add-user", (userId) => {
        console.log(`User connected: ${userId}`);
        onlineUsers.set(userId, socket.id);
    });

    socket.on("send-msg", (data) => {
        console.log(`Message from ${data.from} to ${data.to}: ${data.message}`);
        
        const sendUserSocket = onlineUsers.get(data.to);
        if (sendUserSocket) {
            console.log(`Sending message to socket: ${sendUserSocket}`);
            socket.to(sendUserSocket).emit("msg-recieve", data.message);
        } else {
            console.log(`User ${data.to} is not online`);
        }
    });
    
    socket.on("disconnect", () => {
        // Remove user from online users map
        for (const [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                console.log(`User disconnected: ${userId}`);
                onlineUsers.delete(userId);
                break;
            }
        }
    });
});

// Start the HTTP server
const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== "test") {
    server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
  }

if (process.env.NODE_ENV === 'production') {
    require('./scheduler');
}

module.exports = { app, server }; // exporting express app for testing