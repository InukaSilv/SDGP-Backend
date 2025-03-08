import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import Contacts from "../components/Contacts";
import { allUsersRoute } from "../utils/APIRoutes";

function Chat() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [currentChat, setCurrentChat] = useState(undefined);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!localStorage.getItem("chat-app-user")){
        navigate("/login");
      } else {
        setCurrentUser(await JSON.parse(localStorage.getItem("chat-app-user")))
      }
    };
    fetchData();
  }, [navigate]);
  
  useEffect(() => {
    const fetchContacts = async () => {
      if(currentUser) {
        
        try {
          const response = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(response.data);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        }
      }
    };
    
    fetchContacts();
  }, [currentUser]);

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
            <div>Chat with {currentChat.username}</div>
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
    justify-content: center;
    align-items: center;
    color: white;
    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
`;

export default Chat;