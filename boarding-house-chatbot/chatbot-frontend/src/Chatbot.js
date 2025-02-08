import React, { useState, useEffect} from "react";
import { io } from "socket.io-client";

//Connecting backend Websocket server
const socket = io("http://localhost:3000");

const Chatbot = () => {
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        socket.on("recieveMessage", (data) => {
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: data.sender, messages: data.message },
            ]);
        });

        return () => {
            socket.off("recieveMessage");
        };
    }, []);

    const sendMessage = () => {
        if (message.trim()) {
          setMessages((prevMessages) => [
            ...prevMessages,
            { sender: "user", message: message },
          ]);
          socket.emit("sendMessage", { userId: 1, message: message }); // Sending user ID and message to backend
          setMessage(""); // Clear input field
        }
      };
    
      return (
        <div className="chat-container">
          <div className="chat-window">
            <div className="messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${msg.sender === "user" ? "user-message" : "bot-message"}`}
                >
                  <p>{msg.message}</p>
                </div>
              ))}
            </div>
          </div>
    
          <div className="input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      );
    };
    
    export default Chatbot;