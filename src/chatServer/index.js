// const express = require("express");
// const cors = require("cors");
// const mongoose = require("mongoose");
// const userRoutes = require("./routes/userChatRoutes");
// const messageRoutes = require("./routes/messagesChatRoute");
// const socket = require("socket.io");

// const app = express();
// require("dotenv").config();


// app.use(cors());
// app.use(express.json());

// app.use("/api/auth",userRoutes)
// app.use("/api/messages",messageRoutes)

// mongoose.connect(process.env.MONGO_URL, {    
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => {
//     console.log("DB connected successfully to hosted MongoDB");
// })
// .catch((error) => {
//     console.log("MongoDB connection error:");
//     console.log(error);  
// });

// const server = app.listen(process.env.PORT, () => {
//     console.log(`Server started on port ${process.env.PORT}`);
// });

// const io = socket(server, {
//     cors: {
//         origin: "http://localhost:5173",
//         credentials: true,
//     }
// });

// global.onlineUsers = new Map();

// io.on("connection", (socket) => {
//     global.chatSocket = socket;
    
//     socket.on("add-user", (userId) => {
//         console.log(`User connected: ${userId}`);
//         onlineUsers.set(userId, socket.id);
//     });

//     socket.on("send-msg", (data) => {
//         console.log(`Message from ${data.from} to ${data.to}: ${data.message}`);
        
//         const sendUserSocket = onlineUsers.get(data.to);
//         if (sendUserSocket) {
//             console.log(`Sending message to socket: ${sendUserSocket}`);
//             socket.to(sendUserSocket).emit("msg-recieve", data.message);
//         } else {
//             console.log(`User ${data.to} is not online`);
//         }
//     });
    
//     socket.on("disconnect", () => {
//         // Remove user from online users map
//         for (const [userId, socketId] of onlineUsers.entries()) {
//             if (socketId === socket.id) {
//                 console.log(`User disconnected: ${userId}`);
//                 onlineUsers.delete(userId);
//                 break;
//             }
//         }
//     });
// });