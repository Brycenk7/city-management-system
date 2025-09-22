const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', [
  body('displayName')
    .optional()
    .isLength({ max: 30 })
    .withMessage('Display name must be 30 characters or less'),
  body('preferences.theme')
    .optional()
    .isIn(['default', 'dark', 'light'])
    .withMessage('Theme must be default, dark, or light'),
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { displayName, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (displayName !== undefined) {
      user.displayName = displayName;
    }

    if (preferences) {
      if (preferences.theme !== undefined) {
        user.preferences.theme = preferences.theme;
      }
      if (preferences.notifications !== undefined) {
        user.preferences.notifications = preferences.notifications;
      }
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get user's game history
router.get('/games', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      'players.userId': req.user._id
    };

    if (status) {
      query['gameState.status'] = status;
    }

    const games = await Game.find(query)
      .populate('hostId', 'username displayName')
      .select('roomCode name gameState.status gameState.startedAt gameState.finishedAt players createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Game.countDocuments(query);

    res.json({
      games: games.map(game => {
        const player = game.players.find(p => p.userId.toString() === req.user._id.toString());
        return {
          id: game._id,
          roomCode: game.roomCode,
          name: game.name,
          status: game.gameState.status,
          startedAt: game.gameState.startedAt,
          finishedAt: game.gameState.finishedAt,
          playerScore: player ? player.score : 0,
          host: {
            username: game.hostId.username,
            displayName: game.hostId.displayName
          },
          createdAt: game.createdAt
        };
      }),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get user games error:', error);
    res.status(500).json({ error: 'Failed to get game history' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('stats');
    
    // Get additional stats from games
    const totalGames = await Game.countDocuments({
      'players.userId': req.user._id,
      'gameState.status': 'finished'
    });

    const wonGames = await Game.countDocuments({
      'players.userId': req.user._id,
      'gameState.status': 'finished',
      'gameState.winner': req.user._id
    });

    const recentGames = await Game.find({
      'players.userId': req.user._id,
      'gameState.status': 'finished'
    })
    .sort({ 'gameState.finishedAt': -1 })
    .limit(5)
    .select('roomCode name gameState.finishedAt players');

    const recentScores = recentGames.map(game => {
      const player = game.players.find(p => p.userId.toString() === req.user._id.toString());
      return {
        roomCode: game.roomCode,
        name: game.name,
        score: player ? player.score : 0,
        finishedAt: game.gameState.finishedAt
      };
    });

    res.json({
      stats: {
        ...user.stats.toObject(),
        totalGames,
        wonGames,
        winRate: totalGames > 0 ? (wonGames / totalGames * 100).toFixed(1) : 0
      },
      recentScores
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'score', limit = 10 } = req.query;

    let sortField;
    switch (type) {
      case 'games':
        sortField = 'stats.gamesPlayed';
        break;
      case 'wins':
        sortField = 'stats.gamesWon';
        break;
      case 'average':
        sortField = 'stats.averageScore';
        break;
      default:
        sortField = 'stats.totalScore';
    }

    const users = await User.find({ isActive: true })
      .select('username displayName stats')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit));

    res.json({
      leaderboard: users.map((user, index) => ({
        rank: index + 1,
        username: user.username,
        displayName: user.displayName,
        stats: user.stats
      })),
      type,
      total: users.length
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Delete user account
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { password } = req.body;
    const user = await User.findById(req.user._id);

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // Check if user is in any active games
    const activeGames = await Game.find({
      'players.userId': req.user._id,
      'gameState.status': { $in: ['waiting', 'starting', 'active'] }
    });

    if (activeGames.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete account while in active games',
        activeGames: activeGames.length
      });
    }

    // Deactivate account instead of deleting (preserve game history)
    user.isActive = false;
    user.email = `deleted_${Date.now()}@deleted.com`;
    user.username = `deleted_${Date.now()}`;
    await user.save();

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;

