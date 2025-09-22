/**
 * Multiplayer City Builder - Message Protocol Implementation
 * 
 * This file contains the JavaScript implementation of the message protocol
 * for real-time communication between client and server.
 */

class MessageProtocol {
    constructor() {
        this.version = '1.0.0';
        this.messageIdCounter = 0;
        this.pendingMessages = new Map();
    }

    // ==================== MESSAGE CREATION ====================

    /**
     * Create a base message with common fields
     */
    createBaseMessage(type, data, metadata = {}) {
        return {
            id: this.generateMessageId(),
            type: type,
            timestamp: Date.now(),
            version: this.version,
            data: data,
            metadata: {
                source: 'client',
                ...metadata
            }
        };
    }

    /**
     * Generate unique message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${++this.messageIdCounter}`;
    }

    // ==================== PLAYER ACTIONS ====================

    /**
     * Create place building message
     */
    createPlaceBuildingMessage(playerId, gameId, row, col, attribute, classType, resources, validation) {
        return this.createBaseMessage('place_building', {
            actionId: this.generateActionId(),
            playerId: playerId,
            gameId: gameId,
            cell: {
                row: row,
                col: col
            },
            building: {
                attribute: attribute,
                class: classType
            },
            resources: resources,
            validation: validation
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    /**
     * Create remove building message
     */
    createRemoveBuildingMessage(playerId, gameId, row, col, refund, reason = 'erase') {
        return this.createBaseMessage('remove_building', {
            actionId: this.generateActionId(),
            playerId: playerId,
            gameId: gameId,
            cell: {
                row: row,
                col: col
            },
            refund: refund,
            reason: reason
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    /**
     * Create action response message
     */
    createActionResponseMessage(actionId, status, result = null, error = null, conflicts = []) {
        return this.createBaseMessage('action_response', {
            actionId: actionId,
            status: status,
            result: result,
            error: error,
            conflicts: conflicts
        });
    }

    /**
     * Generate unique action ID
     */
    generateActionId() {
        return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ==================== RESOURCE UPDATES ====================

    /**
     * Create resource update message
     */
    createResourceUpdateMessage(playerId, gameId, changes, totalResources) {
        return this.createBaseMessage('resource_update', {
            playerId: playerId,
            gameId: gameId,
            changes: changes,
            totalResources: totalResources
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    /**
     * Create resource generation message
     */
    createResourceGenerationMessage(gameId, generationRates, buildings) {
        return this.createBaseMessage('resource_generation', {
            gameId: gameId,
            generationRates: generationRates,
            buildings: buildings
        }, {
            gameId: gameId
        });
    }

    // ==================== MAP CHANGES ====================

    /**
     * Create map update message
     */
    createMapUpdateMessage(gameId, changes, fullUpdate = false, mapState = null) {
        return this.createBaseMessage('map_update', {
            gameId: gameId,
            changes: changes,
            fullUpdate: fullUpdate,
            mapState: mapState
        }, {
            gameId: gameId
        });
    }

    /**
     * Create map sync request message
     */
    createMapSyncRequestMessage(playerId, gameId, lastSyncTimestamp, requestedCells = null) {
        return this.createBaseMessage('map_sync_request', {
            playerId: playerId,
            gameId: gameId,
            lastSyncTimestamp: lastSyncTimestamp,
            requestedCells: requestedCells
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    /**
     * Create map sync response message
     */
    createMapSyncResponseMessage(gameId, syncTimestamp, cells, conflicts = []) {
        return this.createBaseMessage('map_sync_response', {
            gameId: gameId,
            syncTimestamp: syncTimestamp,
            cells: cells,
            conflicts: conflicts
        }, {
            gameId: gameId
        });
    }

    // ==================== PLAYER STATUS UPDATES ====================

    /**
     * Create player join message
     */
    createPlayerJoinMessage(gameId, player, gameState) {
        return this.createBaseMessage('player_join', {
            gameId: gameId,
            player: player,
            gameState: gameState
        }, {
            gameId: gameId,
            playerId: player.id
        });
    }

    /**
     * Create player leave message
     */
    createPlayerLeaveMessage(gameId, playerId, username, reason, newHost = null) {
        return this.createBaseMessage('player_leave', {
            gameId: gameId,
            playerId: playerId,
            username: username,
            reason: reason,
            newHost: newHost
        }, {
            gameId: gameId
        });
    }

    /**
     * Create player ready message
     */
    createPlayerReadyMessage(gameId, playerId, isReady, allPlayersReady) {
        return this.createBaseMessage('player_ready', {
            gameId: gameId,
            playerId: playerId,
            isReady: isReady,
            allPlayersReady: allPlayersReady
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    /**
     * Create turn change message
     */
    createTurnChangeMessage(gameId, previousPlayer, currentPlayer, turnNumber, turnStartTime, turnDuration, actionsRemaining = null) {
        return this.createBaseMessage('turn_change', {
            gameId: gameId,
            previousPlayer: previousPlayer,
            currentPlayer: currentPlayer,
            turnNumber: turnNumber,
            turnStartTime: turnStartTime,
            turnDuration: turnDuration,
            actionsRemaining: actionsRemaining
        }, {
            gameId: gameId
        });
    }

    // ==================== GAME EVENTS ====================

    /**
     * Create game start message
     */
    createGameStartMessage(gameId, gameSettings, players, initialMap, turnOrder) {
        return this.createBaseMessage('game_start', {
            gameId: gameId,
            gameSettings: gameSettings,
            players: players,
            initialMap: initialMap,
            turnOrder: turnOrder
        }, {
            gameId: gameId
        });
    }

    /**
     * Create game end message
     */
    createGameEndMessage(gameId, reason, winner = null, finalScores = {}, gameStats = {}) {
        return this.createBaseMessage('game_end', {
            gameId: gameId,
            reason: reason,
            winner: winner,
            finalScores: finalScores,
            gameStats: gameStats
        }, {
            gameId: gameId
        });
    }

    /**
     * Create victory message
     */
    createVictoryMessage(gameId, winner, condition, value, threshold, finalStats) {
        return this.createBaseMessage('victory', {
            gameId: gameId,
            winner: winner,
            condition: condition,
            value: value,
            threshold: threshold,
            finalStats: finalStats
        }, {
            gameId: gameId
        });
    }

    /**
     * Create game pause message
     */
    createGamePauseMessage(gameId, pausedBy, reason, pauseTime, estimatedResumeTime = null) {
        return this.createBaseMessage('game_pause', {
            gameId: gameId,
            pausedBy: pausedBy,
            reason: reason,
            pauseTime: pauseTime,
            estimatedResumeTime: estimatedResumeTime
        }, {
            gameId: gameId
        });
    }

    /**
     * Create game resume message
     */
    createGameResumeMessage(gameId, resumedBy, pauseDuration, currentTurn) {
        return this.createBaseMessage('game_resume', {
            gameId: gameId,
            resumedBy: resumedBy,
            pauseDuration: pauseDuration,
            currentTurn: currentTurn
        }, {
            gameId: gameId
        });
    }

    // ==================== CHAT MESSAGES ====================

    /**
     * Create chat message
     */
    createChatMessage(gameId, playerId, username, message, type = 'chat') {
        return this.createBaseMessage('chat_message', {
            gameId: gameId,
            playerId: playerId,
            username: username,
            message: message,
            type: type,
            timestamp: Date.now()
        }, {
            gameId: gameId,
            playerId: playerId
        });
    }

    // ==================== SYSTEM MESSAGES ====================

    /**
     * Create ping message
     */
    createPingMessage() {
        return this.createBaseMessage('ping', {
            timestamp: Date.now()
        });
    }

    /**
     * Create pong message
     */
    createPongMessage(pingTimestamp) {
        return this.createBaseMessage('pong', {
            timestamp: Date.now(),
            pingTimestamp: pingTimestamp,
            latency: Date.now() - pingTimestamp
        });
    }

    /**
     * Create error message
     */
    createErrorMessage(code, message, details = null, retryable = false, retryAfter = null) {
        return this.createBaseMessage('error', {
            code: code,
            message: message,
            details: details,
            retryable: retryable,
            retryAfter: retryAfter
        });
    }

    // ==================== MESSAGE VALIDATION ====================

    /**
     * Validate message structure
     */
    validateMessage(message) {
        const requiredFields = ['id', 'type', 'timestamp', 'version', 'data'];
        
        for (const field of requiredFields) {
            if (!(field in message)) {
                return {
                    valid: false,
                    error: `Missing required field: ${field}`
                };
            }
        }

        // Validate message type
        const validTypes = [
            'place_building', 'remove_building', 'action_response',
            'resource_update', 'resource_generation',
            'map_update', 'map_sync_request', 'map_sync_response',
            'player_join', 'player_leave', 'player_ready', 'turn_change',
            'game_start', 'game_end', 'victory', 'game_pause', 'game_resume',
            'chat_message', 'ping', 'pong', 'error'
        ];

        if (!validTypes.includes(message.type)) {
            return {
                valid: false,
                error: `Invalid message type: ${message.type}`
            };
        }

        // Validate timestamp
        if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
            return {
                valid: false,
                error: 'Invalid timestamp'
            };
        }

        return {
            valid: true,
            error: null
        };
    }

    // ==================== MESSAGE PROCESSING ====================

    /**
     * Process incoming message
     */
    processMessage(message, callback) {
        const validation = this.validateMessage(message);
        
        if (!validation.valid) {
            callback({
                success: false,
                error: validation.error,
                message: message
            });
            return;
        }

        // Add to pending messages for tracking
        this.pendingMessages.set(message.id, {
            message: message,
            timestamp: Date.now(),
            processed: false
        });

        // Process based on message type
        try {
            switch (message.type) {
                case 'place_building':
                    this.processPlaceBuildingMessage(message, callback);
                    break;
                case 'remove_building':
                    this.processRemoveBuildingMessage(message, callback);
                    break;
                case 'action_response':
                    this.processActionResponseMessage(message, callback);
                    break;
                case 'resource_update':
                    this.processResourceUpdateMessage(message, callback);
                    break;
                case 'map_update':
                    this.processMapUpdateMessage(message, callback);
                    break;
                case 'player_join':
                    this.processPlayerJoinMessage(message, callback);
                    break;
                case 'player_leave':
                    this.processPlayerLeaveMessage(message, callback);
                    break;
                case 'game_start':
                    this.processGameStartMessage(message, callback);
                    break;
                case 'game_end':
                    this.processGameEndMessage(message, callback);
                    break;
                case 'chat_message':
                    this.processChatMessage(message, callback);
                    break;
                case 'ping':
                    this.processPingMessage(message, callback);
                    break;
                case 'pong':
                    this.processPongMessage(message, callback);
                    break;
                case 'error':
                    this.processErrorMessage(message, callback);
                    break;
                default:
                    callback({
                        success: false,
                        error: `Unknown message type: ${message.type}`,
                        message: message
                    });
            }
        } catch (error) {
            callback({
                success: false,
                error: `Error processing message: ${error.message}`,
                message: message
            });
        }
    }

    // ==================== MESSAGE PROCESSORS ====================

    processPlaceBuildingMessage(message, callback) {
        // Validate required fields
        const requiredFields = ['actionId', 'playerId', 'gameId', 'cell', 'building', 'resources'];
        for (const field of requiredFields) {
            if (!(field in message.data)) {
                callback({
                    success: false,
                    error: `Missing required field in place_building: ${field}`,
                    message: message
                });
                return;
            }
        }

        // Mark as processed
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'place_building',
            data: message.data
        });
    }

    processRemoveBuildingMessage(message, callback) {
        // Similar validation for remove building
        const requiredFields = ['actionId', 'playerId', 'gameId', 'cell', 'refund'];
        for (const field of requiredFields) {
            if (!(field in message.data)) {
                callback({
                    success: false,
                    error: `Missing required field in remove_building: ${field}`,
                    message: message
                });
                return;
            }
        }

        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'remove_building',
            data: message.data
        });
    }

    processActionResponseMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'action_response',
            data: message.data
        });
    }

    processResourceUpdateMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'resource_update',
            data: message.data
        });
    }

    processMapUpdateMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'map_update',
            data: message.data
        });
    }

    processPlayerJoinMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'player_join',
            data: message.data
        });
    }

    processPlayerLeaveMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'player_leave',
            data: message.data
        });
    }

    processGameStartMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'game_start',
            data: message.data
        });
    }

    processGameEndMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'game_end',
            data: message.data
        });
    }

    processChatMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'chat_message',
            data: message.data
        });
    }

    processPingMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'ping',
            data: message.data
        });
    }

    processPongMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'pong',
            data: message.data
        });
    }

    processErrorMessage(message, callback) {
        this.markMessageProcessed(message.id);

        callback({
            success: true,
            message: message,
            action: 'error',
            data: message.data
        });
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Mark message as processed
     */
    markMessageProcessed(messageId) {
        if (this.pendingMessages.has(messageId)) {
            const pending = this.pendingMessages.get(messageId);
            pending.processed = true;
            this.pendingMessages.set(messageId, pending);
        }
    }

    /**
     * Get pending messages
     */
    getPendingMessages() {
        return Array.from(this.pendingMessages.values())
            .filter(pending => !pending.processed);
    }

    /**
     * Clear old pending messages
     */
    clearOldPendingMessages(maxAge = 300000) { // 5 minutes
        const now = Date.now();
        for (const [messageId, pending] of this.pendingMessages.entries()) {
            if (now - pending.timestamp > maxAge) {
                this.pendingMessages.delete(messageId);
            }
        }
    }

    /**
     * Create batched message
     */
    createBatchedMessage(messages) {
        return this.createBaseMessage('batch', {
            messages: messages,
            batchId: this.generateMessageId()
        });
    }

    /**
     * Extract messages from batch
     */
    extractBatchedMessages(batchedMessage) {
        if (batchedMessage.type !== 'batch' || !Array.isArray(batchedMessage.data.messages)) {
            return [];
        }
        return batchedMessage.data.messages;
    }
}

