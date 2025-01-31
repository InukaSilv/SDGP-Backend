import React, { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [recommendations, setRecommendations] = useState([]);

  const sendMessage = async () => {
    const res = await fetch("http://localhost:3001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setResponse(data.response);

    const recRes = await fetch("http://localhost:5001/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const recData = await recRes.json();
    setRecommendations(recData.recommendations);
  };

  return (
    <div>
      <h1>Boarding House Chatbot</h1>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
      <h2>Response : </h2>
      <p>{response}</p>
      <h2>Recommended Listings : </h2>
      <ul>{recommendations.map((rec, index) => <li key={index}>{rec}</li>)}</ul>
    </div>
  );
}

export default App;
