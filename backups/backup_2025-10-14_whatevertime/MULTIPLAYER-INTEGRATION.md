# Multiplayer Integration Guide

This guide explains how to integrate the new MultiplayerMapSystem with your existing City Builder Pro game.

## 🔄 Migration Steps

### 1. Replace MapSystem with MultiplayerMapSystem

```javascript
// In your main script.js, replace:
// const mapSystem = new MapSystem();

// With:
const mapSystem = new MultiplayerMapSystem({
    mapSize: { rows: 60, cols: 60 },
    conflictResolution: {
        mode: 'turn-based', // or 'real-time'
        enabled: true
    }
});
```

### 2. Add Socket.io Client

Add to your HTML:
```html
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
```

### 3. Initialize Multiplayer Connection

```javascript
// Initialize Socket.io connection
const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('authToken')
    }
});

// Connect MapSystem to server
mapSystem.connectToServer(socket);

// Set up event listeners
mapSystem.on('gameStateChange', (newState, oldState) => {
    console.log('Game state updated:', newState);
    updateUI(newState);
});

mapSystem.on('playerAction', (action) => {
    console.log('Action processed:', action);
});

mapSystem.on('actionRejected', (data) => {
    showError(`Action rejected: ${data.reason}`);
});

mapSystem.on('connectionChange', (data) => {
    if (data.connected) {
        showStatus('Connected to server');
    } else {
        showStatus('Disconnected from server');
    }
});
```

## 🎮 Game Modes

### Turn-Based Mode
```javascript
const mapSystem = new MultiplayerMapSystem({
    conflictResolution: {
        mode: 'turn-based',
        enabled: true
    }
});
```

**Features:**
- Players take turns
- Actions queued until player's turn
- No simultaneous conflicts
- Clear turn indicators

### Real-Time Mode
```javascript
const mapSystem = new MultiplayerMapSystem({
    conflictResolution: {
        mode: 'real-time',
        enabled: true,
        lockDuration: 5000 // 5 seconds
    }
});
```

**Features:**
- Simultaneous actions allowed
- Timestamp-based conflict resolution
- Faster gameplay
- More complex conflict handling

## 🔧 API Reference

### Core Methods

#### `initializeGameState(gameData)`
Initialize the game with server data.

```javascript
mapSystem.initializeGameState({
    id: 'game123',
    roomCode: 'ABC123',
    status: 'active',
    players: [...],
    gameState: {
        cells: [...],
        mapSize: { rows: 60, cols: 60 }
    }
});
```

#### `queueAction(action)`
Queue an action for processing.

```javascript
const actionId = mapSystem.queueAction({
    type: 'place_building',
    data: {
        row: 10,
        col: 15,
        attribute: 'road',
        class: 'road'
    }
});
```

#### `updateGameState(updates)`
Update game state with server changes.

```javascript
mapSystem.updateGameState({
    status: 'active',
    currentTurn: 1,
    players: updatedPlayers
});
```

### Action Types

#### Place Building
```javascript
{
    type: 'place_building',
    data: {
        row: number,
        col: number,
        attribute: string,
        class: string
    }
}
```

#### Remove Building
```javascript
{
    type: 'remove_building',
    data: {
        row: number,
        col: number
    }
}
```

#### Update Resources
```javascript
{
    type: 'update_resources',
    data: {
        wood: number,
        ore: number,
        commercialGoods: number,
        power: number
    }
}
```

#### End Turn
```javascript
{
    type: 'end_turn',
    data: {
        playerId: string
    }
}
```

### Event System

#### Available Events

- `gameStateChange` - Game state updated
- `playerAction` - Action processed successfully
- `actionQueued` - Action added to queue
- `actionRejected` - Action rejected
- `conflictDetected` - Conflict found
- `connectionChange` - Connection status changed

#### Event Usage

```javascript
// Listen for events
mapSystem.on('gameStateChange', (newState, oldState) => {
    updateGameUI(newState);
});

// Remove listeners
mapSystem.off('gameStateChange', callback);

// Emit custom events
mapSystem.emit('customEvent', data);
```

## 🛡️ Conflict Resolution

### Cell Conflicts
When two players try to place buildings on the same cell:

**Turn-Based Mode:**
- Only current player's actions are processed
- Other actions are queued

**Real-Time Mode:**
- First action wins (by timestamp)
- Conflicting actions are rejected

### Resource Conflicts
When a player doesn't have enough resources:

- Action is immediately rejected
- Error message shown to player
- No rollback needed

### Resolution Strategies

```javascript
// Custom conflict resolution
mapSystem.on('conflictDetected', (action, conflicts) => {
    if (conflicts.some(c => c.type === 'cell_conflict')) {
        // Handle cell conflicts
        showConflictWarning(action, conflicts);
    }
});
```

## 🔄 State Management

