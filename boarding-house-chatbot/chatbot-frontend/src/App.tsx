import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Define types
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatResponse {
  response: string;
  saved: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState<string>(() => localStorage.getItem('userId') || uuidv4());
  const [conversationId] = useState<string>(() => 
    localStorage.getItem('conversationId') || uuidv4()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save userId and conversationId to localStorage
  useEffect(() => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('conversationId', conversationId);
  }, [userId, conversationId]);

  // Scroll to bottom of chat
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history when component mounts
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/chat-history/${conversationId}`);
        
        if (response.data && Array.isArray(response.data)) {
          const formattedMessages = response.data.map((item: any) => [
            {
              id: `user-${item.id}`,
              text: item.user_message,
              sender: 'user' as const,
              timestamp: new Date(item.timestamp)
            },
            {
              id: `bot-${item.id}`,
              text: item.bot_response,
              sender: 'bot' as const,
              timestamp: new Date(item.timestamp)
            }
          ]).flat();
          
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    fetchChatHistory();
  }, [conversationId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await axios.post<ChatResponse>(
        `${process.env.REACT_APP_API_URL}/api/chat`, 
        {
          user_id: userId,
          message: inputMessage,
          conversation_id: conversationId
        }
      );
      
      const botMessage: Message = {
        id: uuidv4(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: uuidv4(),
        text: 'Sorry, there was an error processing your message. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    const newConversationId = uuidv4();
    localStorage.setItem('conversationId', newConversationId);
    window.location.reload();
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>Boarding House Assistant</h1>
        <button onClick={startNewConversation} className="new-chat-btn">
          New Conversation
        </button>
      </header>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>Welcome to the Boarding House Assistant!</h2>
            <p>How can I help you today?</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div className="message-content">
                <p>{message.text}</p>
                <span className="timestamp">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="message bot-message">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message here..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !inputMessage.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;