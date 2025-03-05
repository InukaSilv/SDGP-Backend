require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const admin = require('./config/firebaseAdmin'); // Ensure Firebase is initialized
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

// Authentication Routes
app.use('/api/auth', authRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
