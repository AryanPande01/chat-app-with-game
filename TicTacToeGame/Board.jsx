import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Square from "./Square";
import ChatBox from "./ChatBox";

const Board = () => {
  const [socket, setSocket] = useState(null);
  const [state, setState] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [gameStarted, setGameStarted] = useState(false);
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [winner, setWinner] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const myRoleRef = useRef(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3001");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      newSocket.emit("join-game");
    });

    newSocket.on("player-assigned", ({ role, isFirst }) => {
      setMyRole(role);
      myRoleRef.current = role;
      console.log(`Assigned role: ${role}, isFirst: ${isFirst}`);
    });

    newSocket.on("waiting-for-player", () => {
      setWaitingForPlayer(true);
      setGameStarted(false);
      setWinner(null);
    });

    newSocket.on("game-full", () => {
      alert("Game is full. Please try again later.");
    });

    newSocket.on("game-start", (gameState) => {
      console.log("Game start event received:", gameState);
      console.log("Resetting game state completely");
      
      // Reset all game state
      setWinner(null);
      setState(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      setGameStarted(true);
      setWaitingForPlayer(false);
      
      // Update role if available
      if (gameState.playerRoles && gameState.playerRoles[newSocket.id]) {
        const newRole = gameState.playerRoles[newSocket.id];
        setMyRole(newRole);
        myRoleRef.current = newRole;
      }
      
      // Determine turn
      const currentRole = gameState.playerRoles && gameState.playerRoles[newSocket.id] 
        ? gameState.playerRoles[newSocket.id] 
        : myRoleRef.current;
      setIsMyTurn(gameState.currentPlayer === currentRole);
      
      console.log("Game state after reset:", {
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        myRole: currentRole,
        isMyTurn: gameState.currentPlayer === currentRole
      });
    });

    newSocket.on("update-game", (gameState) => {
      setState(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      const currentRole = gameState.playerRoles && gameState.playerRoles[newSocket.id] 
        ? gameState.playerRoles[newSocket.id] 
        : myRoleRef.current;
      setIsMyTurn(gameState.currentPlayer === currentRole);
    });

    newSocket.on("game-over", ({ winner, board }) => {
      console.log("Game over event received:", { winner, board });
      setState(board);
      setWinner(winner);
      setGameStarted(false);
      setIsMyTurn(false);
    });

    return () => {
      newSocket.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (index) => {
    if (!gameStarted || state[index] || winner || !isMyTurn) {
      return;
    }
    socket.emit("make-move", index);
  };

  const handleReset = () => {
    console.log("Reset button clicked");
    console.log("Current state before reset:", { gameStarted, winner, myRole, isMyTurn, state });
    
    if (socket) {
      console.log("Emitting reset-game event");
      // Clear winner state immediately for better UX
      setWinner(null);
      socket.emit("reset-game");
    } else {
      console.error("Socket is not available for reset");
    }
  };

  if (waitingForPlayer) {
    return (
      <div className="game-container">
        <div className="board-container">
          <h3>Waiting for another player to join...</h3>
          {myRole && <p>You will be playing as: {myRole}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="board-container">
        {winner ? (
          <>
            <h3>
              {winner === 'draw' ? "It's a draw!" : `${winner} won the game!`}
            </h3>
            <button 
              onClick={handleReset}
              style={{
                padding: '12px 24px',
                fontSize: '18px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                margin: '15px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Play Again
            </button>
            <div style={{ margin: '10px', fontSize: '14px', color: '#666' }}>
              <p>Debug Info:</p>
              <p>Winner: {winner}</p>
              <p>Game Started: {gameStarted.toString()}</p>
              <p>My Role: {myRole}</p>
              <p>Board: {JSON.stringify(state)}</p>
            </div>
          </>
        ) : (
          <>
            <h3>
              {gameStarted 
                ? `Current Player: ${currentPlayer}${isMyTurn ? ' (Your turn)' : ' (Opponent\'s turn)'}`
                : 'Game starting...'
              }
            </h3>
            {myRole && <p>You are playing as: {myRole}</p>}
            <div className="board-row">
              <Square onClick={() => handleClick(0)} value={state[0]} />
              <Square onClick={() => handleClick(1)} value={state[1]} />
              <Square onClick={() => handleClick(2)} value={state[2]} />
            </div>
            <div className="board-row">
              <Square onClick={() => handleClick(3)} value={state[3]} />
              <Square onClick={() => handleClick(4)} value={state[4]} />
              <Square onClick={() => handleClick(5)} value={state[5]} />
            </div>
            <div className="board-row">
              <Square onClick={() => handleClick(6)} value={state[6]} />
              <Square onClick={() => handleClick(7)} value={state[7]} />
              <Square onClick={() => handleClick(8)} value={state[8]} />
            </div>
          </>
        )}
      </div>
      
      {(gameStarted || winner) && myRole && (
        <ChatBox socket={socket} myRole={myRole} />
      )}
    </div>
  );
};

export default Board;
