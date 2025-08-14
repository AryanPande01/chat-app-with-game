const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Serve static files from the React build
app.use(express.static(path.resolve(__dirname, 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
});

// Game state
let gameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  players: [],
  playerRoles: {}, // Map socket.id to player role (X or O)
  gameStarted: false,
  chatMessages: [] // Store chat messages
};

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join game
  socket.on('join-game', () => {
    if (gameState.players.length < 2) {
      gameState.players.push(socket.id);
      
      // Assign player role
      if (gameState.players.length === 1) {
        gameState.playerRoles[socket.id] = 'X';
        socket.emit('player-assigned', { role: 'X', isFirst: true });
      } else {
        gameState.playerRoles[socket.id] = 'O';
        socket.emit('player-assigned', { role: 'O', isFirst: false });
      }
      
      socket.join('game-room');
      
      if (gameState.players.length === 2) {
        gameState.gameStarted = true;
        io.to('game-room').emit('game-start', {
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          playerRoles: gameState.playerRoles,
          chatMessages: gameState.chatMessages
        });
      } else {
        socket.emit('waiting-for-player');
      }
    } else {
      socket.emit('game-full');
    }
  });

  // Handle move
  socket.on('make-move', (index) => {
    const playerRole = gameState.playerRoles[socket.id];
    
    if (gameState.gameStarted && 
        gameState.board[index] === null && 
        gameState.currentPlayer === playerRole) {
      
      gameState.board[index] = playerRole;
      
      // Check for winner
      const winner = checkWinner(gameState.board);
      if (winner) {
        io.to('game-room').emit('game-over', { winner, board: gameState.board });
        resetGame();
      } else if (gameState.board.every(cell => cell !== null)) {
        io.to('game-room').emit('game-over', { winner: 'draw', board: gameState.board });
        resetGame();
      } else {
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
        io.to('game-room').emit('update-game', {
          board: gameState.board,
          currentPlayer: gameState.currentPlayer,
          playerRoles: gameState.playerRoles
        });
      }
    }
  });

  // Handle chat messages
  socket.on('send-message', (message) => {
    const playerRole = gameState.playerRoles[socket.id];
    if (playerRole) {
      const chatMessage = {
        id: Date.now(),
        text: message,
        player: playerRole,
        timestamp: new Date().toLocaleTimeString()
      };
      gameState.chatMessages.push(chatMessage);
      io.to('game-room').emit('new-message', chatMessage);
    }
  });

  // Reset game
  socket.on('reset-game', () => {
    console.log('Reset game requested by:', socket.id);
    resetGame();
    console.log('Game reset, emitting game-start with:', {
      board: gameState.board,
      currentPlayer: gameState.currentPlayer,
      playerRoles: gameState.playerRoles,
      chatMessages: gameState.chatMessages
    });
    
    // Ensure game is started after reset
    gameState.gameStarted = true;
    
    io.to('game-room').emit('game-start', {
      board: gameState.board,
      currentPlayer: gameState.currentPlayer,
      playerRoles: gameState.playerRoles,
      chatMessages: gameState.chatMessages
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const playerIndex = gameState.players.indexOf(socket.id);
    if (playerIndex > -1) {
      gameState.players.splice(playerIndex, 1);
      delete gameState.playerRoles[socket.id];
      if (gameState.players.length < 2) {
        gameState.gameStarted = false;
        resetGame();
      }
    }
  });
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function resetGame() {
  gameState.board = Array(9).fill(null);
  gameState.currentPlayer = 'X';
  gameState.chatMessages = []; // Clear chat messages on reset
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
