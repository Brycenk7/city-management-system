# WebSocket Setup Guide for Multiplayer City Builder Pro

## 🚀 Overview

This guide shows you how to set up WebSocket connections for real-time multiplayer communication in your City Builder Pro game.

## 📋 Prerequisites

1. **Backend Server**: Node.js/Express server with Socket.io (already created)
2. **Frontend**: Your existing City Builder Pro game
3. **Dependencies**: Socket.io client library

## 🔧 Step 1: Add Socket.io Client to Your Frontend

### **Option A: CDN (Quick Setup)**
Add this to your `index.html` before your other scripts:

```html
<!-- Add before your existing scripts -->
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
```

### **Option B: NPM (Recommended for Production)**
```bash
npm install socket.io-client
```

Then import in your JavaScript:
```javascript
import { io } from 'socket.io-client';
```

## 🔌 Step 2: Basic WebSocket Connection Setup

Create a new file `websocket-manager.js`:

```javascript
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // 5 seconds
        this.heartbeatInterval = null;
        this.pendingMessages = new Map();
        
        // Event callbacks
        this.eventCallbacks = {
            onConnect: [],
            onDisconnect: [],
            onError: [],
            onGameStateChange: [],
            onPlayerAction: [],
            onChatMessage: []
        };
    }

    /**
     * Connect to the WebSocket server
     */
    connect(serverUrl = 'http://localhost:5000', options = {}) {
        try {
            console.log('Connecting to WebSocket server...');
            
            // Get authentication token
            const token = localStorage.getItem('authToken');
            
            // Default connection options
            const defaultOptions = {
                auth: {
                    token: token
                },
                transports: ['websocket'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 20000,
                forceNew: true
            };

            // Merge with provided options
            const connectionOptions = { ...defaultOptions, ...options };

            // Create socket connection
            this.socket = io(serverUrl, connectionOptions);

            // Set up event listeners
            this.setupEventListeners();

            return true;
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.emit('error', { type: 'connection_failed', error: error.message });
            return false;
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            console.log('Disconnecting from WebSocket server...');
            
            // Clear heartbeat
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            // Disconnect socket
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            
            this.emit('disconnect', { reason: 'manual' });
        }
    }

    /**
     * Set up all WebSocket event listeners
     */
    setupEventListeners() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to WebSocket server');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.emit('connect', { socketId: this.socket.id });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from WebSocket server:', reason);
            this.isConnected = false;
            this.stopHeartbeat();
            this.emit('disconnect', { reason: reason });
            
            // Attempt reconnection if not manual disconnect
            if (reason !== 'io client disconnect') {
                this.attemptReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.emit('error', { type: 'connection_error', error: error.message });
        });

        // Game events
        this.socket.on('game_state', (data) => {
            console.log('📊 Game state received:', data);
            this.emit('gameStateChange', data);
        });

        this.socket.on('game_action_broadcast', (data) => {
            console.log('🎯 Action broadcast received:', data);
            this.emit('playerAction', data);
        });

        this.socket.on('player_joined', (data) => {
            console.log('👤 Player joined:', data);
            this.emit('playerJoined', data);
        });

        this.socket.on('player_left', (data) => {
            console.log('👋 Player left:', data);
            this.emit('playerLeft', data);
        });

        this.socket.on('game_started', (data) => {
            console.log('🚀 Game started:', data);
            this.emit('gameStarted', data);
        });

        this.socket.on('game_ended', (data) => {
            console.log('🏁 Game ended:', data);
            this.emit('gameEnded', data);
        });

        // Chat events
        this.socket.on('chat_message_broadcast', (data) => {
            console.log('💬 Chat message received:', data);
            this.emit('chatMessage', data);
        });

        // System events
        this.socket.on('pong', (data) => {
            console.log('🏓 Pong received, latency:', data.latency, 'ms');
            this.emit('pong', data);
        });

        this.socket.on('error', (data) => {
            console.error('❌ Server error:', data);
            this.emit('error', { type: 'server_error', ...data });
        });
    }

    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.ping();
            }
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Send ping to server
     */
    ping() {
        if (this.socket && this.isConnected) {
            this.socket.emit('ping', { timestamp: Date.now() });
        }
    }

    /**
     * Attempt to reconnect to server
     */
    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('error', { 
                type: 'max_reconnect_attempts', 
                message: 'Unable to reconnect to server' 
            });
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

        setTimeout(() => {
            this.connect();
        }, this.reconnectInterval);
    }

    // ==================== GAME ACTIONS ====================

    /**
     * Join a game room
     */
    joinGame(roomCode, password = null) {
        if (!this.isConnected) {
            console.error('Not connected to server');
            return false;
        }

        console.log(`🎮 Joining game: ${roomCode}`);
        this.socket.emit('join_game', { roomCode, password });
        return true;
    }

    /**
     * Leave current game
     */
    leaveGame() {
        if (!this.isConnected) return false;

        console.log('🚪 Leaving game...');
        this.socket.emit('leave_game', {});
        return true;
    }

    /**
     * Toggle ready status
     */
    toggleReady(isReady) {
        if (!this.isConnected) return false;

        console.log(`✅ Setting ready status: ${isReady}`);
        this.socket.emit('toggle_ready', { isReady });
        return true;
    }

    /**
     * Start game (host only)
     */
    startGame() {
        if (!this.isConnected) return false;

        console.log('🚀 Starting game...');
        this.socket.emit('start_game', {});
        return true;
    }

    /**
     * Send game action
     */
    sendGameAction(action, row, col, attribute, classType) {
        if (!this.isConnected) return false;

        const actionData = {
            action,
            row,
            col,
            attribute,
            class: classType
        };

        console.log('🎯 Sending game action:', actionData);
        this.socket.emit('game_action', actionData);
        return true;
    }

    /**
     * Send chat message
     */
    sendChatMessage(message, type = 'chat') {
        if (!this.isConnected) return false;

        console.log('💬 Sending chat message:', message);
        this.socket.emit('chat_message', { message, type });
        return true;
    }

    // ==================== EVENT SYSTEM ====================

    /**
     * Register event callback
     */
    on(event, callback) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].push(callback);
        }
    }

    /**
     * Remove event callback
     */
    off(event, callback) {
        if (this.eventCallbacks[event]) {
            const index = this.eventCallbacks[event].indexOf(callback);
            if (index > -1) {
                this.eventCallbacks[event].splice(index, 1);
            }
        }
    }

    /**
     * Emit event to callbacks
     */
    emit(event, data) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket?.id || null,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Send custom message
     */
    sendMessage(event, data) {
        if (!this.isConnected) return false;

        this.socket.emit(event, data);
        return true;
    }

    /**
     * Wait for specific event
     */
    waitForEvent(event, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(event, callback);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout);

            const callback = (data) => {
                clearTimeout(timeoutId);
                this.off(event, callback);
                resolve(data);
            };

            this.on(event, callback);
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketManager;
} else {
    window.WebSocketManager = WebSocketManager;
}
```

