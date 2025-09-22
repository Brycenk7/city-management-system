/**
 * TypeScript definitions for Multiplayer City Builder Message Protocol
 */

// ==================== BASE TYPES ====================

export interface BaseMessage {
    id: string;
    type: string;
    timestamp: number;
    version: string;
    data: any;
    metadata?: {
        source: 'client' | 'server';
        gameId?: string;
        playerId?: string;
    };
}

export interface CellState {
    row: number;
    col: number;
    attribute: string;
    class: string;
    playerId: string | null;
    timestamp: number;
    metadata?: {
        powerConnected: boolean;
        resourceConnected: boolean;
        efficiency: number;
    };
}

export interface PlayerInfo {
    id: string;
    username: string;
    displayName: string;
    color: string;
    isHost: boolean;
    isReady: boolean;
    resources: {
        wood: number;
        ore: number;
        commercialGoods: number;
        power: number;
    };
    score: number;
    lastAction: number | null;
}

export interface GameSettings {
    mapSize: { rows: number; cols: number };
    maxPlayers: number;
    victoryCondition: 'score' | 'population' | 'time' | 'resources';
    timeLimit?: number;
    resourceMultiplier: number;
}

// ==================== PLAYER ACTIONS ====================

export interface PlaceBuildingMessage extends BaseMessage {
    type: 'place_building';
    data: {
        actionId: string;
        playerId: string;
        gameId: string;
        cell: {
            row: number;
            col: number;
        };
        building: {
            attribute: string;
            class: string;
        };
        resources: {
            wood: number;
            ore: number;
            commercialGoods?: number;
            power?: number;
        };
        validation: {
            isValid: boolean;
            rules: string[];
        };
    };
}

export interface RemoveBuildingMessage extends BaseMessage {
    type: 'remove_building';
    data: {
        actionId: string;
        playerId: string;
        gameId: string;
        cell: {
            row: number;
            col: number;
        };
        refund: {
            wood: number;
            ore: number;
            commercialGoods?: number;
            power?: number;
        };
        reason: 'erase' | 'upgrade' | 'demolish';
    };
}

export interface ActionResponseMessage extends BaseMessage {
    type: 'action_response';
    data: {
        actionId: string;
        status: 'success' | 'failed' | 'conflict' | 'queued';
        result?: {
            newCellState: CellState;
            resourceUpdate: {
                playerId: string;
                resources: {
                    wood: number;
                    ore: number;
                    commercialGoods: number;
                    power: number;
                };
            };
        };
        error?: {
            code: string;
            message: string;
            details?: any;
        };
        conflicts?: ConflictInfo[];
    };
}

export interface ConflictInfo {
    type: 'cell_conflict' | 'resource_conflict' | 'turn_conflict';
    conflictingActionId: string;
    conflictingPlayerId: string;
    resolution: 'first_wins' | 'rejected' | 'queued';
}

// ==================== RESOURCE UPDATES ====================

export interface ResourceUpdateMessage extends BaseMessage {
    type: 'resource_update';
    data: {
        playerId: string;
        gameId: string;
        changes: {
            wood?: {
                old: number;
                new: number;
                delta: number;
                reason: 'building_cost' | 'generation' | 'refund' | 'trade';
            };
            ore?: {
                old: number;
                new: number;
                delta: number;
                reason: 'building_cost' | 'generation' | 'refund' | 'trade';
            };
            commercialGoods?: {
                old: number;
                new: number;
                delta: number;
                reason: 'production' | 'consumption' | 'trade';
            };
            power?: {
                old: number;
                new: number;
                delta: number;
                reason: 'generation' | 'consumption' | 'trade';
            };
        };
        totalResources: {
            wood: number;
            ore: number;
            commercialGoods: number;
            power: number;
        };
    };
}

export interface ResourceGenerationMessage extends BaseMessage {
    type: 'resource_generation';
    data: {
        gameId: string;
        generationRates: {
            [playerId: string]: {
                wood: number;
                ore: number;
                commercialGoods: number;
                power: number;
            };
        };
        buildings: {
            [playerId: string]: {
                lumberYards: number;
                miningOutposts: number;
                powerPlants: number;
                industrialZones: number;
            };
        };
    };
}

// ==================== MAP CHANGES ====================

