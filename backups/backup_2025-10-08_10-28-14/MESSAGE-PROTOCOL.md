# Multiplayer City Builder - Message Protocol

## 📋 Overview

This document defines the message protocol for real-time communication between the City Builder Pro multiplayer client and server. The protocol supports both RESTful API calls and WebSocket events for different types of operations.

## 🔧 Protocol Specifications

### **Base Message Format**

All messages follow a consistent structure:

```typescript
interface BaseMessage {
    id: string;           // Unique message identifier
    type: string;         // Message type
    timestamp: number;    // Unix timestamp
    version: string;      // Protocol version
    data: any;           // Message payload
    metadata?: {         // Optional metadata
        source: string;   // 'client' | 'server'
        gameId?: string;  // Game identifier
        playerId?: string; // Player identifier
    };
}
```

### **Message Types**

#### **1. Player Actions**

##### **Place Building Action**
```typescript
interface PlaceBuildingMessage extends BaseMessage {
    type: 'place_building';
    data: {
        actionId: string;        // Unique action identifier
        playerId: string;        // Player performing action
        gameId: string;          // Game identifier
        cell: {
            row: number;         // Cell row
            col: number;         // Cell column
        };
        building: {
            attribute: string;   // Building type (road, residential, etc.)
            class: string;       // Building class
        };
        resources: {            // Resources required
            wood: number;
            ore: number;
            commercialGoods?: number;
            power?: number;
        };
        validation: {
            isValid: boolean;    // Pre-validation result
            rules: string[];     // Validation rules checked
        };
    };
}

// Example
{
    "id": "msg_123456789",
    "type": "place_building",
    "timestamp": 1703123456789,
    "version": "1.0.0",
    "data": {
        "actionId": "act_987654321",
        "playerId": "player_abc123",
        "gameId": "game_xyz789",
        "cell": {
            "row": 15,
            "col": 23
        },
        "building": {
            "attribute": "road",
            "class": "road"
        },
        "resources": {
            "wood": 4,
            "ore": 0
        },
        "validation": {
            "isValid": true,
            "rules": ["has_resources", "valid_placement", "not_occupied"]
        }
    },
    "metadata": {
        "source": "client",
        "gameId": "game_xyz789",
        "playerId": "player_abc123"
    }
}
```

##### **Remove Building Action**
```typescript
interface RemoveBuildingMessage extends BaseMessage {
    type: 'remove_building';
    data: {
        actionId: string;
        playerId: string;
        gameId: string;
        cell: {
            row: number;
            col: number;
        };
        refund: {              // Resources to refund
            wood: number;
            ore: number;
            commercialGoods?: number;
            power?: number;
        };
        reason: 'erase' | 'upgrade' | 'demolish';
    };
}
```

##### **Action Response**
```typescript
interface ActionResponseMessage extends BaseMessage {
    type: 'action_response';
    data: {
        actionId: string;
        status: 'success' | 'failed' | 'conflict' | 'queued';
        result?: {
            newCellState: {
                row: number;
                col: number;
                attribute: string;
                class: string;
                playerId: string;
                timestamp: number;
            };
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

interface ConflictInfo {
    type: 'cell_conflict' | 'resource_conflict' | 'turn_conflict';
    conflictingActionId: string;
    conflictingPlayerId: string;
    resolution: 'first_wins' | 'rejected' | 'queued';
}
```

#### **2. Resource Updates**

##### **Resource Change**
```typescript
interface ResourceUpdateMessage extends BaseMessage {
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

// Example
{
    "id": "msg_123456790",
    "type": "resource_update",
    "timestamp": 1703123456790,
    "version": "1.0.0",
    "data": {
        "playerId": "player_abc123",
        "gameId": "game_xyz789",
        "changes": {
            "wood": {
                "old": 30,
                "new": 26,
                "delta": -4,
                "reason": "building_cost"
            }
        },
        "totalResources": {
            "wood": 26,
            "ore": 10,
            "commercialGoods": 0,
            "power": 0
        }
    }
}
```

