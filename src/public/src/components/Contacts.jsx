import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assests/logo.png";

export default function Contacts({ contacts, currentUser, changeChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  useEffect(() => {
    if (currentUser) {
      // Use firstName and lastName if available, otherwise fall back to username
      if (currentUser.firstName && currentUser.lastName) {
        setCurrentUserName(`${currentUser.firstName} ${currentUser.lastName}`);
      } else {
        setCurrentUserName(currentUser.username || currentUser.currentUserName);
      }
    }
  }, [currentUser]);

  const handleChangeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <>
      {currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h2>RiVVe Chat</h2>
          </div>
          <div className="contacts">
            {contacts.map((contact, index) => (
              <div
                className={`contact ${index === currentSelected ? "selected" : ""}`}
                key={index}
                onClick={() => handleChangeCurrentChat(index, contact)}
              >
                <div className="username">
                  <h3>
                    {contact.firstName && contact.lastName
                      ? `${contact.firstName} ${contact.lastName}`
                      : contact.username}
                  </h3>
                  <p className="role">{contact.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="current-user">
            <div className="username">
              <h2>{currentUserName}</h2>
              {currentUser && <p className="role">{currentUser.role}</p>}
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: #080420;
  
  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    img {
      height: 2rem;
    }
    h2 {
      color: white;
      text-transform: uppercase;
    }
  }
  
  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    padding: 0.5rem;
    
    &::-webkit-scrollbar {
      width: 0.2rem;
      
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
        }
    }
    
    .contact {
      background-color: #ffffff39;
      min-height: 5rem;
      width: 90%;
      cursor: pointer;
      border-radius: 0.2rem;
      padding: 0.4rem;
      gap: 1rem;
      align-items: center;
      display: flex;
      transition: 0.5s ease-in-out;
      .username {
        h3 {
          color: white;
          padding-left: 15px;

        }
      }
    @media screen and (min-width:720px) and (max-width:1080px) {
      gap: 0.5rem;
      .username {
      h2 {
        font-size: 1rem;
        }
      }
    }
    }
    .selected {
      background-color: #9186f3;
    }
  }
  
  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    .username {
      h2 {
        color: white;
      }
    }
  }
`;