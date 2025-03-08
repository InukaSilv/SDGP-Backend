import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { BsEmojiSmileFill } from "react-icons/bs";
import Picker from "emoji-picker-react";
import axios from "axios";
import { sendMessageRoute, getAllMessagesRoute } from "../utils/APIRoutes";




export default function ChatContainer({ currentChat, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    
    setMessages([]);
    
  }, [currentChat]);


  useEffect(() => {
    const fetchMessages = async () => {
      if (currentChat && currentUser) {
        try {
          const response = await axios.post(getAllMessagesRoute, {
            from: currentUser._id,
            to: currentChat._id,
          });
          
          setMessages(response.data);
        } catch (error) {
          console.error("Error fetching messages:", error);
        }
      }
    };
    
    fetchMessages();
  }, [currentChat, currentUser]);


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (inputMessage.trim().length > 0) {
      try {
        // Send to server
        await axios.post(sendMessageRoute, {
          from: currentUser._id,
          to: currentChat._id,
          message: inputMessage,
        });
        
        // Update local state with new message
        const newMessage = {
          fromSelf: true,
          message: inputMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages([...messages, newMessage]);
        
        // Clear input field
        setInputMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleEmojiClick = (event, emojiObject) => {
    // Handle different versions of emoji-picker-react
    let emoji;
    if (emojiObject && emojiObject.emoji) {
      // Newer versions
      emoji = emojiObject.emoji;
    } else if (event && event.emoji) {
      // Alternative structure
      emoji = event.emoji;
    } else if (emojiObject && emojiObject.srcElement) {
      // Older versions
      emoji = emojiObject.srcElement.innerText || emojiObject.srcElement.textContent;
    } else {
      // Fallback if no emoji structure is recognized
      console.error("Unrecognized emoji structure:", event, emojiObject);
      return;
    }
    
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = inputMessage.slice(0, cursorPosition);
    const textAfterCursor = inputMessage.slice(cursorPosition);
    
    setInputMessage(textBeforeCursor + emoji + textAfterCursor);
    
    // This helps to focus back on the input after selecting an emoji
    setTimeout(() => {
      inputRef.current.focus();
      // Place cursor after the inserted emoji
      const newCursorPosition = cursorPosition + emoji.length;
      inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 10);
  };

  // Function to handle sending emoji directly as a message
  const handleSendEmoji = (event, emojiObject) => {
    let emoji;
    
    // Extract emoji using the same logic as handleEmojiClick
    if (emojiObject && emojiObject.emoji) {
      emoji = emojiObject.emoji;
    } else if (event && event.emoji) {
      emoji = event.emoji;
    } else if (emojiObject && emojiObject.srcElement) {
      emoji = emojiObject.srcElement.innerText || emojiObject.srcElement.textContent;
    } else {
      console.error("Unrecognized emoji structure:", event, emojiObject);
      return;
    }
    
    // If input field is empty, send emoji as a standalone message
    if (inputMessage.trim().length === 0) {
      const newMessage = {
        fromSelf: true,
        message: emoji,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages([...messages, newMessage]);
      // In a real app, you would send the message to your backend here
    } else {
      // Otherwise, add emoji to input and don't send yet
      handleEmojiClick(event, emojiObject);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && !e.target.closest('.emoji-area')) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Double-click option to send emoji directly
  const handleEmojiDoubleClick = (event, emojiObject) => {
    handleSendEmoji(event, emojiObject);
    setShowEmojiPicker(false); // Close picker after sending
  };

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            {currentChat?.avatarImage ? (
              <img src={currentChat.avatarImage} alt="avatar" />
            ) : (
              <div className="avatar-placeholder">
                {currentChat?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="username">
            <h3>{currentChat?.username}</h3>
            <div className="status">online</div>
          </div>
        </div>
        <div className="chat-options">
          <span className="dots">&#8942;</span>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.fromSelf ? "sent" : "received"}`}
            ref={index === messages.length - 1 ? scrollRef : null}
          >
            <div className="content">
              <p>{message.message}</p>
              <span className="timestamp">{message.timestamp}</span>
            </div>
          </div>
        ))}
      </div>
      
      <form className="chat-input" onSubmit={handleSendMessage}>
        <div className="emoji-area">
          <div className="emoji-button">
            <BsEmojiSmileFill onClick={toggleEmojiPicker} />
          </div>
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <Picker 
                onEmojiClick={handleEmojiClick}
                onEmojiDoubleClick={handleEmojiDoubleClick}
                searchDisabled={true}
                skinTonesDisabled={true}
                width={280}
                height={350}
              />
              
            </div>
          )}
        </div>
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Type a message here..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button type="submit" className="send-button">
          <span className="send-icon">&#10148;</span>
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  height: 100%;
  
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    background-color: #080420;
    
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      .avatar {
        img {
          height: 3rem;
          border-radius: 50%;
        }
        
        .avatar-placeholder {
          height: 3rem;
          width: 3rem;
          border-radius: 50%;
          background-color: #4e0eff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }
      }
      
      .username {
        h3 {
          color: white;
          margin-bottom: 0.2rem;
        }
        
        .status {
          color: #4cc23d;
          font-size: 0.8rem;
        }
      }
    }
    
    .chat-options {
      color: white;
      cursor: pointer;
      
      .dots {
        font-size: 1.5rem;
        font-weight: bold;
        vertical-align: middle;
      }
    }
  }
  
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    
    .message {
      display: flex;
      align-items: flex-end;
      
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        border-radius: 1rem;
        position: relative;
        
        p {
          margin-bottom: 0.5rem;
          word-break: break-word;
          line-height: 1.4;
        }
        
        .timestamp {
          position: absolute;
          bottom: 0.3rem;
          right: 0.8rem;
          font-size: 0.6rem;
          opacity: 0.7;
        }
      }
    }
    
    .sent {
      justify-content: flex-end;
      
      .content {
        background-color: #4f04ff21;
        color: white;
        border-top-right-radius: 0;
      }
    }
    
    .received {
      justify-content: flex-start;
      
      .content {
        background-color: #9900ff20;
        color: white;
        border-top-left-radius: 0;
      }
    }
  }
  
  .chat-input {
    display: grid;
    grid-template-columns: 5% 85% 10%;
    align-items: center;
    background-color: #080420;
    padding: 0 2rem;
    position: relative;
    
    .emoji-area {
      position: relative;
      
      .emoji-button {
        display: flex;
        align-items: center;
        color: #ffff00c8;
        font-size: 1.5rem;
        cursor: pointer;
      }
      
      .emoji-picker-container {
        position: absolute;
        bottom: 4rem;
        left: 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        
        .emoji-picker-instructions {
          display: flex;
          flex-direction: column;
          font-size: 0.7rem;
          padding: 0.3rem;
          background-color: #080420;
          color: #9a86f3;
          border-bottom-left-radius: 5px;
          border-bottom-right-radius: 5px;
          border: 1px solid #9a86f3;
          border-top: none;
        }
        
        /* Custom styling for the emoji picker */
        .EmojiPickerReact, .emoji-picker-react {
          background-color: #080420;
          box-shadow: 0 5px 10px #9a86f3;
          border-color: #9a86f3;
          max-width: 280px;
          height: 350px;
          
          .emoji-scroll-wrapper::-webkit-scrollbar,
          .emoji-categories::-webkit-scrollbar,
          .epr-body::-webkit-scrollbar {
            background-color: #080420;
            width: 5px;
            &-thumb {
              background-color: #9a86f3;
            }
          }
          
          .emoji-categories button {
            filter: contrast(0);
          }
          
          .epr-search {
            background-color: transparent;
            border-color: #9a86f3;
          }
          
          .epr-emoji-category-label {
            background-color: #080420;
          }
          
          .epr-emoji-category-content .epr-emoji-category-content button {
            filter: grayscale(0);
          }
          
          .epr-preview {
            display: none;
          }
        }
      }
    }
    
    input {
      width: 100%;
      height: 60%;
      background-color: #ffffff34;
      color: white;
      border: none;
      padding-left: 1rem;
      font-size: 1.2rem;
      border-radius: 2rem;
      
      &::selection {
        background-color: #9a86f3;
      }
      
      &:focus {
        outline: none;
      }
    }
    
    .send-button {
      height: 60%;
      background-color: #9a86f3;
      border: none;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      margin-left: 0.5rem;
      
      .send-icon {
        font-size: 1.3rem;
        transform: rotate(90deg);
      }
    }
  }
`;