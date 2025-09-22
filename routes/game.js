const express = require('express');
const { body, validationResult } = require('express-validator');
const Game = require('../models/Game');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Create new game room
router.post('/create', [
  body('name')
    .notEmpty()
    .withMessage('Game name is required')
    .isLength({ max: 50 })
    .withMessage('Game name must be 50 characters or less'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must be 200 characters or less'),
  body('maxPlayers')
    .optional()
    .isInt({ min: 2, max: 8 })
    .withMessage('Max players must be between 2 and 8'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  body('password')
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage('Password must be 4-20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, description, maxPlayers = 4, isPrivate = false, password } = req.body;

    // Generate unique room code
    const roomCode = await Game.createUniqueRoomCode();

    // Create game
    const game = new Game({
      roomCode,
      name,
      description,
      hostId: req.user._id,
      maxPlayers,
      isPrivate,
      password: password ? password : null,
      gameState: {
        mapSize: { rows: 50, cols: 50 },
        cells: [],
        gameSettings: {
          maxPlayers,
          mapType: 'procedural',
          victoryCondition: 'score',
          timeLimit: 0,
          resourceMultiplier: 1.0
        }
      }
    });

    // Add host as first player
    await game.addPlayer(req.user._id, req.user.username, '#FF6B6B');

    await game.save();

    res.status(201).json({
      message: 'Game created successfully',
      game: {
        id: game._id,
        roomCode: game.roomCode,
        name: game.name,
        description: game.description,
        maxPlayers: game.maxPlayers,
        currentPlayers: game.players.length,
        isPrivate: game.isPrivate,
        hasPassword: !!game.password,
        host: {
          id: req.user._id,
          username: req.user.username
        },
        status: game.gameState.status,
        createdAt: game.createdAt
      }
    });

  } catch (error) {
    console.error('Game creation error:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// Join game by room code
router.post('/join/:roomCode', [
  body('password')
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage('Password must be 4-20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { roomCode } = req.params;
    const { password } = req.body;

    // Find game
    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if game is full
    if (game.players.length >= game.maxPlayers) {
      return res.status(409).json({ error: 'Game is full' });
    }

    // Check if user is already in game
    if (game.players.some(p => p.userId.toString() === req.user._id.toString())) {
      return res.status(409).json({ error: 'Already in this game' });
    }

    // Check password for private games
    if (game.isPrivate && game.password && game.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if game has started
    if (game.gameState.status !== 'waiting') {
      return res.status(409).json({ error: 'Game has already started' });
    }

    // Generate player color
    const usedColors = game.players.map(p => p.color);
    const availableColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    const playerColor = availableColors.find(color => !usedColors.includes(color)) || '#FF6B6B';

    // Add player to game
    await game.addPlayer(req.user._id, req.user.username, playerColor);

    res.json({
      message: 'Joined game successfully',
      game: {
        id: game._id,
        roomCode: game.roomCode,
        name: game.name,
        players: game.players.map(p => ({
          id: p.userId,
          username: p.username,
          color: p.color,
          isReady: p.isReady,
          isHost: p.isHost
        })),
        status: game.gameState.status
      }
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// Leave game
router.post('/leave/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user is in game
    const player = game.players.find(p => p.userId.toString() === req.user._id.toString());
    if (!player) {
      return res.status(404).json({ error: 'Not in this game' });
    }

    // Remove player
    await game.removePlayer(req.user._id);

    // If no players left, delete game
    if (game.players.length === 0) {
      await Game.findByIdAndDelete(game._id);
      return res.json({ message: 'Left game and game deleted' });
    }

    res.json({ message: 'Left game successfully' });

  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({ error: 'Failed to leave game' });
  }
});

// Get game details
router.get('/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() })
      .populate('hostId', 'username displayName')
      .populate('players.userId', 'username displayName');

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      game: {
        id: game._id,
        roomCode: game.roomCode,
        name: game.name,
        description: game.description,
        maxPlayers: game.maxPlayers,
        currentPlayers: game.players.length,
        isPrivate: game.isPrivate,
        hasPassword: !!game.password,
        host: {
          id: game.hostId._id,
          username: game.hostId.username,
          displayName: game.hostId.displayName
        },
        players: game.players.map(p => ({
          id: p.userId._id,
          username: p.userId.username,
          displayName: p.userId.displayName,
          color: p.color,
          isReady: p.isReady,
          isHost: p.isHost,
          score: p.score
        })),
        gameState: {
          status: game.gameState.status,
          mapSize: game.gameState.mapSize,
          gameSettings: game.gameState.gameSettings
        },
        createdAt: game.createdAt
      }
    });

  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to get game details' });
  }
});

// List public games
router.get('/list/public', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'waiting' } = req.query;

    const games = await Game.find({
      isPrivate: false,
      'gameState.status': status
    })
    .populate('hostId', 'username displayName')
    .select('roomCode name description maxPlayers players gameState.status createdAt')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Game.countDocuments({
      isPrivate: false,
      'gameState.status': status
    });

    res.json({
      games: games.map(game => ({
        id: game._id,
        roomCode: game.roomCode,
        name: game.name,
        description: game.description,
        maxPlayers: game.maxPlayers,
        currentPlayers: game.players.length,
        host: {
          username: game.hostId.username,
          displayName: game.hostId.displayName
        },
        status: game.gameState.status,
        createdAt: game.createdAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('List games error:', error);
    res.status(500).json({ error: 'Failed to list games' });
  }
});

// Update game settings (host only)
router.put('/:roomCode/settings', [
  body('name')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Game name must be 50 characters or less'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must be 200 characters or less'),
  body('maxPlayers')
    .optional()
    .isInt({ min: 2, max: 8 })
    .withMessage('Max players must be between 2 and 8'),
  body('gameSettings')
    .optional()
    .isObject()
    .withMessage('Game settings must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { roomCode } = req.params;
    const updates = req.body;

    const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if user is host
    const hostPlayer = game.players.find(p => p.userId.toString() === req.user._id.toString());
    if (!hostPlayer || !hostPlayer.isHost) {
      return res.status(403).json({ error: 'Only the host can update game settings' });
    }

    // Check if game has started
    if (game.gameState.status !== 'waiting') {
      return res.status(409).json({ error: 'Cannot update settings after game has started' });
    }

    // Update allowed fields
    if (updates.name) game.name = updates.name;
    if (updates.description !== undefined) game.description = updates.description;
    if (updates.maxPlayers) {
      if (updates.maxPlayers < game.players.length) {
        return res.status(400).json({ error: 'Cannot set max players below current player count' });
      }
      game.maxPlayers = updates.maxPlayers;
    }
    if (updates.gameSettings) {
      game.gameState.gameSettings = { ...game.gameState.gameSettings, ...updates.gameSettings };
    }

    await game.save();

    res.json({
      message: 'Game settings updated successfully',
      game: {
        id: game._id,
        roomCode: game.roomCode,
        name: game.name,
        description: game.description,
        maxPlayers: game.maxPlayers,
        gameSettings: game.gameState.gameSettings
      }
    });

  } catch (error) {
    console.error('Update game settings error:', error);
    res.status(500).json({ error: 'Failed to update game settings' });
  }
});

module.exports = router;

