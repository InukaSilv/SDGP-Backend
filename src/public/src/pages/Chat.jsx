import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import Contacts from "../components/Contacts";
import ChatContainer from "../components/ChatContainer";
import { allUsersRoute, host } from "../utils/APIRoutes";
import { io } from "socket.io-client";

function Chat() {
  const socket = useRef();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!localStorage.getItem("chat-app-user")){
        navigate("/login");
      } else {
        setCurrentUser(await JSON.parse(localStorage.getItem("chat-app-user")));
        setIsLoaded(true);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if(currentUser) {
      socket.current = io(host);
      socket.current.emit("add-user", currentUser._id);
    }
  },[currentUser])
  
  useEffect(() => {
    const fetchContacts = async () => {
      if(currentUser && currentUser._id) {
        try {
          const response = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(response.data);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        }
      }
    };
    
    if (isLoaded) {
      fetchContacts();
    }
  }, [currentUser, isLoaded]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  return (
    <Container>
      <div className="container">
        <Contacts 
          contacts={contacts} 
          currentUser={currentUser} 
          changeChat={handleChatChange}
        />
      
        <div className="chat-container">
          {currentChat ? (
            <ChatContainer 
              currentChat={currentChat} 
              currentUser={currentUser} 
              socket={socket}
            />
          ) : (
            <div className="welcome">
              <h1>Welcome to RiVVe Chat!</h1>
              <h3>Select a chat to start messaging</h3>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (min-width:720px) and (max-width:1080px) {
      grid-template-columns: 35% 65%;
    }
    @media screen and (min-width:360px) and (max-width:480px) {
      grid-template-columns: 35% 65%;
    }
  }
  .chat-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    height: 100%;
    width: 100%;
    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }
`;

export default Chat;