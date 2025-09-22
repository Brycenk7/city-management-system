// Example integration of MultiplayerMapSystem with existing City Builder Pro

class MultiplayerCityBuilder {
    constructor() {
        // Initialize multiplayer map system
        this.mapSystem = new MultiplayerMapSystem({
            mapSize: { rows: 60, cols: 60 },
            conflictResolution: {
                mode: 'turn-based', // or 'real-time'
                enabled: true,
                lockDuration: 5000
            }
        });
        
        // Initialize other systems
        this.resourceManagement = new ResourceManagement();
        this.cellInteraction = new CellInteraction(this.mapSystem);
        
        // Multiplayer state
        this.isMultiplayer = false;
        this.socket = null;
        this.currentGame = null;
        
        this.init();
    }
    
    init() {
        this.setupMultiplayerEvents();
        this.setupUI();
        this.initializeSinglePlayer();
    }
    
    // ==================== MULTIPLAYER SETUP ====================
    
    /**
     * Connect to multiplayer server
     */
    async connectToMultiplayer(serverUrl = 'http://localhost:5000') {
        try {
            // Initialize Socket.io connection
            this.socket = io(serverUrl, {
                auth: {
                    token: localStorage.getItem('authToken')
                }
            });
            
            // Connect map system to server
            this.mapSystem.connectToServer(this.socket);
            
            // Set up multiplayer event listeners
            this.setupSocketEvents();
            
            this.isMultiplayer = true;
            this.showMultiplayerUI();
            
            console.log('Connected to multiplayer server');
            return true;
        } catch (error) {
            console.error('Failed to connect to multiplayer:', error);
            this.showError('Failed to connect to multiplayer server');
            return false;
        }
    }
    
    /**
     * Disconnect from multiplayer
     */
    disconnectFromMultiplayer() {
        if (this.socket) {
            this.mapSystem.disconnectFromServer();
            this.socket = null;
        }
        
        this.isMultiplayer = false;
        this.currentGame = null;
        this.showSinglePlayerUI();
        
        console.log('Disconnected from multiplayer');
    }
    
    /**
     * Join a game room
     */
    async joinGame(roomCode, password = null) {
        try {
            const response = await fetch('/api/game/join/' + roomCode, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                },
                body: JSON.stringify({ password })
            });
            
            if (!response.ok) {
                throw new Error('Failed to join game');
            }
            
            const data = await response.json();
            this.currentGame = data.game;
            
            // Initialize game state
            this.mapSystem.initializeGameState(data.game);
            
