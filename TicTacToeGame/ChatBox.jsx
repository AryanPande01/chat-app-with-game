import React, { useState, useEffect, useRef } from 'react';
import './ChatBox.css';

const ChatBox = ({ socket, myRole }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    socket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for game start to load existing messages
    socket.on('game-start', (gameState) => {
      if (gameState.chatMessages) {
        setMessages(gameState.chatMessages);
      } else {
        setMessages([]); // Clear messages if no chatMessages in gameState
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('game-start');
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('send-message', newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSendMessage(e);
    }
  };

  return (
    <div className="chat-box">
      <div className="chat-header">
        <h3>Game Chat</h3>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.player === myRole ? 'my-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="player-name">{message.player}</span>
                <span className="timestamp">{message.timestamp}</span>
              </div>
              <div className="message-text">{message.text}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="message-input"
          disabled={!myRole}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!newMessage.trim() || !myRole}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox; 