// ==================== SOCKET.IO INTEGRATION ====================

class SocketMessageHandler {
    constructor(socket, messageProtocol) {
        this.socket = socket;
        this.protocol = messageProtocol;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for all message types
        const messageTypes = [
            'place_building', 'remove_building', 'action_response',
            'resource_update', 'resource_generation',
            'map_update', 'map_sync_request', 'map_sync_response',
            'player_join', 'player_leave', 'player_ready', 'turn_change',
            'game_start', 'game_end', 'victory', 'game_pause', 'game_resume',
            'chat_message', 'ping', 'pong', 'error'
        ];

        messageTypes.forEach(type => {
            this.socket.on(type, (message) => {
                this.protocol.processMessage(message, (result) => {
                    if (result.success) {
                        this.handleMessage(result);
                    } else {
                        console.error('Message processing failed:', result.error);
                    }
                });
            });
        });

        // Handle batched messages
        this.socket.on('batch', (batchedMessage) => {
            const messages = this.protocol.extractBatchedMessages(batchedMessage);
            messages.forEach(message => {
                this.protocol.processMessage(message, (result) => {
                    if (result.success) {
                        this.handleMessage(result);
                    }
                });
            });
        });
    }

    handleMessage(result) {
        // Emit custom events based on message type
        this.socket.emit('message_processed', {
            type: result.action,
            data: result.data,
            message: result.message
        });
    }

    // Send message methods
    sendPlaceBuilding(playerId, gameId, row, col, attribute, classType, resources, validation) {
        const message = this.protocol.createPlaceBuildingMessage(
            playerId, gameId, row, col, attribute, classType, resources, validation
        );
        this.socket.emit('place_building', message);
        return message.id;
    }

    sendRemoveBuilding(playerId, gameId, row, col, refund, reason) {
        const message = this.protocol.createRemoveBuildingMessage(
            playerId, gameId, row, col, refund, reason
        );
        this.socket.emit('remove_building', message);
        return message.id;
    }

    sendChatMessage(gameId, playerId, username, message, type) {
        const chatMessage = this.protocol.createChatMessage(
            gameId, playerId, username, message, type
        );
        this.socket.emit('chat_message', chatMessage);
        return chatMessage.id;
    }

    sendPing() {
        const message = this.protocol.createPingMessage();
        this.socket.emit('ping', message);
        return message.id;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MessageProtocol, SocketMessageHandler };
} else {
    window.MessageProtocol = MessageProtocol;
    window.SocketMessageHandler = SocketMessageHandler;
}