## 🎮 Step 3: Integrate with Your Existing Game

Modify your existing `script.js` to include WebSocket functionality:

```javascript
// Add this to your existing MapSystem class or create a new MultiplayerManager
class MultiplayerManager {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.websocket = new WebSocketManager();
        this.currentGame = null;
        this.currentPlayer = null;
        
        this.setupWebSocketEvents();
    }

    /**
     * Initialize multiplayer connection
     */
    async initializeMultiplayer(serverUrl = 'http://localhost:5000') {
        try {
            // Connect to WebSocket server
            const connected = this.websocket.connect(serverUrl);
            if (!connected) {
                throw new Error('Failed to connect to server');
            }

            // Wait for connection
            await this.websocket.waitForEvent('connect', 10000);
            
            console.log('✅ Multiplayer initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize multiplayer:', error);
            this.showError('Failed to connect to multiplayer server');
            return false;
        }
    }

    /**
     * Set up WebSocket event handlers
     */
    setupWebSocketEvents() {
        // Connection events
        this.websocket.on('connect', (data) => {
            console.log('Connected to server:', data.socketId);
            this.updateConnectionStatus('Connected');
        });

        this.websocket.on('disconnect', (data) => {
            console.log('Disconnected from server:', data.reason);
            this.updateConnectionStatus('Disconnected');
        });

        this.websocket.on('error', (data) => {
            console.error('WebSocket error:', data);
            this.showError(`Connection error: ${data.message || data.error}`);
        });

        // Game events
        this.websocket.on('gameStateChange', (data) => {
            this.handleGameStateUpdate(data);
        });

        this.websocket.on('playerAction', (data) => {
            this.handlePlayerAction(data);
        });

        this.websocket.on('playerJoined', (data) => {
            this.handlePlayerJoined(data);
        });

        this.websocket.on('playerLeft', (data) => {
            this.handlePlayerLeft(data);
        });

        this.websocket.on('gameStarted', (data) => {
            this.handleGameStarted(data);
        });

        this.websocket.on('gameEnded', (data) => {
            this.handleGameEnded(data);
        });

        this.websocket.on('chatMessage', (data) => {
            this.handleChatMessage(data);
        });
    }

    /**
     * Join a game
     */
    async joinGame(roomCode, password = null) {
        try {
            const success = this.websocket.joinGame(roomCode, password);
            if (!success) {
                throw new Error('Failed to send join request');
            }

            // Wait for game state
            const gameData = await this.websocket.waitForEvent('gameStateChange', 10000);
            this.currentGame = gameData.game;
            
            console.log('✅ Joined game successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to join game:', error);
            this.showError('Failed to join game');
            return false;
        }
    }

    /**
     * Create a new game
     */
    async createGame(gameData) {
        try {
            // First create game via REST API
            const response = await fetch('/api/game/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                },
                body: JSON.stringify(gameData)
            });

            if (!response.ok) {
                throw new Error('Failed to create game');
            }

            const result = await response.json();
            this.currentGame = result.game;

            // Join the game via WebSocket
            const success = this.websocket.joinGame(result.game.roomCode);
            if (!success) {
                throw new Error('Failed to join created game');
            }

            console.log('✅ Game created successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to create game:', error);
            this.showError('Failed to create game');
            return false;
        }
    }

    /**
     * Send game action
     */
    sendGameAction(action, row, col, attribute, classType) {
        if (!this.currentGame) {
            console.error('Not in a game');
            return false;
        }

        return this.websocket.sendGameAction(action, row, col, attribute, classType);
    }

    /**
     * Send chat message
     */
    sendChatMessage(message, type = 'chat') {
        return this.websocket.sendChatMessage(message, type);
    }

    // ==================== EVENT HANDLERS ====================

    handleGameStateUpdate(data) {
        console.log('Game state updated:', data);
        
        // Update your map system with new game state
        if (data.game && data.game.gameState) {
            this.mapSystem.updateGameState(data.game.gameState);
        }
        
        // Update UI
        this.updateGameUI(data);
    }

    handlePlayerAction(data) {
        console.log('Player action received:', data);
        
        // Apply action to map
        this.mapSystem.applyRemoteAction(data);
        
        // Show visual feedback
        this.showActionFeedback(data);
    }

    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.showNotification(`${data.player.username} joined the game`);
        this.updatePlayerList();
    }

    handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.showNotification(`${data.username} left the game`);
        this.updatePlayerList();
    }

    handleGameStarted(data) {
        console.log('Game started:', data);
        this.showNotification('Game started!');
        this.updateGameUI(data);
    }

    handleGameEnded(data) {
        console.log('Game ended:', data);
        this.showGameEndScreen(data);
    }

    handleChatMessage(data) {
        console.log('Chat message:', data);
        this.addChatMessage(data);
    }

    // ==================== UI METHODS ====================

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = status === 'Connected' ? 'connected' : 'disconnected';
        }
    }

    updateGameUI(data) {
        // Update player list
        this.updatePlayerList();
        
        // Update turn indicator
        this.updateTurnIndicator();
        
        // Update game status
        this.updateGameStatus();
    }

    updatePlayerList() {
        // Implementation to update player list UI
        console.log('Updating player list...');
    }

    updateTurnIndicator() {
        // Implementation to update turn indicator
        console.log('Updating turn indicator...');
    }

    updateGameStatus() {
        // Implementation to update game status
        console.log('Updating game status...');
    }

    showNotification(message, type = 'info') {
        // Show notification to user
        console.log(`Notification (${type}): ${message}`);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showActionFeedback(data) {
        // Show visual feedback for player actions
        console.log('Action feedback:', data);
    }

    addChatMessage(data) {
        // Add message to chat UI
        console.log('Adding chat message:', data);
    }

    showGameEndScreen(data) {
        // Show game end screen
        console.log('Game end screen:', data);
    }
}
```