##### **Resource Generation**
```typescript
interface ResourceGenerationMessage extends BaseMessage {
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
```

#### **3. Map Changes**

##### **Map Update**
```typescript
interface MapUpdateMessage extends BaseMessage {
    type: 'map_update';
    data: {
        gameId: string;
        changes: {
            added: CellChange[];
            modified: CellChange[];
            removed: CellChange[];
        };
        fullUpdate?: boolean;  // If true, replace entire map
        mapState?: CellState[];
    };
}

interface CellChange {
    row: number;
    col: number;
    oldState?: CellState;
    newState: CellState;
    timestamp: number;
    playerId: string;
}

interface CellState {
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
```

##### **Map Sync Request**
```typescript
interface MapSyncRequestMessage extends BaseMessage {
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

interface MapSyncResponseMessage extends BaseMessage {
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
```

#### **4. Player Status Updates**

##### **Player Join**
```typescript
interface PlayerJoinMessage extends BaseMessage {
    type: 'player_join';
    data: {
        gameId: string;
        player: {
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
        };
        gameState: {
            status: 'waiting' | 'starting' | 'active' | 'paused' | 'finished';
            currentTurn: number;
            turnOrder: string[];
        };
    };
}
```

##### **Player Leave**
```typescript
interface PlayerLeaveMessage extends BaseMessage {
    type: 'player_leave';
    data: {
        gameId: string;
        playerId: string;
        username: string;
        reason: 'disconnect' | 'kick' | 'quit' | 'timeout';
        newHost?: string;  // If host left, who is new host
    };
}
```

##### **Player Ready Toggle**
```typescript
interface PlayerReadyMessage extends BaseMessage {
    type: 'player_ready';
    data: {
        gameId: string;
        playerId: string;
        isReady: boolean;
        allPlayersReady: boolean;
    };
}
```

##### **Turn Change**
```typescript
interface TurnChangeMessage extends BaseMessage {
    type: 'turn_change';
    data: {
        gameId: string;
        previousPlayer: string;
        currentPlayer: string;
        turnNumber: number;
        turnStartTime: number;
        turnDuration: number;  // -1 for unlimited
        actionsRemaining?: number;
    };
}
```

#### **5. Game Events**

##### **Game Start**
```typescript
interface GameStartMessage extends BaseMessage {
    type: 'game_start';
    data: {
        gameId: string;
        gameSettings: {
            mapSize: { rows: number; cols: number };
            maxPlayers: number;
            victoryCondition: 'score' | 'population' | 'time' | 'resources';
            timeLimit?: number;
            resourceMultiplier: number;
        };
        players: PlayerInfo[];
        initialMap: CellState[];
        turnOrder: string[];
    };
}

interface PlayerInfo {
    id: string;
    username: string;
    color: string;
    isHost: boolean;
    startingResources: {
        wood: number;
        ore: number;
        commercialGoods: number;
        power: number;
    };
}
```

##### **Game End**
```typescript
interface GameEndMessage extends BaseMessage {
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
```

##### **Victory Condition Met**
```typescript
interface VictoryMessage extends BaseMessage {
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
```

##### **Game Pause/Resume**
```typescript
interface GamePauseMessage extends BaseMessage {
    type: 'game_pause';
    data: {
        gameId: string;
        pausedBy: string;
        reason: 'host_pause' | 'player_request' | 'technical';
        pauseTime: number;
        estimatedResumeTime?: number;
    };
}

interface GameResumeMessage extends BaseMessage {
    type: 'game_resume';
    data: {
        gameId: string;
        resumedBy: string;
        pauseDuration: number;
        currentTurn: string;
    };
}
```

## 🔌 WebSocket Events

### **Client → Server Events**

