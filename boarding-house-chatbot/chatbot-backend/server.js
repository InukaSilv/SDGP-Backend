const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

app.post("/chat",async (req, res) =>{
    try{
        const { message } = req.body;
        const response = await axios.post("http://localhost:5000/chat", { message });
        res.json(response.data);
    }catch (error){
        res.status(500).json({ error: "Chatbot error" });
    }
});

app.listen(3001, () => console.log("Server running on port 3001"));
