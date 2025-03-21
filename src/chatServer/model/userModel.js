const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        require: true,
        min: 3,
        max: 20,
        unique: true,
    },
    email: {
        type: String,
        require: true,
        unique: true,
        max: 50,
    },
    password: {
        type: String,
        require: true,
        min: 8,
    },
    role: {
        type: String,
        enum: ['Student', 'Landlord'],
        required: true
    },
    firstName: String,
    lastName: String,
    phone: String,
    dob: Date,
    
}, {
    timestamps: true
});

module.exports = mongoose.model("Users", userSchema);