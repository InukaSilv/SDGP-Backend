require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const LstRoutes = require('./routes/LstRoutes');
const adminAuthRoute = require("./routes/adminAuth");
const admin = require('./config/firebaseAdmin'); 
const cors = require('cors');
const http = require("http");
const {initializeSocket} = require("./controllers/listingcontroller")


const app = express();
const server = http.createServer(app);
// Middleware
app.use(cors());
app.use(express.json());

initializeSocket(server); // Initialize Socket.io


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Health check endpoint
app.get("/api/health-check", (req, res) => {
    res.status(200).json({ message: "Server is healthy" });
  });

// Authentication Routes
app.use('/api/auth', authRoutes);
app.use('/api/listing',LstRoutes )
app.use("/api/admin", adminAuthRoute);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
});

// Start the HTTP server (not app.listen())
const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

if (process.env.NODE_ENV === 'production') {
    require('./scheduler');
}

module.exports = { app, server }; // exporting express app for testing