            this.showGameUI();
            return true;
        } catch (error) {
            console.error('Failed to join game:', error);
            this.showError('Failed to join game: ' + error.message);
            return false;
        }
    }
    
    /**
     * Create a new game
     */
    async createGame(gameData) {
        try {
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
            
            const data = await response.json();
            this.currentGame = data.game;
            
            // Initialize game state
            this.mapSystem.initializeGameState(data.game);
            
            this.showGameUI();
            return true;
        } catch (error) {
            console.error('Failed to create game:', error);
            this.showError('Failed to create game: ' + error.message);
            return false;
        }
    }
    
    // ==================== EVENT HANDLERS ====================
    
    /**
     * Setup multiplayer event listeners
     */
    setupMultiplayerEvents() {
        // Game state changes
        this.mapSystem.on('gameStateChange', (newState, oldState) => {
            this.handleGameStateChange(newState, oldState);
        });
        
        // Player actions
        this.mapSystem.on('playerAction', (action) => {
            this.handlePlayerAction(action);
        });
        
        // Action rejected
        this.mapSystem.on('actionRejected', (data) => {
            this.handleActionRejected(data);
        });
        
        // Connection changes
        this.mapSystem.on('connectionChange', (data) => {
            this.handleConnectionChange(data);
        });
    }
    
    /**
     * Setup Socket.io event listeners
     */
    setupSocketEvents() {
        if (!this.socket) return;
        
        // Game events
        this.socket.on('game_state', (data) => {
            this.mapSystem.initializeGameState(data.game);
        });
        
        this.socket.on('game_action_broadcast', (data) => {
            this.handleRemoteAction(data);
        });
        
        this.socket.on('player_joined', (data) => {
            this.handlePlayerJoined(data);
        });
        
        this.socket.on('player_left', (data) => {
            this.handlePlayerLeft(data);
        });
        
        this.socket.on('game_started', (data) => {
            this.handleGameStarted(data);
        });
        
        this.socket.on('chat_message_broadcast', (data) => {
            this.handleChatMessage(data);
        });
        
        this.socket.on('disconnect', () => {
            this.handleDisconnection();
        });
    }
    
    // ==================== GAME EVENT HANDLERS ====================
    
    /**
     * Handle game state changes
     */
    handleGameStateChange(newState, oldState) {
        console.log('Game state updated:', newState);
        
        // Update UI elements
        this.updatePlayerList(newState.players);
        this.updateTurnIndicator(newState);
        this.updateActionQueue(newState.actionQueue);
        this.updateGameStatus(newState.status);
        
        // Update resources if player data changed
        if (newState.players.has(this.mapSystem.currentPlayer.id)) {
            const player = newState.players.get(this.mapSystem.currentPlayer.id);
            this.updatePlayerResources(player.resources);
        }
    }
    
    /**
     * Handle player action
     */
    handlePlayerAction(action) {
        console.log('Action processed:', action);
        
        // Update visual feedback
        this.showActionFeedback(action);
        
        // Update statistics
        this.updateStats();
    }
    
    /**
     * Handle action rejection
     */
    handleActionRejected(data) {
        console.error('Action rejected:', data);
        this.showError(`Action rejected: ${data.reason}`);
    }
    
    /**
     * Handle connection changes
     */
    handleConnectionChange(data) {
        if (data.connected) {
            this.showStatus('Connected to server', 'success');
        } else {
            this.showStatus('Disconnected from server', 'error');
        }
    }
    
    /**
     * Handle remote player action
     */
    handleRemoteAction(actionData) {
        const { playerId, action, row, col, attribute, class: cellClass } = actionData;
        
        // Don't process our own actions
        if (playerId === this.mapSystem.currentPlayer.id) return;
        
        // Apply remote action
        const action = {
            type: action === 'place' ? 'place_building' : 'remove_building',
            data: { row, col, attribute, class: cellClass }
        };
        
        this.mapSystem.applyAction(action);
        
        // Show visual feedback
        this.showRemoteActionFeedback(actionData);
    }
    
    /**
     * Handle player joined
     */
    handlePlayerJoined(data) {
        console.log('Player joined:', data.player);
        this.showNotification(`${data.player.username} joined the game`);
        this.updatePlayerList(this.mapSystem.gameState.players);
    }
    
    /**
     * Handle player left
     */
    handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.showNotification(`${data.username} left the game`);
        this.updatePlayerList(this.mapSystem.gameState.players);
    }
    
    /**
     * Handle game started
     */
    handleGameStarted(data) {
        console.log('Game started:', data);
        this.showNotification('Game started!');
        this.updateGameStatus('active');
    }
    
    /**
     * Handle chat message
     */
    handleChatMessage(data) {
        this.addChatMessage(data);
    }
    
    /**
     * Handle disconnection
     */
    handleDisconnection() {
        this.showError('Connection lost. Attempting to reconnect...');
        this.attemptReconnection();
    }
    
    // ==================== UI UPDATES ====================
    
    /**
     * Update player list
     */
    updatePlayerList(players) {
        const playerList = document.getElementById('playerList');
        if (!playerList) return;
        
        playerList.innerHTML = '';
        
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = `player ${player.id === this.mapSystem.currentPlayer.id ? 'current' : ''}`;
            playerElement.innerHTML = `
                <div class="player-info">
                    <span class="player-name" style="color: ${player.color}">${player.username}</span>
                    <span class="player-score">Score: ${player.score}</span>
                </div>
                <div class="player-resources">
                    🪵${player.resources.wood} ⛏️${player.resources.ore} ⚡${player.resources.power}
                </div>
                <div class="player-status">
                    ${player.isReady ? '✅ Ready' : '⏳ Not Ready'}
                    ${player.isHost ? '👑 Host' : ''}
                </div>
            `;
            playerList.appendChild(playerElement);
        });
    }
    
    /**
     * Update turn indicator
     */
    updateTurnIndicator(gameState) {
        const turnIndicator = document.getElementById('turnIndicator');
        if (!turnIndicator) return;
        
        if (gameState.conflictResolution.mode === 'real-time') {
            turnIndicator.textContent = 'Real-time mode - All players can act';
            turnIndicator.className = 'real-time';
        } else {
            const currentPlayer = gameState.players.get(gameState.turnOrder[gameState.currentTurn]);
            if (currentPlayer) {
                const isMyTurn = currentPlayer.id === this.mapSystem.currentPlayer.id;
                turnIndicator.textContent = `${currentPlayer.username}'s turn`;
                turnIndicator.className = isMyTurn ? 'your-turn' : 'other-turn';
            }
        }
    }
    
    /**
     * Update action queue
     */
    updateActionQueue(actionQueue) {
        const queueElement = document.getElementById('actionQueue');
        if (!queueElement) return;
        
        queueElement.innerHTML = '';
        
        actionQueue.forEach(action => {
            const actionElement = document.createElement('div');
            actionElement.className = `action ${action.status}`;
            actionElement.innerHTML = `
                <span class="action-type">${action.type}</span>
                <span class="action-data">(${action.data.row}, ${action.data.col})</span>
                <span class="action-status">${action.status}</span>
            `;
            queueElement.appendChild(actionElement);
        });
    }
    
    /**
     * Update game status
     */
    updateGameStatus(status) {
        const statusElement = document.getElementById('gameStatus');
        if (!statusElement) return;
        
        statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        statusElement.className = `status ${status}`;
    }
    
    /**
     * Update player resources
     */
    updatePlayerResources(resources) {
        // Update resource display
        document.getElementById('woodCount').textContent = resources.wood;
        document.getElementById('oreCount').textContent = resources.ore;
        document.getElementById('commercialCount').textContent = resources.commercialGoods;
        document.getElementById('powerCount').textContent = resources.power;
    }
    
    // ==================== UI SETUP ====================
    
    /**
     * Show multiplayer UI
     */
    showMultiplayerUI() {
        // Show multiplayer controls
        document.getElementById('multiplayerControls').style.display = 'block';
        document.getElementById('singlePlayerControls').style.display = 'none';
        
        // Add multiplayer-specific buttons
        this.addMultiplayerButtons();
    }
    
    /**
     * Show single player UI
     */
    showSinglePlayerUI() {
        // Show single player controls
        document.getElementById('multiplayerControls').style.display = 'none';
        document.getElementById('singlePlayerControls').style.display = 'block';
    }
    
    /**
     * Show game UI
     */
    showGameUI() {
        // Show game-specific UI
        document.getElementById('lobbyUI').style.display = 'none';
        document.getElementById('gameUI').style.display = 'block';
    }
    
    /**
     * Add multiplayer buttons
     */
    addMultiplayerButtons() {
        const controls = document.getElementById('multiplayerControls');
        
        // Create game button
        const createButton = document.createElement('button');
        createButton.textContent = 'Create Game';
        createButton.onclick = () => this.showCreateGameDialog();
        controls.appendChild(createButton);
        
        // Join game button
        const joinButton = document.createElement('button');
        joinButton.textContent = 'Join Game';
        joinButton.onclick = () => this.showJoinGameDialog();
        controls.appendChild(joinButton);
        
        // Disconnect button
        const disconnectButton = document.createElement('button');
        disconnectButton.textContent = 'Disconnect';
        disconnectButton.onclick = () => this.disconnectFromMultiplayer();
        controls.appendChild(disconnectButton);
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${type}`;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.showStatus(message, 'error');
    }
    
    /**
     * Show notification
     */
    showNotification(message) {
        // Create toast notification
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Initialize single player mode
     */
    initializeSinglePlayer() {
        // Initialize single player systems
        this.resourceManagement = new ResourceManagement();
        this.cellInteraction = new CellInteraction(this.mapSystem);
        
        // Set up single player event listeners
        this.setupSinglePlayerEvents();
    }
    
    /**
     * Setup single player events
     */
    setupSinglePlayerEvents() {
        // Add single player specific event listeners
        // This would include the existing event handling from script.js
    }
    
    /**
     * Attempt reconnection
     */
    attemptReconnection() {
        if (this.mapSystem.reconnectAttempts < this.mapSystem.maxReconnectAttempts) {
            setTimeout(() => {
                this.connectToMultiplayer();
                this.mapSystem.reconnectAttempts++;
            }, 5000);
        } else {
            this.showError('Failed to reconnect. Please refresh the page.');
        }
    }
}

// Initialize the multiplayer city builder
const cityBuilder = new MultiplayerCityBuilder();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerCityBuilder;
}