```typescript
// Action events
socket.emit('place_building', PlaceBuildingMessage);
socket.emit('remove_building', RemoveBuildingMessage);
socket.emit('end_turn', { gameId: string, playerId: string });

// Game events
socket.emit('join_game', { roomCode: string, password?: string });
socket.emit('leave_game', { gameId: string });
socket.emit('toggle_ready', { gameId: string, isReady: boolean });
socket.emit('start_game', { gameId: string });

// Chat events
socket.emit('chat_message', {
    gameId: string;
    message: string;
    type: 'chat' | 'system' | 'action';
});

// Sync events
socket.emit('map_sync_request', MapSyncRequestMessage);
socket.emit('ping', { timestamp: number });
```

### **Server → Client Events**

```typescript
// Action responses
socket.on('action_response', ActionResponseMessage);
socket.on('action_conflict', ConflictInfo);

// Game state updates
socket.on('game_state', { game: GameState });
socket.on('player_joined', PlayerJoinMessage);
socket.on('player_left', PlayerLeaveMessage);
socket.on('player_ready_toggled', PlayerReadyMessage);
socket.on('turn_change', TurnChangeMessage);

// Map updates
socket.on('map_update', MapUpdateMessage);
socket.on('map_sync_response', MapSyncResponseMessage);

// Game events
socket.on('game_started', GameStartMessage);
socket.on('game_ended', GameEndMessage);
socket.on('victory', VictoryMessage);
socket.on('game_paused', GamePauseMessage);
socket.on('game_resumed', GameResumeMessage);

// Resource updates
socket.on('resource_update', ResourceUpdateMessage);
socket.on('resource_generation', ResourceGenerationMessage);

// Chat events
socket.on('chat_message_broadcast', {
    playerId: string;
    username: string;
    message: string;
    timestamp: number;
    type: string;
});

// System events
socket.on('pong', { timestamp: number, latency: number });
socket.on('error', { code: string, message: string, details?: any });
socket.on('disconnect', { reason: string });
```

## 📡 REST API Endpoints

### **Game Management**
```typescript
// Create game
POST /api/game/create
Body: {
    name: string;
    description?: string;
    maxPlayers: number;
    isPrivate: boolean;
    password?: string;
    gameSettings: GameSettings;
}

// Join game
POST /api/game/join/:roomCode
Body: {
    password?: string;
}

// Leave game
POST /api/game/leave/:roomCode

// Get game state
GET /api/game/:roomCode

// Update game settings (host only)
PUT /api/game/:roomCode/settings
Body: {
    name?: string;
    description?: string;
    maxPlayers?: number;
    gameSettings?: Partial<GameSettings>;
}
```

### **Player Management**
```typescript
// Get player profile
GET /api/user/profile

// Update player profile
PUT /api/user/profile
Body: {
    displayName?: string;
    preferences?: PlayerPreferences;
}

// Get player statistics
GET /api/user/stats

// Get leaderboard
GET /api/user/leaderboard?type=score&limit=10
```

## 🔒 Security Considerations

### **Message Validation**
- All messages must include valid authentication tokens
- Server validates all action data before processing
- Rate limiting on action messages to prevent spam
- Input sanitization for all text fields

### **Cheat Prevention**
- Server is authoritative source for game state
- All actions validated server-side
- Resource changes tracked and verified
- Action timestamps validated for conflict resolution

### **Error Handling**
```typescript
interface ErrorMessage extends BaseMessage {
    type: 'error';
    data: {
        code: string;
        message: string;
        details?: any;
        retryable: boolean;
        retryAfter?: number;
    };
}
```

## 📊 Performance Optimizations

### **Message Batching**
```typescript
interface BatchedMessage extends BaseMessage {
    type: 'batch';
    data: {
        messages: BaseMessage[];
        batchId: string;
    };
}
```

### **Delta Updates**
- Only send changed data in map updates
- Compress large messages
- Use binary format for frequent updates

### **Connection Management**
- Heartbeat/ping-pong for connection health
- Automatic reconnection with state recovery
- Graceful degradation for poor connections

This protocol provides a comprehensive foundation for real-time multiplayer city building with robust error handling, security, and performance optimizations!

