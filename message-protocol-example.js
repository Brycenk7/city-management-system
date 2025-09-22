/**
 * Message Protocol Usage Example
 * 
 * This file demonstrates how to use the message protocol with the multiplayer city builder
 */

// Example usage of the Message Protocol
class MultiplayerGameClient {
    constructor() {
        // Initialize message protocol
        this.messageProtocol = new MessageProtocol();
        
        // Initialize socket connection
        this.socket = io('http://localhost:5000', {
            auth: {
                token: localStorage.getItem('authToken')
            }
        });
        
        // Initialize socket message handler
        this.socketHandler = new SocketMessageHandler(this.socket, this.messageProtocol);
        
        // Game state
        this.currentPlayer = null;
        this.currentGame = null;
        this.gameState = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for message processing results
        this.socket.on('message_processed', (result) => {
            this.handleProcessedMessage(result);
        });

        // Listen for specific game events
        this.socket.on('game_state', (data) => {
            this.handleGameStateUpdate(data);
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

        this.socket.on('game_ended', (data) => {
            this.handleGameEnded(data);
        });
    }

    // ==================== MESSAGE HANDLING ====================

    handleProcessedMessage(result) {
        console.log('Message processed:', result);

        switch (result.action) {
            case 'place_building':
                this.handlePlaceBuildingResult(result.data);
                break;
            case 'remove_building':
                this.handleRemoveBuildingResult(result.data);
                break;
            case 'action_response':
                this.handleActionResponse(result.data);
                break;
            case 'resource_update':
                this.handleResourceUpdate(result.data);
                break;
            case 'map_update':
                this.handleMapUpdate(result.data);
                break;
            case 'player_join':
                this.handlePlayerJoined(result.data);
                break;
            case 'player_leave':
                this.handlePlayerLeft(result.data);
                break;
            case 'game_start':
                this.handleGameStarted(result.data);
                break;
            case 'game_end':
                this.handleGameEnded(result.data);
                break;
            case 'chat_message':
                this.handleChatMessage(result.data);
                break;
            case 'ping':
                this.handlePing(result.data);
                break;
            case 'pong':
                this.handlePong(result.data);
                break;
            case 'error':
                this.handleError(result.data);
                break;
        }
    }

    // ==================== GAME ACTIONS ====================

    /**
     * Place a building on the map
     */
    placeBuilding(row, col, attribute, classType) {
        if (!this.currentPlayer || !this.currentGame) {
            console.error('Not in a game');
            return;
        }

        // Get building cost
        const cost = this.getBuildingCost(attribute);
        if (!cost) {
            console.error('Invalid building type');
            return;
        }

        // Check if player has enough resources
        if (!this.hasEnoughResources(cost)) {
            this.showError('Not enough resources');
            return;
        }

        // Validate placement
        const validation = this.validatePlacement(row, col, attribute);
        if (!validation.isValid) {
            this.showError(`Cannot place ${attribute}: ${validation.reason}`);
            return;
        }

        // Create and send message
        const messageId = this.socketHandler.sendPlaceBuilding(
            this.currentPlayer.id,
            this.currentGame.id,
            row,
            col,
            attribute,
            classType,
            cost,
            validation
        );

        console.log('Place building message sent:', messageId);
        return messageId;
    }

    /**
     * Remove a building from the map
     */
    removeBuilding(row, col, reason = 'erase') {
        if (!this.currentPlayer || !this.currentGame) {
            console.error('Not in a game');
            return;
        }

        // Get refund amount
        const refund = this.calculateRefund(row, col);
        if (!refund) {
            console.error('Nothing to remove at this location');
            return;
        }

        // Create and send message
        const messageId = this.socketHandler.sendRemoveBuilding(
            this.currentPlayer.id,
            this.currentGame.id,
            row,
            col,
            refund,
            reason
        );

        console.log('Remove building message sent:', messageId);
        return messageId;
    }

    /**
     * Send a chat message
     */
    sendChatMessage(message, type = 'chat') {
        if (!this.currentPlayer || !this.currentGame) {
            console.error('Not in a game');
            return;
        }

        const messageId = this.socketHandler.sendChatMessage(
            this.currentGame.id,
            this.currentPlayer.id,
            this.currentPlayer.username,
            message,
            type
        );

        console.log('Chat message sent:', messageId);
        return messageId;
    }

    /**
     * Send ping to check connection
     */
    sendPing() {
        const messageId = this.socketHandler.sendPing();
        console.log('Ping sent:', messageId);
        return messageId;
    }

    // ==================== MESSAGE RESULT HANDLERS ====================

    handlePlaceBuildingResult(data) {
        console.log('Place building result:', data);
        
        if (data.status === 'success') {
            // Update local map
            this.updateMapCell(data.result.newCellState);
            
            // Update player resources
            this.updatePlayerResources(data.result.resourceUpdate);
            
            // Show success feedback
            this.showSuccess(`Building placed at (${data.cell.row}, ${data.cell.col})`);
        } else if (data.status === 'conflict') {
            // Handle conflict
            this.handleConflict(data.conflicts);
        } else {
            // Show error
            this.showError(data.error?.message || 'Failed to place building');
        }
    }

    handleRemoveBuildingResult(data) {
        console.log('Remove building result:', data);
        
        if (data.status === 'success') {
            // Update local map
            this.updateMapCell(data.result.newCellState);
            
            // Update player resources
            this.updatePlayerResources(data.result.resourceUpdate);
            
            // Show success feedback
            this.showSuccess(`Building removed from (${data.cell.row}, ${data.cell.col})`);
        } else {
            // Show error
            this.showError(data.error?.message || 'Failed to remove building');
        }
    }

    handleActionResponse(data) {
        console.log('Action response:', data);
        
        switch (data.status) {
            case 'success':
                this.showSuccess('Action completed successfully');
                break;
            case 'failed':
                this.showError(data.error?.message || 'Action failed');
                break;
            case 'conflict':
                this.handleConflict(data.conflicts);
                break;
            case 'queued':
                this.showInfo('Action queued for processing');
                break;
        }
    }

    handleResourceUpdate(data) {
        console.log('Resource update:', data);
        
        // Update UI with new resource values
        this.updateResourceDisplay(data.totalResources);
        
        // Show resource change notifications
        Object.keys(data.changes).forEach(resource => {
            const change = data.changes[resource];
            if (change.delta !== 0) {
                this.showResourceChange(resource, change.delta, change.reason);
            }
        });
    }

    handleMapUpdate(data) {
        console.log('Map update:', data);
        
        // Apply map changes
        if (data.fullUpdate && data.mapState) {
            this.loadFullMap(data.mapState);
        } else {
            // Apply incremental changes
            data.changes.added.forEach(change => {
                this.updateMapCell(change.newState);
            });
            
            data.changes.modified.forEach(change => {
                this.updateMapCell(change.newState);
            });
            
            data.changes.removed.forEach(change => {
                this.removeMapCell(change.cell.row, change.cell.col);
            });
        }
    }

    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        
        // Update player list
        this.updatePlayerList();
        
        // Show notification
        this.showNotification(`${data.player.username} joined the game`);
    }

    handlePlayerLeft(data) {
        console.log('Player left:', data);
        
        // Update player list
        this.updatePlayerList();
        
        // Show notification
        this.showNotification(`${data.username} left the game`);
    }

    handleGameStarted(data) {
        console.log('Game started:', data);
        
        // Update game state
        this.gameState = data;
        
        // Show notification
        this.showNotification('Game started!');
        
        // Update UI
        this.updateGameUI();
    }

    handleGameEnded(data) {
        console.log('Game ended:', data);
        
        // Update game state
        this.gameState = data;
        
        // Show game end screen
        this.showGameEndScreen(data);
    }

    handleChatMessage(data) {
        console.log('Chat message:', data);
        
        // Add message to chat UI
        this.addChatMessage(data);
    }

    handlePing(data) {
        console.log('Ping received:', data);
        
        // Respond with pong
        const pongMessage = this.messageProtocol.createPongMessage(data.timestamp);
        this.socket.emit('pong', pongMessage);
    }

    handlePong(data) {
        console.log('Pong received:', data);
        
        // Update connection status
        this.updateConnectionStatus(data.latency);
    }

    handleError(data) {
        console.error('Error received:', data);
        
        // Show error to user
        this.showError(data.message);
        
        // Handle retryable errors
        if (data.retryable && data.retryAfter) {
            setTimeout(() => {
                this.retryLastAction();
            }, data.retryAfter);
        }
    }

    // ==================== GAME STATE HANDLERS ====================

    handleGameStateUpdate(data) {
        console.log('Game state update:', data);
        
        // Update local game state
        this.gameState = data.game;
        this.currentPlayer = data.game.players.find(p => p.id === this.currentPlayer?.id);
        
        // Update UI
        this.updateGameUI();
    }

    // ==================== UTILITY METHODS ====================

    getBuildingCost(attribute) {
        const costs = {
            'road': { wood: 4 },
            'bridge': { wood: 16, ore: 6 },
            'residential': { wood: 60, ore: 8 },
            'commercial': { wood: 30, ore: 20 },
            'industrial': { wood: 40, ore: 20 },
            'mixed': { wood: 36, ore: 16 },
            'powerPlant': { wood: 25, ore: 15 },
            'powerLines': { wood: 3, ore: 1 },
            'lumberYard': { wood: 10 },
            'miningOutpost': { wood: 20, ore: 10 }
        };
        
        return costs[attribute] || null;
    }

    hasEnoughResources(cost) {
        if (!this.currentPlayer) return false;
        
        return Object.keys(cost).every(resource => 
            this.currentPlayer.resources[resource] >= cost[resource]
        );
    }

    validatePlacement(row, col, attribute) {
        // Basic validation logic
        if (row < 0 || row >= 60 || col < 0 || col >= 60) {
            return { isValid: false, reason: 'Out of bounds' };
        }
        
        // Check if cell is occupied
        const cell = this.getCellAt(row, col);
        if (cell && cell.playerId && cell.playerId !== this.currentPlayer.id) {
            return { isValid: false, reason: 'Cell occupied by another player' };
        }
        
        // Add more validation rules as needed
        return { isValid: true, rules: ['in_bounds', 'not_occupied'] };
    }

    calculateRefund(row, col) {
        const cell = this.getCellAt(row, col);
        if (!cell || !cell.playerId) return null;
        
        const cost = this.getBuildingCost(cell.attribute);
        if (!cost) return null;
        
        // 50% refund
        return Object.keys(cost).reduce((refund, resource) => {
            refund[resource] = Math.floor(cost[resource] * 0.5);
            return refund;
        }, {});
    }

    // ==================== UI UPDATE METHODS ====================

    updateMapCell(cellState) {
        // Update the visual representation of a cell
        const cellElement = document.querySelector(`[data-row="${cellState.row}"][data-col="${cellState.col}"]`);
        if (cellElement) {
            cellElement.dataset.attribute = cellState.attribute;
            cellElement.dataset.class = cellState.class;
            cellElement.style.backgroundColor = this.getCellColor(cellState.attribute);
        }
    }

    removeMapCell(row, col) {
        // Remove building from cell
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellElement) {
            cellElement.dataset.attribute = 'grassland';
            cellElement.dataset.class = 'grassland';
            cellElement.style.backgroundColor = '#90EE90';
        }
    }

