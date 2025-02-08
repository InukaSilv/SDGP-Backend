const express = require("express");
const mysql = require("mysql2");
const axios = require("axios");
const cors = require("cors");
const socketIo = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(cors());

//MySQL setup
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Hasindu@123",
    database: "chatbot_db",
});

db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err.stack);
      return;
    }
    console.log("Connected to MySQL database");
});

//Websockets for real-time chats
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("sendMessage", async (data) => {
        const { userId, message } = data;
        const botResponse = await axios.post("http://localhost:5000/chat", { message });

        //Store chats
        const query = "INSERT INTO chat_history (user_id, user_message, bot_response) VALUES (?, ?, ?)";
        db.query(query, [userId, message, botResponse.data.response], (err, results) => {
            if(err) {
                console.error("Error saving chats", err);
            } else {
                console.log("Chat saved", results);
            }
        });

        //Emit responses to frontend
        socket.emit("recieveMessage", { sender: "bot", message: botResponse.data.response });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

//Start the server
server.listen(3000, () => {
    console.log("Starting the server in port 3000");
});


