const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true,
    match: /^#[0-9A-F]{6}$/i
  },
  isReady: {
    type: Boolean,
    default: false
  },
  isHost: {
    type: Boolean,
    default: false
  },
  resources: {
    wood: { type: Number, default: 30 },
    ore: { type: Number, default: 10 },
    commercialGoods: { type: Number, default: 0 },
    power: { type: Number, default: 0 }
  },
  score: {
    type: Number,
    default: 0
  },
  lastAction: {
    type: Date,
    default: Date.now
  }
});

const gameStateSchema = new mongoose.Schema({
  mapSize: {
    rows: { type: Number, default: 50 },
    cols: { type: Number, default: 50 }
  },
  cells: [{
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    attribute: { type: String, required: true },
    class: { type: String, required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, default: null },
    timestamp: { type: Date, default: Date.now }
  }],
  gameSettings: {
    maxPlayers: { type: Number, default: 4, min: 2, max: 8 },
    mapType: { type: String, enum: ['procedural', 'custom'], default: 'procedural' },
    victoryCondition: { 
      type: String, 
      enum: ['population', 'score', 'time', 'resources'], 
      default: 'score' 
    },
    timeLimit: { type: Number, default: 0 }, // 0 = no limit
    resourceMultiplier: { type: Number, default: 1.0, min: 0.1, max: 3.0 }
  },
  status: {
    type: String,
    enum: ['waiting', 'starting', 'active', 'paused', 'finished'],
    default: 'waiting'
  },
  currentTurn: {
    type: Number,
    default: 0
  },
  turnOrder: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  finishedAt: {
    type: Date,
    default: null
  }
});

const gameSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    length: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  players: [playerSchema],
  gameState: gameStateSchema,
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  maxPlayers: {
    type: Number,
    default: 4,
    min: 2,
    max: 8
  },
  spectators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  chat: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String, required: true },
    message: { type: String, required: true, maxlength: 500 },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['chat', 'system', 'action'], default: 'chat' }
  }]
}, {
  timestamps: true
});

// Generate unique room code
gameSchema.statics.generateRoomCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if room code is unique
gameSchema.statics.isRoomCodeUnique = async function(code) {
  const existing = await this.findOne({ roomCode: code });
  return !existing;
};

// Generate unique room code with retry
gameSchema.statics.createUniqueRoomCode = async function() {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = this.generateRoomCode();
    isUnique = await this.isRoomCodeUnique(code);
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique room code');
  }

  return code;
};

// Add player to game
gameSchema.methods.addPlayer = function(userId, username, color) {
  if (this.players.length >= this.maxPlayers) {
    throw new Error('Game is full');
  }

  if (this.players.some(p => p.userId.toString() === userId.toString())) {
    throw new Error('Player already in game');
  }

  this.players.push({
    userId,
    username,
    color,
    isReady: false,
    isHost: this.players.length === 0
  });

  return this.save();
};

// Remove player from game
gameSchema.methods.removePlayer = function(userId) {
  const playerIndex = this.players.findIndex(p => p.userId.toString() === userId.toString());
  
  if (playerIndex === -1) {
    throw new Error('Player not found in game');
  }

  const wasHost = this.players[playerIndex].isHost;
  this.players.splice(playerIndex, 1);

  // If host left, assign new host
  if (wasHost && this.players.length > 0) {
    this.players[0].isHost = true;
  }

  return this.save();
};

// Check if all players are ready
gameSchema.methods.allPlayersReady = function() {
  return this.players.length >= 2 && this.players.every(p => p.isReady);
};

// Start game
gameSchema.methods.startGame = function() {
  if (!this.allPlayersReady()) {
    throw new Error('Not all players are ready');
  }

  this.gameState.status = 'active';
  this.gameState.startedAt = new Date();
  this.gameState.turnOrder = this.players.map(p => p.userId);
  
  return this.save();
};

module.exports = mongoose.model('Game', gameSchema);