export interface MapUpdateMessage extends BaseMessage {
    type: 'map_update';
    data: {
        gameId: string;
        changes: {
            added: CellChange[];
            modified: CellChange[];
            removed: CellChange[];
        };
        fullUpdate?: boolean;
        mapState?: CellState[];
    };
}

export interface CellChange {
    row: number;
    col: number;
    oldState?: CellState;
    newState: CellState;
    timestamp: number;
    playerId: string;
}

export interface MapSyncRequestMessage extends BaseMessage {
    type: 'map_sync_request';
    data: {
        playerId: string;
        gameId: string;
        lastSyncTimestamp: number;
        requestedCells?: {
            row: number;
            col: number;
        }[];
    };
}

export interface MapSyncResponseMessage extends BaseMessage {
    type: 'map_sync_response';
    data: {
        gameId: string;
        syncTimestamp: number;
        cells: CellState[];
        conflicts?: {
            cell: { row: number; col: number };
            localState: CellState;
            serverState: CellState;
            resolution: 'server_wins' | 'client_wins' | 'merge';
        }[];
    };
}

// ==================== PLAYER STATUS UPDATES ====================

export interface PlayerJoinMessage extends BaseMessage {
    type: 'player_join';
    data: {
        gameId: string;
        player: PlayerInfo;
        gameState: {
            status: 'waiting' | 'starting' | 'active' | 'paused' | 'finished';
            currentTurn: number;
            turnOrder: string[];
        };
    };
}

export interface PlayerLeaveMessage extends BaseMessage {
    type: 'player_leave';
    data: {
        gameId: string;
        playerId: string;
        username: string;
        reason: 'disconnect' | 'kick' | 'quit' | 'timeout';
        newHost?: string;
    };
}

export interface PlayerReadyMessage extends BaseMessage {
    type: 'player_ready';
    data: {
        gameId: string;
        playerId: string;
        isReady: boolean;
        allPlayersReady: boolean;
    };
}

export interface TurnChangeMessage extends BaseMessage {
    type: 'turn_change';
    data: {
        gameId: string;
        previousPlayer: string;
        currentPlayer: string;
        turnNumber: number;
        turnStartTime: number;
        turnDuration: number;
        actionsRemaining?: number;
    };
}

// ==================== GAME EVENTS ====================

export interface GameStartMessage extends BaseMessage {
    type: 'game_start';
    data: {
        gameId: string;
        gameSettings: GameSettings;
        players: PlayerInfo[];
        initialMap: CellState[];
        turnOrder: string[];
    };
}

export interface GameEndMessage extends BaseMessage {
    type: 'game_end';
    data: {
        gameId: string;
        reason: 'victory' | 'timeout' | 'all_quit' | 'host_ended';
        winner?: string;
        finalScores: {
            [playerId: string]: {
                score: number;
                buildings: number;
                resources: {
                    wood: number;
                    ore: number;
                    commercialGoods: number;
                    power: number;
                };
                efficiency: number;
            };
        };
        gameStats: {
            duration: number;
            totalActions: number;
            averageActionTime: number;
        };
    };
}

export interface VictoryMessage extends BaseMessage {
    type: 'victory';
    data: {
        gameId: string;
        winner: string;
        condition: 'score' | 'population' | 'resources';
        value: number;
        threshold: number;
        finalStats: {
            score: number;
            buildings: number;
            efficiency: number;
        };
    };
}

export interface GamePauseMessage extends BaseMessage {
    type: 'game_pause';
    data: {
        gameId: string;
        pausedBy: string;
        reason: 'host_pause' | 'player_request' | 'technical';
        pauseTime: number;
        estimatedResumeTime?: number;
    };
}

export interface GameResumeMessage extends BaseMessage {
    type: 'game_resume';
    data: {
        gameId: string;
        resumedBy: string;
        pauseDuration: number;
        currentTurn: string;
    };
}

// ==================== CHAT MESSAGES ====================

export interface ChatMessage extends BaseMessage {
    type: 'chat_message';
    data: {
        gameId: string;
        playerId: string;
        username: string;
        message: string;
        type: 'chat' | 'system' | 'action';
        timestamp: number;
    };
}

// ==================== SYSTEM MESSAGES ====================

export interface PingMessage extends BaseMessage {
    type: 'ping';
    data: {
        timestamp: number;
    };
}

export interface PongMessage extends BaseMessage {
    type: 'pong';
    data: {
        timestamp: number;
        pingTimestamp: number;
        latency: number;
    };
}