## 🔧 Step 4: Update Your HTML

Add WebSocket status and controls to your `index.html`:

```html
<!-- Add to your existing HTML -->
<div id="multiplayerControls" style="display: none;">
    <div id="connectionStatus">Disconnected</div>
    
    <div id="gameControls">
        <input type="text" id="roomCodeInput" placeholder="Enter room code">
        <button id="joinGameBtn">Join Game</button>
        <button id="createGameBtn">Create Game</button>
        <button id="leaveGameBtn">Leave Game</button>
    </div>
    
    <div id="playerList"></div>
    <div id="chatContainer">
        <div id="chatMessages"></div>
        <input type="text" id="chatInput" placeholder="Type a message...">
        <button id="sendChatBtn">Send</button>
    </div>
</div>

<!-- Add before your existing scripts -->
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
<script src="websocket-manager.js"></script>
```

## 🎮 Step 5: Initialize Multiplayer in Your Game

Add this to your existing `script.js`:

```javascript
// Add to your existing MapSystem constructor or create a new instance
let mapSystem;
let multiplayerIntegration = null;
let multiplayerManager;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize your existing map system
    mapSystem = new MapSystem();
    multiplayerIntegration = new SimpleMultiplayerIntegration(mapSystem);
    multiplayerIntegration.initializeMultiplayer();
    multiplayerIntegration.showMultiplayerUI();
    // Initialize multiplayer manager
    multiplayerManager = new MultiplayerManager(mapSystem);
    
    // Set up UI event listeners
    setupMultiplayerUI();
    
    // Try to connect to multiplayer server
    await multiplayerManager.initializeMultiplayer();
});

function setupMultiplayerUI() {
    // Join game button
    document.getElementById('joinGameBtn').addEventListener('click', async () => {
        const roomCode = document.getElementById('roomCodeInput').value;
        if (roomCode) {
            await multiplayerManager.joinGame(roomCode);
        }
    });
    
    // Create game button
    document.getElementById('createGameBtn').addEventListener('click', async () => {
        const gameData = {
            name: 'My City Game',
            maxPlayers: 4,
            isPrivate: false
        };
        await multiplayerManager.createGame(gameData);
    });
    
    // Leave game button
    document.getElementById('leaveGameBtn').addEventListener('click', () => {
        multiplayerManager.websocket.leaveGame();
    });
    
    // Chat input
    document.getElementById('sendChatBtn').addEventListener('click', () => {
        const message = document.getElementById('chatInput').value;
        if (message) {
            multiplayerManager.sendChatMessage(message);
            document.getElementById('chatInput').value = '';
        }
    });
    
    // Enter key for chat
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('sendChatBtn').click();
        }
    });
}

// Modify your existing cell click handler to send multiplayer actions
function handleCellClick(e) {
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    // If multiplayer is on, send to other players
    if (multiplayerIntegration && multiplayerIntegration.isInMultiplayerMode()) {
        const action = mapSystem.selectedAttribute === 'erase' ? 'remove' : 'place';
        multiplayerIntegration.sendGameAction(action, row, col, mapSystem.selectedAttribute, mapSystem.selectedClass);
    } else {
        // Your normal single-player code goes here
        // (keep whatever you had before)
    }
}
```

## 🚀 Step 6: Test the Connection

1. **Start your backend server**:
   ```bash
   cd backend
   npm start
   ```

2. **Open your game in browser** and check the console for connection messages

3. **Test multiplayer**:
   - Open multiple browser tabs
   - Create a game in one tab
   - Join the game in another tab
   - Try placing buildings and see them sync

## 🔧 Configuration Options

### **Connection Options**
```javascript
const connectionOptions = {
    auth: {
        token: localStorage.getItem('authToken')
    },
    transports: ['websocket'],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
};

multiplayerManager.websocket.connect('http://localhost:5000', connectionOptions);
```

### **Error Handling**
```javascript
multiplayerManager.websocket.on('error', (error) => {
    if (error.type === 'connection_failed') {
        // Handle connection failure
    } else if (error.type === 'max_reconnect_attempts') {
        // Handle max reconnection attempts
    }
});
```

This setup provides a complete WebSocket connection system for your multiplayer City Builder Pro game with robust error handling, reconnection, and real-time communication!

