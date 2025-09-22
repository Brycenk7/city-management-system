const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// Store active connections
const activeConnections = new Map(); // userId -> socketId
const gameRooms = new Map(); // roomCode -> Set of socketIds

const initializeSocketHandlers = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User ${socket.user.username} connected (${socket.id})`);
    
    // Store active connection
    activeConnections.set(socket.userId, socket.id);

    // Join game room
    socket.on('join_game', async (data) => {
      try {
        const { roomCode } = data;
        
        if (!roomCode) {
          socket.emit('error', { message: 'Room code is required' });
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Check if user is in this game
        const player = game.players.find(p => p.userId.toString() === socket.userId);
        if (!player) {
          socket.emit('error', { message: 'You are not in this game' });
          return;
        }

        // Leave previous rooms
        socket.rooms.forEach(room => {
          if (room.startsWith('game_')) {
            socket.leave(room);
          }
        });

        // Join game room
        const gameRoom = `game_${roomCode.toUpperCase()}`;
        socket.join(gameRoom);
        socket.currentGame = roomCode.toUpperCase();

        // Track room membership
        if (!gameRooms.has(roomCode.toUpperCase())) {
          gameRooms.set(roomCode.toUpperCase(), new Set());
        }
        gameRooms.get(roomCode.toUpperCase()).add(socket.id);

        // Notify others in the room
        socket.to(gameRoom).emit('player_joined', {
          player: {
            id: player.userId,
            username: player.username,
            color: player.color,
            isReady: player.isReady,
            isHost: player.isHost
          }
        });

        // Send current game state to the joining player
        socket.emit('game_state', {
          game: {
            id: game._id,
            roomCode: game.roomCode,
            name: game.name,
            status: game.gameState.status,
            players: game.players.map(p => ({
              id: p.userId,
              username: p.username,
              color: p.color,
              isReady: p.isReady,
              isHost: p.isHost,
              score: p.score,
              resources: p.resources
            })),
            gameState: game.gameState,
            chat: game.chat.slice(-50) // Last 50 messages
          }
        });

        console.log(`🎮 User ${socket.user.username} joined game ${roomCode}`);

      } catch (error) {
        console.error('Join game error:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Leave game room
    socket.on('leave_game', async (data) => {
      try {
        const { roomCode } = data;
        
        if (socket.currentGame) {
          const gameRoom = `game_${socket.currentGame}`;
          socket.leave(gameRoom);
          
          // Remove from room tracking
          if (gameRooms.has(socket.currentGame)) {
            gameRooms.get(socket.currentGame).delete(socket.id);
            if (gameRooms.get(socket.currentGame).size === 0) {
              gameRooms.delete(socket.currentGame);
            }
          }

          // Notify others
          socket.to(gameRoom).emit('player_left', {
            playerId: socket.userId,
            username: socket.user.username
          });

          socket.currentGame = null;
          console.log(`🚪 User ${socket.user.username} left game ${roomCode}`);
        }

      } catch (error) {
        console.error('Leave game error:', error);
        socket.emit('error', { message: 'Failed to leave game' });
      }
    });

    // Toggle ready status
    socket.on('toggle_ready', async (data) => {
      try {
        const { roomCode } = data;
        
        if (!socket.currentGame || socket.currentGame !== roomCode.toUpperCase()) {
          socket.emit('error', { message: 'Not in this game' });
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player = game.players.find(p => p.userId.toString() === socket.userId);
        if (!player) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        // Toggle ready status
        player.isReady = !player.isReady;
        await game.save();

        // Broadcast to all players in the room
        const gameRoom = `game_${roomCode.toUpperCase()}`;
        io.to(gameRoom).emit('player_ready_toggled', {
          playerId: socket.userId,
          isReady: player.isReady
        });

        console.log(`✅ User ${socket.user.username} ${player.isReady ? 'ready' : 'not ready'}`);

      } catch (error) {
        console.error('Toggle ready error:', error);
        socket.emit('error', { message: 'Failed to toggle ready status' });
      }
    });

    // Start game (host only)
    socket.on('start_game', async (data) => {
      try {
        const { roomCode } = data;
        
        if (!socket.currentGame || socket.currentGame !== roomCode.toUpperCase()) {
          socket.emit('error', { message: 'Not in this game' });
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player = game.players.find(p => p.userId.toString() === socket.userId);
        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only the host can start the game' });
          return;
        }

        if (game.gameState.status !== 'waiting') {
          socket.emit('error', { message: 'Game has already started' });
          return;
        }

        if (!game.allPlayersReady()) {
          socket.emit('error', { message: 'Not all players are ready' });
          return;
        }

        // Start the game
        await game.startGame();

        // Broadcast game started to all players
        const gameRoom = `game_${roomCode.toUpperCase()}`;
        io.to(gameRoom).emit('game_started', {
          gameState: game.gameState,
          players: game.players.map(p => ({
            id: p.userId,
            username: p.username,
            color: p.color,
            resources: p.resources
          }))
        });

        console.log(`🚀 Game ${roomCode} started by ${socket.user.username}`);

      } catch (error) {
        console.error('Start game error:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Game action (place/remove building)
    socket.on('game_action', async (data) => {
      try {
        const { roomCode, action, row, col, attribute, class: cellClass } = data;
        
        if (!socket.currentGame || socket.currentGame !== roomCode.toUpperCase()) {
          socket.emit('error', { message: 'Not in this game' });
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (game.gameState.status !== 'active') {
          socket.emit('error', { message: 'Game is not active' });
          return;
        }

        const player = game.players.find(p => p.userId.toString() === socket.userId);
        if (!player) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        // Validate action
        if (!['place', 'remove'].includes(action)) {
          socket.emit('error', { message: 'Invalid action' });
          return;
        }

        // Update game state
        if (action === 'place') {
          // Add or update cell
          const existingCellIndex = game.gameState.cells.findIndex(
            cell => cell.row === row && cell.col === col
          );
          
          if (existingCellIndex >= 0) {
            game.gameState.cells[existingCellIndex] = {
              row,
              col,
              attribute,
              class: cellClass,
              playerId: player.userId,
              timestamp: new Date()
            };
          } else {
            game.gameState.cells.push({
              row,
              col,
              attribute,
              class: cellClass,
              playerId: player.userId,
              timestamp: new Date()
            });
          }
        } else if (action === 'remove') {
          // Remove cell
          game.gameState.cells = game.gameState.cells.filter(
            cell => !(cell.row === row && cell.col === col)
          );
        }

        // Update player's last action
        player.lastAction = new Date();

        await game.save();

        // Broadcast action to all players in the room
        const gameRoom = `game_${roomCode.toUpperCase()}`;
        io.to(gameRoom).emit('game_action_broadcast', {
          playerId: socket.userId,
          username: player.username,
          action,
          row,
          col,
          attribute,
          class: cellClass,
          timestamp: new Date()
        });

        console.log(`🎯 Action: ${action} ${attribute} at (${row},${col}) by ${socket.user.username}`);

      } catch (error) {
        console.error('Game action error:', error);
        socket.emit('error', { message: 'Failed to perform game action' });
      }
    });

    // Send chat message
    socket.on('chat_message', async (data) => {
      try {
        const { roomCode, message, type = 'chat' } = data;
        
        if (!socket.currentGame || socket.currentGame !== roomCode.toUpperCase()) {
          socket.emit('error', { message: 'Not in this game' });
          return;
        }

        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (message.length > 500) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Add message to game chat
        const chatMessage = {
          userId: socket.userId,
          username: socket.user.username,
          message: message.trim(),
          type,
          timestamp: new Date()
        };

        game.chat.push(chatMessage);
        
        // Keep only last 100 messages
        if (game.chat.length > 100) {
          game.chat = game.chat.slice(-100);
        }

        await game.save();

        // Broadcast message to all players in the room
        const gameRoom = `game_${roomCode.toUpperCase()}`;
        io.to(gameRoom).emit('chat_message_broadcast', chatMessage);

        console.log(`💬 Chat: ${socket.user.username}: ${message}`);

      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`🔌 User ${socket.user.username} disconnected (${socket.id})`);
      
      // Remove from active connections
      activeConnections.delete(socket.userId);

      // Handle game disconnection
      if (socket.currentGame) {
        const gameRoom = `game_${socket.currentGame}`;
        
        // Remove from room tracking
        if (gameRooms.has(socket.currentGame)) {
          gameRooms.get(socket.currentGame).delete(socket.id);
          if (gameRooms.get(socket.currentGame).size === 0) {
            gameRooms.delete(socket.currentGame);
          }
        }

        // Notify others in the game
        socket.to(gameRoom).emit('player_disconnected', {
          playerId: socket.userId,
          username: socket.user.username
        });

        // If game is active, mark player as disconnected
        try {
          const game = await Game.findOne({ roomCode: socket.currentGame });
          if (game && game.gameState.status === 'active') {
            const player = game.players.find(p => p.userId.toString() === socket.userId);
            if (player) {
              // You might want to implement a reconnection system here
              // For now, we'll just notify other players
              console.log(`⚠️ Player ${socket.user.username} disconnected from active game ${socket.currentGame}`);
            }
          }
        } catch (error) {
          console.error('Error handling disconnection:', error);
        }
      }
    });
  });

  // Cleanup inactive games periodically
  setInterval(async () => {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const inactiveGames = await Game.find({
        'gameState.status': 'waiting',
        'updatedAt': { $lt: cutoffTime }
      });

      for (const game of inactiveGames) {
        await Game.findByIdAndDelete(game._id);
        console.log(`🧹 Cleaned up inactive game: ${game.roomCode}`);
      }
    } catch (error) {
      console.error('Error cleaning up games:', error);
    }
  }, 60 * 60 * 1000); // Run every hour
};

module.exports = { initializeSocketHandlers };