export interface ErrorMessage extends BaseMessage {
    type: 'error';
    data: {
        code: string;
        message: string;
        details?: any;
        retryable: boolean;
        retryAfter?: number;
    };
}

export interface BatchedMessage extends BaseMessage {
    type: 'batch';
    data: {
        messages: BaseMessage[];
        batchId: string;
    };
}

// ==================== UNION TYPES ====================

export type GameMessage = 
    | PlaceBuildingMessage
    | RemoveBuildingMessage
    | ActionResponseMessage
    | ResourceUpdateMessage
    | ResourceGenerationMessage
    | MapUpdateMessage
    | MapSyncRequestMessage
    | MapSyncResponseMessage
    | PlayerJoinMessage
    | PlayerLeaveMessage
    | PlayerReadyMessage
    | TurnChangeMessage
    | GameStartMessage
    | GameEndMessage
    | VictoryMessage
    | GamePauseMessage
    | GameResumeMessage
    | ChatMessage
    | PingMessage
    | PongMessage
    | ErrorMessage
    | BatchedMessage;

// ==================== MESSAGE PROCESSING ====================

export interface MessageValidationResult {
    valid: boolean;
    error: string | null;
}

export interface MessageProcessingResult {
    success: boolean;
    error?: string;
    message?: BaseMessage;
    action?: string;
    data?: any;
}

export interface PendingMessage {
    message: BaseMessage;
    timestamp: number;
    processed: boolean;
}

// ==================== CLASS INTERFACES ====================

export interface IMessageProtocol {
    version: string;
    messageIdCounter: number;
    pendingMessages: Map<string, PendingMessage>;
    
    createBaseMessage(type: string, data: any, metadata?: any): BaseMessage;
    generateMessageId(): string;
    generateActionId(): string;
    
    // Message creation methods
    createPlaceBuildingMessage(
        playerId: string, 
        gameId: string, 
        row: number, 
        col: number, 
        attribute: string, 
        classType: string, 
        resources: any, 
        validation: any
    ): PlaceBuildingMessage;
    
    createRemoveBuildingMessage(
        playerId: string, 
        gameId: string, 
        row: number, 
        col: number, 
        refund: any, 
        reason?: string
    ): RemoveBuildingMessage;
    
    createResourceUpdateMessage(
        playerId: string, 
        gameId: string, 
        changes: any, 
        totalResources: any
    ): ResourceUpdateMessage;
    
    createMapUpdateMessage(
        gameId: string, 
        changes: any, 
        fullUpdate?: boolean, 
        mapState?: CellState[]
    ): MapUpdateMessage;
    
    createPlayerJoinMessage(
        gameId: string, 
        player: PlayerInfo, 
        gameState: any
    ): PlayerJoinMessage;
    
    createGameStartMessage(
        gameId: string, 
        gameSettings: GameSettings, 
        players: PlayerInfo[], 
        initialMap: CellState[], 
        turnOrder: string[]
    ): GameStartMessage;
    
    createChatMessage(
        gameId: string, 
        playerId: string, 
        username: string, 
        message: string, 
        type?: string
    ): ChatMessage;
    
    // Validation and processing
    validateMessage(message: BaseMessage): MessageValidationResult;
    processMessage(message: BaseMessage, callback: (result: MessageProcessingResult) => void): void;
    
    // Utility methods
    markMessageProcessed(messageId: string): void;
    getPendingMessages(): PendingMessage[];
    clearOldPendingMessages(maxAge?: number): void;
    createBatchedMessage(messages: BaseMessage[]): BatchedMessage;
    extractBatchedMessages(batchedMessage: BatchedMessage): BaseMessage[];
}

export interface ISocketMessageHandler {
    socket: any;
    protocol: IMessageProtocol;
    
    setupEventListeners(): void;
    handleMessage(result: MessageProcessingResult): void;
    
    // Send message methods
    sendPlaceBuilding(
        playerId: string, 
        gameId: string, 
        row: number, 
        col: number, 
        attribute: string, 
        classType: string, 
        resources: any, 
        validation: any
    ): string;
    
    sendRemoveBuilding(
        playerId: string, 
        gameId: string, 
        row: number, 
        col: number, 
        refund: any, 
        reason?: string
    ): string;
    
    sendChatMessage(
        gameId: string, 
        playerId: string, 
        username: string, 
        message: string, 
        type?: string
    ): string;
    
    sendPing(): string;
}

