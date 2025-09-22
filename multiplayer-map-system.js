class MultiplayerMapSystem {
    constructor(options = {}) {
        // Core map properties
        this.mapSize = options.mapSize || { rows: 60, cols: 60 };
        this.selectedAttribute = 'grassland';
        this.selectedClass = 'grassland';
        this.cells = [];
        this.classInfo = new ClassInfo();
        this.waterProperties = new WaterProperties();
        
        // Multiplayer state management
        this.gameState = {
            id: null,
            roomCode: null,
            status: 'waiting', // waiting, starting, active, paused, finished
            players: new Map(),
            currentPlayerId: null,
            turnOrder: [],
            currentTurn: 0,
            lastActionId: 0,
            actionQueue: [],
            pendingActions: new Map(),
            conflictResolution: {
                enabled: true,
                mode: 'turn-based', // 'turn-based' or 'real-time'
                lockDuration: 5000, // 5 seconds for real-time mode
                maxRetries: 3
            }
        };
        
        // Player management
        this.currentPlayer = {
            id: null,
            username: null,
            color: null,
            isHost: false,
            isReady: false,
            resources: {
                wood: 30,
                ore: 10,
                commercialGoods: 0,
                power: 0
            },
            score: 0
        };
        
        // Action management
        this.actionHistory = [];
        this.rollbackStack = [];
        this.validationRules = new Map();
        
        // UI state
        this.currentTab = 'builder';
        this.playerMode = 'road';
        this.isDragging = false;
        this.wasDragging = false;
        this.dragStartCell = null;
        this.lastPaintedCell = null;
        this.hasMoved = false;
        
        // Network communication
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Event callbacks
        this.eventCallbacks = {
            onGameStateChange: [],
            onPlayerAction: [],
            onConflictDetected: [],
            onActionQueued: [],
            onActionRejected: [],
            onConnectionChange: []
        };
        
        this.init();
    }
    
    init() {
        this.setupValidationRules();
        this.createMap();
        this.setupEventListeners();
        this.updateStats();
    }
    
    // ==================== GAME STATE MANAGEMENT ====================
    
    /**
     * Initialize game state from server data
     */
    initializeGameState(gameData) {
        this.gameState.id = gameData.id;
        this.gameState.roomCode = gameData.roomCode;
        this.gameState.status = gameData.status;
        this.gameState.currentTurn = gameData.currentTurn || 0;
        this.gameState.turnOrder = gameData.turnOrder || [];
        
        // Initialize players
        this.gameState.players.clear();
        if (gameData.players) {
            gameData.players.forEach(player => {
                this.gameState.players.set(player.id, {
                    id: player.id,
                    username: player.username,
                    color: player.color,
                    isReady: player.isReady,
                    isHost: player.isHost,
                    resources: player.resources || { wood: 30, ore: 10, commercialGoods: 0, power: 0 },
                    score: player.score || 0,
                    lastAction: player.lastAction || null
                });
            });
        }
        
        // Initialize map cells
        if (gameData.gameState && gameData.gameState.cells) {
            this.loadMapFromState(gameData.gameState.cells);
        }
        
        this.emit('gameStateChange', this.gameState);
    }
    
    /**
     * Update game state with server data
     */
    updateGameState(updates) {
        const previousState = { ...this.gameState };
        
        // Apply updates
        Object.keys(updates).forEach(key => {
            if (key === 'players' && Array.isArray(updates[key])) {
                this.gameState.players.clear();
                updates[key].forEach(player => {
                    this.gameState.players.set(player.id, player);
                });
            } else if (key === 'cells' && Array.isArray(updates[key])) {
                this.loadMapFromState(updates[key]);
            } else {
                this.gameState[key] = updates[key];
            }
        });
        
        this.emit('gameStateChange', this.gameState, previousState);
    }
    
    /**
     * Get current game state
     */
    getGameState() {
        return {
            ...this.gameState,
            cells: this.getMapState(),
            currentPlayer: this.currentPlayer
        };
    }
    
    // ==================== ACTION MANAGEMENT ====================
    
    /**
     * Queue an action for processing
     */
    queueAction(action) {
        const actionId = ++this.gameState.lastActionId;
        const timestamp = Date.now();
        
        const queuedAction = {
            id: actionId,
            type: action.type,
            playerId: this.currentPlayer.id,
            data: action.data,
            timestamp,
            status: 'pending',
            retryCount: 0,
            conflicts: []
        };
        
        // Validate action locally first
        if (!this.validateAction(queuedAction)) {
            this.emit('actionRejected', {
                action: queuedAction,
                reason: 'Validation failed'
            });
            return false;
        }
        
        // Check for conflicts
        const conflicts = this.detectConflicts(queuedAction);
        if (conflicts.length > 0) {
            queuedAction.conflicts = conflicts;
            this.handleConflicts(queuedAction, conflicts);
        }
        
        // Add to queue
        this.gameState.actionQueue.push(queuedAction);
        this.gameState.pendingActions.set(actionId, queuedAction);
        
        this.emit('actionQueued', queuedAction);
        
        // Process action based on mode
        if (this.gameState.conflictResolution.mode === 'real-time') {
            this.processActionImmediately(queuedAction);
        } else {
            this.processActionOnTurn(queuedAction);
        }
        
        return actionId;
    }
    
    /**
     * Process action immediately (real-time mode)
     */
    async processActionImmediately(action) {
        try {
            // Apply action locally
            const success = this.applyAction(action);
            
            if (success) {
                action.status = 'applied';
                this.gameState.pendingActions.delete(action.id);
                
                // Send to server
                if (this.socket && this.isConnected) {
                    this.socket.emit('game_action', {
                        roomCode: this.gameState.roomCode,
                        actionId: action.id,
                        action: action.type,
                        data: action.data
                    });
                }
                
                this.emit('playerAction', action);
            } else {
                action.status = 'failed';
                this.handleActionFailure(action, 'Local application failed');
            }
        } catch (error) {
            this.handleActionFailure(action, error.message);
        }
    }
    
    /**
     * Process action on turn (turn-based mode)
     */
    processActionOnTurn(action) {
        // In turn-based mode, actions are processed when it's the player's turn
        if (this.isCurrentPlayerTurn()) {
            this.processActionImmediately(action);
        } else {
            action.status = 'queued';
            this.emit('actionQueued', action);
        }
    }
    
    /**
     * Apply action to local state
     */
    applyAction(action) {
        try {
            const { type, data } = action;
            
            switch (type) {
                case 'place_building':
                    return this.applyPlaceBuilding(data);
                case 'remove_building':
                    return this.applyRemoveBuilding(data);
                case 'update_resources':
                    return this.applyResourceUpdate(data);
                case 'end_turn':
                    return this.applyEndTurn(data);
                default:
                    console.warn(`Unknown action type: ${type}`);
                    return false;
            }
        } catch (error) {
            console.error('Error applying action:', error);
            return false;
        }
    }
    
    /**
     * Apply place building action
     */
    applyPlaceBuilding(data) {
        const { row, col, attribute, class: cellClass } = data;
        
        if (!this.isValidCell(row, col)) {
            return false;
        }
        
        // Check if cell is already occupied by another player
        const currentCell = this.cells[row][col];
        if (currentCell.playerId && currentCell.playerId !== this.currentPlayer.id) {
            return false;
        }
        
        // Update cell
        currentCell.attribute = attribute;
        currentCell.class = cellClass;
        currentCell.playerId = this.currentPlayer.id;
        currentCell.timestamp = Date.now();
        
        // Update visual representation
        this.updateCellVisual(row, col, currentCell);
        
        // Update resources if needed
        this.updatePlayerResources(attribute, 'place');
        
        return true;
    }
    
    /**
     * Apply remove building action
     */
    applyRemoveBuilding(data) {
        const { row, col } = data;
        
        if (!this.isValidCell(row, col)) {
            return false;
        }
        
        const currentCell = this.cells[row][col];
        
        // Check if player owns this cell or is using erase mode
        if (currentCell.playerId && currentCell.playerId !== this.currentPlayer.id) {
            return false;
        }
        
        // Reset cell to original state
        const originalAttribute = this.getOriginalCellAttribute(row, col);
        currentCell.attribute = originalAttribute;
        currentCell.class = originalAttribute;
        currentCell.playerId = null;
        currentCell.timestamp = Date.now();
        
        // Update visual representation
        this.updateCellVisual(row, col, currentCell);
        
        // Refund resources if needed
        this.updatePlayerResources(originalAttribute, 'remove');
        
        return true;
    }
    
    // ==================== CONFLICT RESOLUTION ====================
    
    /**
     * Detect conflicts with pending actions
     */
    detectConflicts(action) {
        const conflicts = [];
        const { type, data } = action;
        
        // Check for cell conflicts
        if (type === 'place_building' || type === 'remove_building') {
            const { row, col } = data;
            
            this.gameState.pendingActions.forEach((pendingAction, actionId) => {
                if (pendingAction.id === action.id) return;
                
                if (pendingAction.type === 'place_building' || pendingAction.type === 'remove_building') {
                    if (pendingAction.data.row === row && pendingAction.data.col === col) {
                        conflicts.push({
                            type: 'cell_conflict',
                            actionId: pendingAction.id,
                            playerId: pendingAction.playerId,
                            cell: { row, col }
                        });
                    }
                }
            });
        }
        
        // Check for resource conflicts
        if (type === 'place_building') {
            const cost = this.getBuildingCost(data.attribute);
            if (cost && !this.hasEnoughResources(cost)) {
                conflicts.push({
                    type: 'resource_conflict',
                    required: cost,
                    available: this.currentPlayer.resources
                });
            }
        }
        
        return conflicts;
    }
    
    /**
     * Handle detected conflicts
     */
    handleConflicts(action, conflicts) {
        if (this.gameState.conflictResolution.mode === 'real-time') {
            // In real-time mode, use timestamp-based resolution
            this.resolveConflictsByTimestamp(action, conflicts);
        } else {
            // In turn-based mode, queue for turn processing
            this.queueConflictsForTurn(action, conflicts);
        }
    }
    
    /**
     * Resolve conflicts by timestamp (first come, first served)
     */
    resolveConflictsByTimestamp(action, conflicts) {
        const cellConflicts = conflicts.filter(c => c.type === 'cell_conflict');
        
        if (cellConflicts.length > 0) {
            // Find the earliest conflicting action
            let earliestAction = null;
            let earliestTime = Infinity;
            
            cellConflicts.forEach(conflict => {
                const conflictingAction = this.gameState.pendingActions.get(conflict.actionId);
                if (conflictingAction && conflictingAction.timestamp < earliestTime) {
                    earliestTime = conflictingAction.timestamp;
                    earliestAction = conflictingAction;
                }
            });
            
            if (earliestAction && earliestAction.timestamp < action.timestamp) {
                // Reject this action
                this.rejectAction(action, 'Cell conflict - another player acted first');
                return;
            } else {
                // Reject conflicting actions
                cellConflicts.forEach(conflict => {
                    const conflictingAction = this.gameState.pendingActions.get(conflict.actionId);
                    if (conflictingAction) {
                        this.rejectAction(conflictingAction, 'Cell conflict - superseded by newer action');
                    }
                });
            }
        }
    }
    
    // ==================== VALIDATION AND ROLLBACK ====================
    
    /**
     * Validate action before processing
     */
    validateAction(action) {
        const { type, data } = action;
        
        // Check if it's the player's turn (for turn-based mode)
        if (this.gameState.conflictResolution.mode === 'turn-based' && !this.isCurrentPlayerTurn()) {
            return false;
        }
        
        // Check if game is active
        if (this.gameState.status !== 'active') {
            return false;
        }
        
        // Type-specific validation
        switch (type) {
            case 'place_building':
                return this.validatePlaceBuilding(data);
            case 'remove_building':
                return this.validateRemoveBuilding(data);
            case 'update_resources':
                return this.validateResourceUpdate(data);
            case 'end_turn':
                return this.validateEndTurn(data);
            default:
                return false;
        }
    }
    
    /**
     * Validate place building action
     */
    validatePlaceBuilding(data) {
        const { row, col, attribute } = data;
        
        // Basic validation
        if (!this.isValidCell(row, col)) return false;
        if (!this.isValidAttribute(attribute)) return false;
        
        // Check cell availability
        const cell = this.cells[row][col];
        if (cell.playerId && cell.playerId !== this.currentPlayer.id) return false;
        
        // Check resources
        const cost = this.getBuildingCost(attribute);
        if (cost && !this.hasEnoughResources(cost)) return false;
        
        // Check placement rules
        if (!this.isValidPlacement(row, col, attribute)) return false;
        
        return true;
    }
    
    /**
     * Create rollback point
     */
    createRollbackPoint() {
        const rollbackPoint = {
            timestamp: Date.now(),
            gameState: JSON.parse(JSON.stringify(this.gameState)),
            mapState: this.getMapState(),
            playerState: { ...this.currentPlayer }
        };
        
        this.rollbackStack.push(rollbackPoint);
        
        // Limit rollback stack size
        if (this.rollbackStack.length > 10) {
            this.rollbackStack.shift();
        }
    }
    
    /**
     * Rollback to previous state
     */
    rollbackToPoint(rollbackPoint) {
        try {
            this.gameState = rollbackPoint.gameState;
            this.loadMapFromState(rollbackPoint.mapState);
            this.currentPlayer = rollbackPoint.playerState;
            
            this.emit('gameStateChange', this.gameState);
            return true;
        } catch (error) {
            console.error('Rollback failed:', error);
            return false;
        }
    }
    
    /**
     * Rollback to last stable state
     */
    rollbackToLastStable() {
        if (this.rollbackStack.length > 0) {
            const lastStable = this.rollbackStack[this.rollbackStack.length - 1];
            return this.rollbackToPoint(lastStable);
        }
        return false;
    }
    
    // ==================== NETWORK COMMUNICATION ====================
    
    /**
     * Connect to multiplayer server
     */
    connectToServer(socket) {
        this.socket = socket;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        this.setupSocketListeners();
        this.emit('connectionChange', { connected: true });
    }
    
    /**
     * Disconnect from server
     */
    disconnectFromServer() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.emit('connectionChange', { connected: false });
    }
    
    /**
     * Setup Socket.io event listeners
     */
    setupSocketListeners() {
        if (!this.socket) return;
        
        this.socket.on('game_state', (data) => {
            this.initializeGameState(data.game);
        });
        
        this.socket.on('game_action_broadcast', (data) => {
            this.handleRemoteAction(data);
        });
        
        this.socket.on('action_conflict', (data) => {
            this.handleActionConflict(data);
        });
        
        this.socket.on('game_ended', (data) => {
            this.handleGameEnd(data);
        });
        
        this.socket.on('disconnect', () => {
            this.handleDisconnection();
        });
    }
    
    /**
     * Handle action from remote player
     */
    handleRemoteAction(actionData) {
        const { playerId, action, row, col, attribute, class: cellClass } = actionData;
        
        // Don't process our own actions
        if (playerId === this.currentPlayer.id) return;
        
        // Apply remote action
        const action = {
            type: action === 'place' ? 'place_building' : 'remove_building',
            data: { row, col, attribute, class: cellClass }
        };
        
        this.applyAction(action);
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Check if it's the current player's turn
     */
    isCurrentPlayerTurn() {
        if (this.gameState.conflictResolution.mode === 'real-time') {
            return true;
        }
        
        if (this.gameState.turnOrder.length === 0) return false;
        
        const currentPlayerIndex = this.gameState.turnOrder.indexOf(this.currentPlayer.id);
        return currentPlayerIndex === this.gameState.currentTurn;
    }
    
    /**
     * Get building cost
     */
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
    
    /**
     * Check if player has enough resources
     */
    hasEnoughResources(cost) {
        return Object.keys(cost).every(resource => 
            this.currentPlayer.resources[resource] >= cost[resource]
        );
    }
    
    /**
     * Update player resources
     */
    updatePlayerResources(attribute, action) {
        const cost = this.getBuildingCost(attribute);
        if (!cost) return;
        
        const multiplier = action === 'place' ? -1 : 0.5; // 50% refund on removal
        
        Object.keys(cost).forEach(resource => {
            this.currentPlayer.resources[resource] += cost[resource] * multiplier;
        });
    }
    
    /**
     * Get map state for serialization
     */
    getMapState() {
        const cells = [];
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                cells.push({
                    row: cell.row,
                    col: cell.col,
                    attribute: cell.attribute,
                    class: cell.class,
                    playerId: cell.playerId,
                    timestamp: cell.timestamp
                });
            }
        }
        return cells;
    }
    
    /**
     * Load map from serialized state
     */
    loadMapFromState(cells) {
        cells.forEach(cellData => {
            const { row, col, attribute, class: cellClass, playerId, timestamp } = cellData;
            if (this.isValidCell(row, col)) {
                const cell = this.cells[row][col];
                cell.attribute = attribute;
                cell.class = cellClass;
                cell.playerId = playerId;
                cell.timestamp = timestamp;
                this.updateCellVisual(row, col, cell);
            }
        });
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
     * Emit event
     */
    emit(event, ...args) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event callback for ${event}:`, error);
                }
            });
        }
    }
    
    // ==================== LEGACY COMPATIBILITY ====================
    
    /**
     * Maintain compatibility with existing code
     */
    createMap() {
        // Implementation from original MapSystem
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = '';
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.attribute = 'grassland';
                
                cell.addEventListener('click', (e) => this.handleCellClick(e));
                cell.addEventListener('mousedown', (e) => this.handleCellMouseDown(e));
                cell.addEventListener('mouseenter', (e) => this.handleCellHover(e));
                cell.addEventListener('mouseleave', (e) => this.handleCellLeave(e));
                
                mapContainer.appendChild(cell);
                this.cells[row][col] = {
                    element: cell,
                    attribute: 'grassland',
                    class: 'grassland',
                    row: row,
                    col: col,
                    playerId: null,
                    timestamp: Date.now()
                };
            }
        }
    }
    
    /**
     * Handle cell click with multiplayer support
     */
    handleCellClick(e) {
        if (!this.isConnected || this.gameState.status !== 'active') {
            // Fall back to single-player mode
            this.handleSinglePlayerClick(e);
            return;
        }
        
        if (this.isDragging || this.wasDragging) {
            this.wasDragging = false;
            return;
        }
        
        const cell = e.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Queue action for multiplayer
        const action = {
            type: this.selectedAttribute === 'erase' ? 'remove_building' : 'place_building',
            data: {
                row,
                col,
                attribute: this.selectedAttribute,
                class: this.selectedClass
            }
        };
        
        this.queueAction(action);
    }
    
    /**
     * Setup validation rules
     */
    setupValidationRules() {
        // Add custom validation rules here
        this.validationRules.set('place_building', this.validatePlaceBuilding.bind(this));
        this.validationRules.set('remove_building', this.validateRemoveBuilding.bind(this));
    }
    
    // Placeholder methods for compatibility
    setupEventListeners() { /* Implementation from original */ }
    updateStats() { /* Implementation from original */ }
    handleSinglePlayerClick(e) { /* Fallback implementation */ }
    isValidCell(row, col) { return row >= 0 && row < this.mapSize.rows && col >= 0 && col < this.mapSize.cols; }
    isValidAttribute(attribute) { return true; /* Add validation logic */ }
    isValidPlacement(row, col, attribute) { return true; /* Add placement rules */ }
    updateCellVisual(row, col, cell) { /* Update visual representation */ }
    getOriginalCellAttribute(row, col) { return 'grassland'; }
    validateRemoveBuilding(data) { return true; }
    validateResourceUpdate(data) { return true; }
    validateEndTurn(data) { return true; }
    applyResourceUpdate(data) { return true; }
    applyEndTurn(data) { return true; }
    handleActionFailure(action, reason) { /* Handle failed actions */ }
    rejectAction(action, reason) { /* Reject invalid actions */ }
    handleActionConflict(data) { /* Handle server conflicts */ }
    handleGameEnd(data) { /* Handle game end */ }
    handleDisconnection() { /* Handle disconnection */ }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiplayerMapSystem;
}