### Rollback System
The system automatically creates rollback points for:
- Before each action
- On state changes
- On conflicts

```javascript
// Manual rollback
const rollbackPoint = mapSystem.createRollbackPoint();
// ... perform actions
if (somethingWentWrong) {
    mapSystem.rollbackToPoint(rollbackPoint);
}

// Rollback to last stable state
mapSystem.rollbackToLastStable();
```

### State Validation
All actions are validated before processing:

```javascript
// Custom validation
mapSystem.validationRules.set('custom_action', (data) => {
    return data.customProperty === 'valid';
});
```

## 🎯 UI Integration

### Player List
```javascript
function updatePlayerList(gameState) {
    const playerList = document.getElementById('playerList');
    playerList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = `player ${player.id === mapSystem.currentPlayer.id ? 'current' : ''}`;
        playerElement.innerHTML = `
            <span class="player-name">${player.username}</span>
            <span class="player-score">${player.score}</span>
            <span class="player-resources">
                🪵${player.resources.wood} ⛏️${player.resources.ore}
            </span>
        `;
        playerList.appendChild(playerElement);
    });
}
```

### Turn Indicator
```javascript
function updateTurnIndicator(gameState) {
    const turnIndicator = document.getElementById('turnIndicator');
    const currentPlayer = gameState.players.get(gameState.turnOrder[gameState.currentTurn]);
    
    if (currentPlayer) {
        turnIndicator.textContent = `${currentPlayer.username}'s turn`;
        turnIndicator.className = currentPlayer.id === mapSystem.currentPlayer.id ? 'your-turn' : 'other-turn';
    }
}
```

### Action Queue
```javascript
function updateActionQueue(gameState) {
    const queueElement = document.getElementById('actionQueue');
    queueElement.innerHTML = '';
    
    gameState.actionQueue.forEach(action => {
        const actionElement = document.createElement('div');
        actionElement.className = `action ${action.status}`;
        actionElement.textContent = `${action.type} at (${action.data.row}, ${action.data.col})`;
        queueElement.appendChild(actionElement);
    });
}
```

## 🚀 Performance Optimization

### Action Batching
```javascript
// Batch multiple actions
const actions = [
    { type: 'place_building', data: { row: 1, col: 1, attribute: 'road' } },
    { type: 'place_building', data: { row: 1, col: 2, attribute: 'road' } }
];

actions.forEach(action => mapSystem.queueAction(action));
```

### State Caching
```javascript
// Cache frequently accessed data
const playerCache = new Map();
gameState.players.forEach(player => {
    playerCache.set(player.id, player);
});
```

## 🔧 Configuration Options

### MapSystem Options
```javascript
const mapSystem = new MultiplayerMapSystem({
    mapSize: { rows: 60, cols: 60 },
    conflictResolution: {
        enabled: true,
        mode: 'turn-based', // or 'real-time'
        lockDuration: 5000,
        maxRetries: 3
    },
    validation: {
        strict: true,
        customRules: true
    },
    rollback: {
        maxStackSize: 10,
        autoCreate: true
    }
});
```

### Socket.io Options
```javascript
const socket = io('http://localhost:5000', {
    auth: {
        token: localStorage.getItem('authToken')
    },
    transports: ['websocket'],
    upgrade: true,
    rememberUpgrade: true
});
```

## 🐛 Debugging

### Enable Debug Mode
```javascript
// Add debug logging
mapSystem.on('gameStateChange', (newState, oldState) => {
    console.log('Game State Change:', { newState, oldState });
});

mapSystem.on('playerAction', (action) => {
    console.log('Player Action:', action);
});

mapSystem.on('actionRejected', (data) => {
    console.error('Action Rejected:', data);
});
```

### State Inspection
```javascript
// Inspect current state
console.log('Current Game State:', mapSystem.getGameState());
console.log('Action Queue:', mapSystem.gameState.actionQueue);
console.log('Pending Actions:', mapSystem.gameState.pendingActions);
```

## 📝 Migration Checklist

- [ ] Replace MapSystem with MultiplayerMapSystem
- [ ] Add Socket.io client library
- [ ] Initialize server connection
- [ ] Set up event listeners
- [ ] Update UI for multiplayer features
- [ ] Add player management
- [ ] Implement turn indicators
- [ ] Add conflict resolution UI
- [ ] Test with multiple players
- [ ] Add error handling
- [ ] Optimize performance

## 🎯 Next Steps

1. **Test Integration**: Start with a simple two-player test
2. **Add UI Elements**: Implement player list, turn indicators, etc.
3. **Handle Edge Cases**: Disconnections, reconnections, conflicts
4. **Optimize Performance**: Batch actions, cache state
5. **Add Features**: Chat, spectating, replays
6. **Deploy**: Set up production environment

This refactored system provides a solid foundation for multiplayer city building with robust conflict resolution and state management!