    updatePlayerResources(resourceUpdate) {
        // Update player's resource display
        Object.keys(resourceUpdate.resources).forEach(resource => {
            const element = document.getElementById(`${resource}Count`);
            if (element) {
                element.textContent = resourceUpdate.resources[resource];
            }
        });
    }

    updateResourceDisplay(resources) {
        // Update resource display
        Object.keys(resources).forEach(resource => {
            const element = document.getElementById(`${resource}Count`);
            if (element) {
                element.textContent = resources[resource];
            }
        });
    }

    updatePlayerList() {
        // Update the player list UI
        const playerList = document.getElementById('playerList');
        if (!playerList || !this.gameState) return;
        
        playerList.innerHTML = '';
        
        this.gameState.players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = `player ${player.id === this.currentPlayer?.id ? 'current' : ''}`;
            playerElement.innerHTML = `
                <span style="color: ${player.color}">${player.username}</span>
                <span>Score: ${player.score}</span>
                <span>🪵${player.resources.wood} ⛏️${player.resources.ore}</span>
            `;
            playerList.appendChild(playerElement);
        });
    }

    updateGameUI() {
        // Update various game UI elements
        this.updatePlayerList();
        this.updateTurnIndicator();
        this.updateGameStatus();
    }

    updateTurnIndicator() {
        // Update turn indicator
        const turnIndicator = document.getElementById('turnIndicator');
        if (!turnIndicator || !this.gameState) return;
        
        const currentPlayer = this.gameState.players[this.gameState.currentTurn];
        if (currentPlayer) {
            turnIndicator.textContent = `${currentPlayer.username}'s turn`;
        }
    }

    updateGameStatus() {
        // Update game status
        const statusElement = document.getElementById('gameStatus');
        if (!statusElement || !this.gameState) return;
        
        statusElement.textContent = this.gameState.status;
    }

    // ==================== NOTIFICATION METHODS ====================

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showResourceChange(resource, delta, reason) {
        const changeText = delta > 0 ? `+${delta}` : `${delta}`;
        this.showNotification(`${resource}: ${changeText} (${reason})`, delta > 0 ? 'success' : 'info');
    }

    handleConflict(conflicts) {
        conflicts.forEach(conflict => {
            let message = 'Conflict detected: ';
            switch (conflict.type) {
                case 'cell_conflict':
                    message += 'Another player is using this cell';
                    break;
                case 'resource_conflict':
                    message += 'Not enough resources';
                    break;
                case 'turn_conflict':
                    message += 'Not your turn';
                    break;
            }
            this.showError(message);
        });
    }

    // ==================== CONNECTION MANAGEMENT ====================

    updateConnectionStatus(latency) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = `Connected (${latency}ms)`;
            statusElement.className = 'connected';
        }
    }

    retryLastAction() {
        // Implement retry logic for failed actions
        console.log('Retrying last action...');
    }

    // ==================== CELL MANAGEMENT ====================

    getCellAt(row, col) {
        // Get cell data from local state
        // This would be implemented based on your map system
        return null; // Placeholder
    }

    getCellColor(attribute) {
        const colors = {
            'grassland': '#90EE90',
            'road': '#4A4A4A',
            'residential': '#D0021B',
            'commercial': '#9013FE',
            'industrial': '#808080',
            'powerPlant': '#FFD700',
            'powerLines': '#FFFF99'
        };
        return colors[attribute] || '#90EE90';
    }

    loadFullMap(mapState) {
        // Load entire map state
        mapState.forEach(cellState => {
            this.updateMapCell(cellState);
        });
    }

    addChatMessage(data) {
        const chatContainer = document.getElementById('chatContainer');
        if (!chatContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="chat-username" style="color: ${data.color || '#000'}">${data.username}:</span>
            <span class="chat-text">${data.message}</span>
        `;
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    showGameEndScreen(data) {
        // Show game end screen with results
        const endScreen = document.createElement('div');
        endScreen.className = 'game-end-screen';
        endScreen.innerHTML = `
            <h2>Game Ended</h2>
            <p>Reason: ${data.reason}</p>
            ${data.winner ? `<p>Winner: ${data.winner}</p>` : ''}
            <div class="final-scores">
                <h3>Final Scores</h3>
                ${Object.keys(data.finalScores).map(playerId => {
                    const score = data.finalScores[playerId];
                    return `<div>${playerId}: ${score.score} points</div>`;
                }).join('')}
            </div>
        `;
        
        document.body.appendChild(endScreen);
    }
}

// Initialize the multiplayer game client
const gameClient = new MultiplayerGameClient();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerGameClient;
} else {
    window.MultiplayerGameClient = MultiplayerGameClient;
}

