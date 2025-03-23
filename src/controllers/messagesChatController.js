const messageModel = require("../models/messageChatModel");

module.exports.addMessage = async (req, res, next) => {
    try {
        const { from, to, message } = req.body;
        
        // Validate inputs
        if (!from || !to || !message) {
            return res.json({ 
                msg: "Missing required fields (from, to, or message)", 
                status: false 
            });
        }
        
        // Create message in database
        const data = await messageModel.create({
            message: { text: message },
            users: [from, to],
            sender: from,
        });
        
        if (data) {
            return res.json({ 
                msg: "Message added successfully.",
                status: true
            });
        }
        
        return res.json({ 
            msg: "Failed to add message to the database",
            status: false
        });
    } catch (ex) {
        console.error("Add message error:", ex);
        next(ex);
    }
};

module.exports.getAllMessage = async (req, res, next) => {
    try {
        const { from, to } = req.body;
        
        // Validate inputs
        if (!from || !to) {
            return res.json({ 
                msg: "Missing required fields (from or to)", 
                status: false 
            });
        }
        
        // Find messages between these two users
        const messages = await messageModel.find({
            users: {
                $all: [from, to],
            },
        }).sort({ createdAt: 1 });
        
        // Format messages to indicate which are from the current user
        const formattedMessages = messages.map((msg) => {
            return {
                fromSelf: msg.sender.toString() === from,
                message: msg.message.text,
                timestamp: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        });
        
        res.json(formattedMessages);
    } catch (ex) {
        console.error("Get messages error:", ex);
        next(ex);
    }
};