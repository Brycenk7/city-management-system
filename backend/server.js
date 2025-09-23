const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: "*",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint for Render health checks
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'City Builder Pro Backend Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Simple game storage (in production, use a database)
const games = new Map();
const players = new Map();

// Player colors for identification
const playerColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
];

let nextColorIndex = 0;

// Action queue system
const actionQueues = new Map(); // roomCode -> queue
const pendingActions = new Map(); // actionId -> action data
const cellLocks = new Map(); // "row,col" -> { playerId, timestamp, actionId }

// Action types and priorities
const ACTION_TYPES = {
  PLACE: 'place',
  REMOVE: 'remove',
  TURN_ADVANCE: 'turn_advance',
  TRADE: 'trade',
  CLAIM_TERRITORY: 'claim_territory'
};

const ACTION_PRIORITIES = {
  [ACTION_TYPES.PLACE]: 1,
  [ACTION_TYPES.REMOVE]: 2,
  [ACTION_TYPES.TURN_ADVANCE]: 3,
  [ACTION_TYPES.TRADE]: 4,
  [ACTION_TYPES.CLAIM_TERRITORY]: 5
};

// Victory conditions
const VICTORY_CONDITIONS = {
  POPULATION: 'population',
  EFFICIENCY: 'efficiency',
  RESOURCES: 'resources',
  INFRASTRUCTURE: 'infrastructure'
};

// Game modes
const GAME_MODES = {
  FREE_FOR_ALL: 'free_for_all',
  TEAM_BASED: 'team_based',
  COMPETITIVE: 'competitive',
  COLLABORATIVE: 'collaborative'
};

// Game mode configurations
const GAME_MODE_CONFIGS = {
  [GAME_MODES.FREE_FOR_ALL]: {
    name: 'Free-for-All City Building',
    description: 'Build your city independently, compete for resources and territory',
    maxPlayers: 8,
    teamSize: 1,
    allowTrading: true,
    allowTeams: false,
    sharedResources: false,
    jointProjects: false,
    victoryConditions: ['population', 'efficiency', 'resources'],
    resourceScarcity: 1.0,
    territoryExpansion: 50,
    turnBased: false
  },
  [GAME_MODES.TEAM_BASED]: {
    name: 'Team-Based City Development',
    description: 'Work in teams to build connected cities and shared infrastructure',
    maxPlayers: 8,
    teamSize: 4,
    allowTrading: true,
    allowTeams: true,
    sharedResources: true,
    jointProjects: true,
    victoryConditions: ['team_population', 'team_efficiency', 'team_resources'],
    resourceScarcity: 0.8,
    territoryExpansion: 75,
    turnBased: true
  },
  [GAME_MODES.COMPETITIVE]: {
    name: 'Competitive Resource Management',
    description: 'Compete for limited resources in a high-stakes economic battle',
    maxPlayers: 6,
    teamSize: 1,
    allowTrading: true,
    allowTeams: false,
    sharedResources: false,
    jointProjects: false,
    victoryConditions: ['resources', 'efficiency'],
    resourceScarcity: 2.0,
    territoryExpansion: 30,
    turnBased: true
  },
  [GAME_MODES.COLLABORATIVE]: {
    name: 'Collaborative Megacity Building',
    description: 'Work together to build the ultimate megacity with shared goals',
    maxPlayers: 12,
    teamSize: 12,
    allowTrading: true,
    allowTeams: true,
    sharedResources: true,
    jointProjects: true,
    victoryConditions: ['megacity_population', 'megacity_efficiency', 'megacity_projects'],
    resourceScarcity: 0.5,
    territoryExpansion: 200,
    turnBased: false
  }
};

// Game settings
const GAME_SETTINGS = {
  VICTORY_POPULATION: 1000,
  VICTORY_EFFICIENCY_THRESHOLD: 0.8,
  VICTORY_RESOURCES_THRESHOLD: 5000,
  TERRITORY_EXPANSION_LIMIT: 50,
  TRADE_TAX_RATE: 0.1,
  MAX_TEAM_SIZE: 4,
  SHARED_RESOURCE_BONUS: 0.2, // 20% bonus for shared resources
  JOINT_PROJECT_COST_REDUCTION: 0.3 // 30% cost reduction for joint projects
};

// Team management
const teams = new Map(); // teamId -> team data
const playerTeams = new Map(); // playerId -> teamId

// Game mode management functions
function getGameModeConfig(gameMode) {
  return GAME_MODE_CONFIGS[gameMode] || GAME_MODE_CONFIGS[GAME_MODES.FREE_FOR_ALL];
}

function validateGameModeSettings(gameMode, playerCount) {
  const config = getGameModeConfig(gameMode);
  return {
    valid: playerCount <= config.maxPlayers,
    maxPlayers: config.maxPlayers,
    teamSize: config.teamSize,
    allowTrading: config.allowTrading,
    allowTeams: config.allowTeams,
    sharedResources: config.sharedResources,
    jointProjects: config.jointProjects,
    victoryConditions: config.victoryConditions,
    resourceScarcity: config.resourceScarcity,
    territoryExpansion: config.territoryExpansion,
    turnBased: config.turnBased
  };
}

function applyGameModeSettings(game, gameMode) {
  const config = getGameModeConfig(gameMode);
  
  // Update game settings based on mode
  game.gameMode = gameMode;
  game.gameModeConfig = config;
  
  // Apply resource scarcity
  game.players.forEach(player => {
    player.resources.wood = Math.floor(player.resources.wood * config.resourceScarcity);
    player.resources.ore = Math.floor(player.resources.ore * config.resourceScarcity);
  });
  
  // Update territory expansion limits
  game.gameState.territoryExpansionLimit = config.territoryExpansion;
  
  // Set turn-based mode
  game.gameState.turnBased = config.turnBased;
  
  return game;
}

function checkModeSpecificVictory(game) {
  const config = game.gameModeConfig;
  const results = [];
  
  switch (game.gameMode) {
    case GAME_MODES.FREE_FOR_ALL:
      return checkFreeForAllVictory(game);
    case GAME_MODES.TEAM_BASED:
      return checkTeamBasedVictory(game);
    case GAME_MODES.COMPETITIVE:
      return checkCompetitiveVictory(game);
    case GAME_MODES.COLLABORATIVE:
      return checkCollaborativeVictory(game);
    default:
      return checkFreeForAllVictory(game);
  }
}

function checkFreeForAllVictory(game) {
  const results = [];
  
  game.players.forEach(player => {
    // Population victory
    if (player.population >= 1000) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: 'population',
        value: player.population,
        threshold: 1000
      });
    }
    
    // Efficiency victory
    const efficiency = calculatePlayerEfficiency(player);
    if (efficiency >= 0.8) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: 'efficiency',
        value: efficiency,
        threshold: 0.8
      });
    }
    
    // Resources victory
    const totalResources = Object.values(player.resources).reduce((sum, val) => sum + val, 0);
    if (totalResources >= 5000) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: 'resources',
        value: totalResources,
        threshold: 5000
      });
    }
  });
  
  return results;
}

function checkTeamBasedVictory(game) {
  const results = [];
  const teamStats = new Map();
  
  // Calculate team statistics
  game.players.forEach(player => {
    const team = getPlayerTeam(player.id);
    if (team) {
      if (!teamStats.has(team.id)) {
        teamStats.set(team.id, {
          teamId: team.id,
          teamName: team.name,
          totalPopulation: 0,
          totalResources: 0,
          totalEfficiency: 0,
          memberCount: 0
        });
      }
      
      const stats = teamStats.get(team.id);
      stats.totalPopulation += player.population;
      stats.totalResources += Object.values(player.resources).reduce((sum, val) => sum + val, 0);
      stats.totalEfficiency += calculatePlayerEfficiency(player);
      stats.memberCount++;
    }
  });
  
  // Check team victories
  teamStats.forEach(stats => {
    const avgEfficiency = stats.totalEfficiency / stats.memberCount;
    
    if (stats.totalPopulation >= 2000) {
      results.push({
        teamId: stats.teamId,
        teamName: stats.teamName,
        condition: 'team_population',
        value: stats.totalPopulation,
        threshold: 2000
      });
    }
    
    if (avgEfficiency >= 0.9) {
      results.push({
        teamId: stats.teamId,
        teamName: stats.teamName,
        condition: 'team_efficiency',
        value: avgEfficiency,
        threshold: 0.9
      });
    }
    
    if (stats.totalResources >= 10000) {
      results.push({
        teamId: stats.teamId,
        teamName: stats.teamName,
        condition: 'team_resources',
        value: stats.totalResources,
        threshold: 10000
      });
    }
  });
  
  return results;
}

function checkCompetitiveVictory(game) {
  const results = [];
  const players = game.players.sort((a, b) => {
    const aResources = Object.values(a.resources).reduce((sum, val) => sum + val, 0);
    const bResources = Object.values(b.resources).reduce((sum, val) => sum + val, 0);
    return bResources - aResources;
  });
  
  // Top 3 players by resources
  players.slice(0, 3).forEach((player, index) => {
    const totalResources = Object.values(player.resources).reduce((sum, val) => sum + val, 0);
    results.push({
      playerId: player.id,
      playerName: player.username,
      condition: 'competitive_ranking',
      value: totalResources,
      rank: index + 1,
      threshold: 3000
    });
  });
  
  return results;
}

function checkCollaborativeVictory(game) {
  const results = [];
  
  // Calculate megacity statistics
  const totalPopulation = game.players.reduce((sum, player) => sum + player.population, 0);
  const totalResources = game.players.reduce((sum, player) => 
    sum + Object.values(player.resources).reduce((pSum, val) => pSum + val, 0), 0);
  const avgEfficiency = game.players.reduce((sum, player) => 
    sum + calculatePlayerEfficiency(player), 0) / game.players.length;
  
  // Megacity population victory
  if (totalPopulation >= 5000) {
    results.push({
      condition: 'megacity_population',
      value: totalPopulation,
      threshold: 5000,
      allPlayers: true
    });
  }
  
  // Megacity efficiency victory
  if (avgEfficiency >= 0.95) {
    results.push({
      condition: 'megacity_efficiency',
      value: avgEfficiency,
      threshold: 0.95,
      allPlayers: true
    });
  }
  
  // Megacity resources victory
  if (totalResources >= 20000) {
    results.push({
      condition: 'megacity_resources',
      value: totalResources,
      threshold: 20000,
      allPlayers: true
    });
  }
  
  return results;
}

// Team management functions
function createTeam(teamName, leaderId, roomCode) {
  const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const team = {
    id: teamId,
    name: teamName,
    leaderId: leaderId,
    members: [leaderId],
    roomCode: roomCode,
    sharedResources: {
      wood: 0,
      ore: 0,
      power: 0,
      commercialGoods: 0
    },
    jointProjects: [],
    objectives: [],
    chat: []
  };
  
  teams.set(teamId, team);
  playerTeams.set(leaderId, teamId);
  
  return team;
}

function joinTeam(playerId, teamId) {
  const team = teams.get(teamId);
  if (!team || team.members.length >= GAME_SETTINGS.MAX_TEAM_SIZE) {
    return false;
  }
  
  team.members.push(playerId);
  playerTeams.set(playerId, teamId);
  return true;
}

function leaveTeam(playerId) {
  const teamId = playerTeams.get(playerId);
  if (!teamId) return false;
  
  const team = teams.get(teamId);
  if (!team) return false;
  
  team.members = team.members.filter(id => id !== playerId);
  playerTeams.delete(playerId);
  
  // If team is empty, delete it
  if (team.members.length === 0) {
    teams.delete(teamId);
  } else if (team.leaderId === playerId) {
    // Transfer leadership to first remaining member
    team.leaderId = team.members[0];
  }
  
  return true;
}

function getPlayerTeam(playerId) {
  const teamId = playerTeams.get(playerId);
  return teamId ? teams.get(teamId) : null;
}

function addToSharedResources(teamId, resources) {
  const team = teams.get(teamId);
  if (!team) return false;
  
  for (const [resource, amount] of Object.entries(resources)) {
    if (team.sharedResources.hasOwnProperty(resource)) {
      team.sharedResources[resource] += amount;
    }
  }
  
  return true;
}

function useSharedResources(teamId, resources) {
  const team = teams.get(teamId);
  if (!team) return false;
  
  // Check if team has enough shared resources
  for (const [resource, amount] of Object.entries(resources)) {
    if (team.sharedResources[resource] < amount) {
      return false;
    }
  }
  
  // Deduct resources
  for (const [resource, amount] of Object.entries(resources)) {
    team.sharedResources[resource] -= amount;
  }
  
  return true;
}

// Joint infrastructure projects
function createJointProject(teamId, projectType, location, cost) {
  const team = teams.get(teamId);
  if (!team) return false;
  
  // Check if team has enough shared resources
  if (!useSharedResources(teamId, cost)) {
    return false;
  }
  
  const project = {
    id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: projectType,
    location: location,
    cost: cost,
    contributors: team.members,
    status: 'in_progress',
    progress: 0,
    createdAt: Date.now()
  };
  
  team.jointProjects.push(project);
  return project;
}

function contributeToProject(playerId, projectId, contribution) {
  const team = getPlayerTeam(playerId);
  if (!team) return false;
  
  const project = team.jointProjects.find(p => p.id === projectId);
  if (!project || project.status !== 'in_progress') return false;
  
  // Add contribution to project progress
  project.progress += contribution;
  
  // Check if project is complete
  if (project.progress >= 100) {
    project.status = 'completed';
    project.completedAt = Date.now();
    
    // Apply project benefits to all team members
    applyProjectBenefits(team, project);
  }
  
  return true;
}

function applyProjectBenefits(team, project) {
  // Apply different benefits based on project type
  switch (project.type) {
    case 'mega_power_plant':
      // All team members get power bonus
      team.members.forEach(memberId => {
        const player = games.get(team.roomCode)?.players.find(p => p.id === memberId);
        if (player) {
          player.resources.power += 50;
        }
      });
      break;
    case 'trade_network':
      // All team members get resource generation bonus
      team.members.forEach(memberId => {
        const player = games.get(team.roomCode)?.players.find(p => p.id === memberId);
        if (player) {
          player.resources.wood += 20;
          player.resources.ore += 20;
        }
      });
      break;
    case 'mega_city':
      // All team members get population bonus
      team.members.forEach(memberId => {
        const player = games.get(team.roomCode)?.players.find(p => p.id === memberId);
        if (player) {
          player.population += 100;
        }
      });
      break;
  }
}

// Team objectives
function createTeamObjective(teamId, objectiveType, description, reward) {
  const team = teams.get(teamId);
  if (!team) return false;
  
  const objective = {
    id: `objective_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: objectiveType,
    description: description,
    reward: reward,
    status: 'active',
    progress: 0,
    createdAt: Date.now()
  };
  
  team.objectives.push(objective);
  return objective;
}

function checkTeamObjectives(teamId) {
  const team = teams.get(teamId);
  if (!team) return [];
  
  const completedObjectives = [];
  
  team.objectives.forEach(objective => {
    if (objective.status === 'active') {
      let progress = 0;
      
      switch (objective.type) {
        case 'total_population':
          progress = team.members.reduce((sum, memberId) => {
            const player = games.get(team.roomCode)?.players.find(p => p.id === memberId);
            return sum + (player?.population || 0);
          }, 0);
          break;
        case 'shared_resources':
          progress = Object.values(team.sharedResources).reduce((sum, val) => sum + val, 0);
          break;
        case 'joint_projects':
          progress = team.jointProjects.filter(p => p.status === 'completed').length * 25;
          break;
      }
      
      objective.progress = Math.min(progress, 100);
      
      if (objective.progress >= 100) {
        objective.status = 'completed';
        completedObjectives.push(objective);
        
        // Apply rewards
        applyObjectiveReward(team, objective);
      }
    }
  });
  
  return completedObjectives;
}

function applyObjectiveReward(team, objective) {
  // Apply rewards to all team members
  team.members.forEach(memberId => {
    const player = games.get(team.roomCode)?.players.find(p => p.id === memberId);
    if (player && objective.reward) {
      for (const [resource, amount] of Object.entries(objective.reward)) {
        if (player.resources.hasOwnProperty(resource)) {
          player.resources[resource] += amount;
        }
      }
    }
  });
}

// Action queue management functions
function initializeActionQueue(roomCode) {
  if (!actionQueues.has(roomCode)) {
    actionQueues.set(roomCode, []);
  }
}

function addActionToQueue(roomCode, action) {
  initializeActionQueue(roomCode);
  const queue = actionQueues.get(roomCode);
  
  // Add action with priority and timestamp
  action.priority = ACTION_PRIORITIES[action.type] || 999;
  action.queueTimestamp = Date.now();
  action.actionId = `${action.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Insert in priority order
  const insertIndex = queue.findIndex(queuedAction => queuedAction.priority > action.priority);
  if (insertIndex === -1) {
    queue.push(action);
  } else {
    queue.splice(insertIndex, 0, action);
  }
  
  pendingActions.set(action.actionId, action);
  console.log(`📝 Action queued: ${action.type} by ${action.playerId} in room ${roomCode}`);
  
  // Process queue
  processActionQueue(roomCode);
}

function processActionQueue(roomCode) {
  const queue = actionQueues.get(roomCode);
  if (!queue || queue.length === 0) return;
  
  const game = games.get(roomCode);
  if (!game) return;
  
  // Process actions in order
  while (queue.length > 0) {
    const action = queue[0];
    
    if (validateAction(action, game)) {
      executeAction(action, game, roomCode);
      queue.shift();
      pendingActions.delete(action.actionId);
    } else {
      // Action is invalid, remove it and notify player
      queue.shift();
      pendingActions.delete(action.actionId);
      notifyActionRejected(action, roomCode);
    }
  }
}

function validateAction(action, game) {
  // Check if it's the player's turn
  const currentPlayerId = game.gameState.turnOrder[game.gameState.currentTurn];
  if (action.playerId !== currentPlayerId && action.type !== ACTION_TYPES.TURN_ADVANCE) {
    console.log(`❌ Action rejected: Not player's turn. Current: ${currentPlayerId}, Action: ${action.playerId}`);
    return false;
  }
  
  // Check cell conflicts for place/remove actions
  if (action.type === ACTION_TYPES.PLACE || action.type === ACTION_TYPES.REMOVE) {
    const cellKey = `${action.row},${action.col}`;
    const existingLock = cellLocks.get(cellKey);
    
    if (existingLock && existingLock.playerId !== action.playerId) {
      console.log(`❌ Action rejected: Cell ${cellKey} is locked by ${existingLock.playerId}`);
      return false;
    }
  }
  
  // Check resource availability for place actions
  if (action.type === ACTION_TYPES.PLACE) {
    const player = game.players.find(p => p.id === action.playerId);
    if (!player) return false;
    
    // Basic resource check (can be enhanced with actual building costs)
    if (action.attribute === 'powerPlant' && player.resources.wood < 25) {
      console.log(`❌ Action rejected: Insufficient resources for ${action.attribute}`);
      return false;
    }
  }
  
  return true;
}

function executeAction(action, game, roomCode) {
  console.log(`✅ Executing action: ${action.type} by ${action.playerId}`);
  
  if (action.type === ACTION_TYPES.TURN_ADVANCE) {
    // Handle turn advancement
    game.gameState.currentTurn = (game.gameState.currentTurn + 1) % game.gameState.turnOrder.length;
    
    // Broadcast turn change to all players in the room
    io.to(`game_${roomCode}`).emit('turn_changed', {
      currentTurn: game.gameState.currentTurn,
      turnOrder: game.gameState.turnOrder,
      currentPlayer: game.gameState.turnOrder[game.gameState.currentTurn]
    });
    
    console.log(`🔄 Turn advanced in room ${roomCode} to player ${game.gameState.turnOrder[game.gameState.currentTurn]}`);
  } else {
    // Lock the cell if it's a place/remove action
    if (action.type === ACTION_TYPES.PLACE || action.type === ACTION_TYPES.REMOVE) {
      const cellKey = `${action.row},${action.col}`;
      cellLocks.set(cellKey, {
        playerId: action.playerId,
        timestamp: Date.now(),
        actionId: action.actionId
      });
      
      // Auto-unlock after 5 seconds
      setTimeout(() => {
        cellLocks.delete(cellKey);
      }, 5000);
    }
    
    // Broadcast action to all players in the room
    io.to(`game_${roomCode}`).emit('action_executed', {
      actionId: action.actionId,
      type: action.type,
      playerId: action.playerId,
      row: action.row,
      col: action.col,
      attribute: action.attribute,
      className: action.className,
      timestamp: Date.now()
    });
  }
}

function notifyActionRejected(action, roomCode) {
  io.to(action.playerId).emit('action_rejected', {
    actionId: action.actionId,
    reason: 'Action validation failed',
    timestamp: Date.now()
  });
}

// Victory condition checking
function checkVictoryConditions(game) {
  const results = [];
  
  game.players.forEach(player => {
    // Population victory
    if (player.population >= GAME_SETTINGS.VICTORY_POPULATION) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: VICTORY_CONDITIONS.POPULATION,
        value: player.population,
        threshold: GAME_SETTINGS.VICTORY_POPULATION
      });
    }
    
    // Efficiency victory (resource production vs consumption)
    const efficiency = calculatePlayerEfficiency(player);
    if (efficiency >= GAME_SETTINGS.VICTORY_EFFICIENCY_THRESHOLD) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: VICTORY_CONDITIONS.EFFICIENCY,
        value: efficiency,
        threshold: GAME_SETTINGS.VICTORY_EFFICIENCY_THRESHOLD
      });
    }
    
    // Resources victory
    const totalResources = Object.values(player.resources).reduce((sum, val) => sum + val, 0);
    if (totalResources >= GAME_SETTINGS.VICTORY_RESOURCES_THRESHOLD) {
      results.push({
        playerId: player.id,
        playerName: player.username,
        condition: VICTORY_CONDITIONS.RESOURCES,
        value: totalResources,
        threshold: GAME_SETTINGS.VICTORY_RESOURCES_THRESHOLD
      });
    }
  });
  
  return results;
}

function calculatePlayerEfficiency(player) {
  // Calculate efficiency based on resource production vs consumption
  const production = (player.resources.wood || 0) + (player.resources.ore || 0) + (player.resources.power || 0);
  const consumption = player.population * 0.1; // Base consumption per population
  return production / Math.max(consumption, 1);
}

// Territorial management
function getPlayerTerritory(playerId, game) {
  // This would track which cells belong to which player
  // For now, return a simple calculation based on player's buildings
  return {
    playerId: playerId,
    cells: [], // Would contain actual cell coordinates
    size: 0,
    expansionLimit: GAME_SETTINGS.TERRITORY_EXPANSION_LIMIT
  };
}

function canExpandTerritory(playerId, game, newCell) {
  const territory = getPlayerTerritory(playerId, game);
  return territory.size < territory.expansionLimit;
}

// Resource trading
function processTrade(tradeData, game) {
  const { fromPlayerId, toPlayerId, resources, payment } = tradeData;
  
  const fromPlayer = game.players.find(p => p.id === fromPlayerId);
  const toPlayer = game.players.find(p => p.id === toPlayerId);
  
  if (!fromPlayer || !toPlayer) return false;
  
  // Check if players have enough resources
  for (const [resource, amount] of Object.entries(resources)) {
    if (fromPlayer.resources[resource] < amount) return false;
  }
  
  for (const [resource, amount] of Object.entries(payment)) {
    if (toPlayer.resources[resource] < amount) return false;
  }
  
  // Execute trade
  for (const [resource, amount] of Object.entries(resources)) {
    fromPlayer.resources[resource] -= amount;
    toPlayer.resources[resource] += amount;
  }
  
  for (const [resource, amount] of Object.entries(payment)) {
    toPlayer.resources[resource] -= amount;
    fromPlayer.resources[resource] += amount;
  }
  
  return true;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Handle creating a game
  socket.on('create_game', (data) => {
    const { playerName, gameMode = GAME_MODES.FREE_FOR_ALL } = data;
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerId = socket.id;
    const playerColor = playerColors[nextColorIndex % playerColors.length];
    nextColorIndex++;
    
    console.log(`🎮 User ${socket.id} creating game: ${roomCode} as ${playerName} in ${gameMode} mode`);
    
    // Validate game mode settings
    const modeValidation = validateGameModeSettings(gameMode, 1);
    if (!modeValidation.valid) {
      socket.emit('game_creation_failed', { 
        reason: `Game mode ${gameMode} not valid for 1 player. Max players: ${modeValidation.maxPlayers}` 
      });
      return;
    }
    
    // Create new game
    const game = {
      id: `game_${roomCode}`,
      roomCode: roomCode,
      name: `${playerName}'s Game`,
      gameMode: gameMode,
      gameModeConfig: getGameModeConfig(gameMode),
      players: [
        {
          id: playerId,
          username: playerName,
          color: playerColor,
          isReady: false,
          isHost: true,
          resources: { wood: 30, ore: 10, commercialGoods: 0, power: 0 },
          population: 0,
          score: 0,
          territory: { cells: [], size: 0 },
          efficiency: 0
        }
      ],
      gameState: {
        status: 'waiting',
        currentTurn: 0,
        turnOrder: [playerId],
        cells: [],
        victoryConditions: {
          population: GAME_SETTINGS.VICTORY_POPULATION,
          efficiency: GAME_SETTINGS.VICTORY_EFFICIENCY_THRESHOLD,
          resources: GAME_SETTINGS.VICTORY_RESOURCES_THRESHOLD
        },
        sharedInfrastructure: {
          roads: [],
          powerGrid: []
        },
        turnBased: modeValidation.turnBased,
        territoryExpansionLimit: modeValidation.territoryExpansion
      }
    };
    
    // Apply game mode settings
    applyGameModeSettings(game, gameMode);
    
    games.set(roomCode, game);
    players.set(playerId, { roomCode, playerName, color: playerColor });
    
    socket.join(`game_${roomCode}`);
    
    // Send game created confirmation
    socket.emit('game_created', {
      roomCode: roomCode,
      playerId: playerId,
      game: game
    });
  });
  
  // Handle joining a game
  socket.on('join_game', (data) => {
    const { roomCode, playerName } = data;
    console.log(`🎮 User ${socket.id} joining game: ${roomCode} as ${playerName}`);
    
    // Check if game exists
    const game = games.get(roomCode);
    if (!game) {
      socket.emit('join_error', { message: 'Game not found' });
      return;
    }
    
    // Add player to game
    const playerId = socket.id;
    const playerColor = playerColors[nextColorIndex % playerColors.length];
    nextColorIndex++;
    
    const newPlayer = {
      id: playerId,
      username: playerName || 'Player',
      color: playerColor,
      isReady: false,
      isHost: false,
      resources: { wood: 30, ore: 10, commercialGoods: 0, power: 0 },
      population: 0,
      score: 0,
      territory: { cells: [], size: 0 },
      efficiency: 0
    };
    
    game.players.push(newPlayer);
    game.gameState.turnOrder.push(playerId);
    players.set(playerId, { roomCode, playerName: playerName || 'Player', color: playerColor });
    
    // Join the room
    socket.join(`game_${roomCode}`);
    
    // Send join confirmation
    socket.emit('game_joined', {
      roomCode: roomCode,
      playerId: playerId,
      game: game
    });
    
    // Notify other players
    socket.to(`game_${roomCode}`).emit('player_joined', {
      player: newPlayer,
      totalPlayers: game.players.length,
      game: game
    });
    
    console.log(`✅ Player ${playerName} joined game ${roomCode}`);
  });
  
  // Handle leaving a game
  socket.on('leave_game', () => {
    console.log(`🚪 User ${socket.id} leaving game`);
    socket.leaveAll();
  });
  
  // Handle game actions
  socket.on('game_action', (data) => {
    console.log(`🎯 Game action from ${socket.id}:`, data);
    
    // Get player info
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      // Add action to queue instead of immediate broadcast
      const action = {
        type: data.action,
        playerId: socket.id,
        row: data.row,
        col: data.col,
        attribute: data.attribute,
        className: data.className,
        timestamp: data.timestamp
      };
      
      addActionToQueue(roomCode, action);
    } else {
      console.log('⚠️ Player not in a game room, action not queued');
    }
  });

  // Handle map state updates
  socket.on('update_map_state', (data) => {
    console.log(`🗺️ Map state update from ${socket.id}`);
    
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game) {
        // Update the game's map state
        game.gameState.cells = data.cells;
        
        // Broadcast the updated map to all other players in the room
        socket.to(`game_${roomCode}`).emit('map_state_updated', {
          cells: data.cells,
          updatedBy: socket.id
        });
        
        console.log(`📡 Map state broadcasted to room ${roomCode}`);
      }
    }
  });

  // Handle player resource updates
  socket.on('update_player_resources', (data) => {
    console.log(`💰 Resource update from ${socket.id}:`, data.resources);
    
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game) {
        // Update player resources in the game
        const player = game.players.find(p => p.id === socket.id);
        if (player) {
          player.resources = data.resources;
          
          // Broadcast updated player list to all players in the room
          io.to(`game_${roomCode}`).emit('player_resources_updated', {
            game: game
          });
          
          console.log(`📡 Player resources broadcasted to room ${roomCode}`);
        }
      }
    }
  });

  // Handle game state requests
  socket.on('request_game_state', (data) => {
    console.log(`📊 Game state request from ${socket.id}`);
    
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game) {
        // Send current game state
        socket.emit('game_state_update', {
          players: game.players,
          gameState: game.gameState
        });
        
        console.log(`📡 Game state sent to ${socket.id}`);
      }
    }
  });
  
  // Handle turn advancement
  socket.on('advance_turn', (data) => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game && game.gameState.turnOrder[game.gameState.currentTurn] === socket.id) {
        // Add turn advancement to action queue
        const action = {
          type: ACTION_TYPES.TURN_ADVANCE,
          playerId: socket.id,
          roomCode: roomCode
        };
        
        addActionToQueue(roomCode, action);
      }
    }
  });

  // Handle resource trading
  socket.on('initiate_trade', (data) => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game) {
        // Notify target player about trade offer
        io.to(data.targetPlayerId).emit('trade_offer', {
          fromPlayerId: socket.id,
          fromPlayerName: playerInfo.playerName,
          resources: data.resources,
          payment: data.payment,
          timestamp: Date.now()
        });
      }
    }
  });

  // Handle trade response
  socket.on('trade_response', (data) => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game && data.accepted) {
        const success = processTrade({
          fromPlayerId: data.fromPlayerId,
          toPlayerId: socket.id,
          resources: data.resources,
          payment: data.payment
        }, game);
        
        if (success) {
          // Notify both players about successful trade
          io.to(data.fromPlayerId).emit('trade_completed', {
            success: true,
            resources: data.resources,
            payment: data.payment,
            timestamp: Date.now()
          });
          
          io.to(socket.id).emit('trade_completed', {
            success: true,
            resources: data.resources,
            payment: data.payment,
            timestamp: Date.now()
          });
          
          // Broadcast updated game state
          io.to(`game_${roomCode}`).emit('game_state_update', {
            players: game.players,
            timestamp: Date.now()
          });
        }
      } else {
        // Notify original player about rejection
        io.to(data.fromPlayerId).emit('trade_rejected', {
          reason: 'Trade was declined',
          timestamp: Date.now()
        });
      }
    }
  });

  // Handle victory condition check
  socket.on('check_victory', () => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const game = games.get(roomCode);
      if (game) {
        const victoryResults = checkModeSpecificVictory(game);
        if (victoryResults.length > 0) {
          io.to(`game_${roomCode}`).emit('victory_achieved', {
            winners: victoryResults,
            gameMode: game.gameMode,
            timestamp: Date.now()
          });
        }
      }
    }
  });

  // Team management handlers
  socket.on('create_team', (data) => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const team = createTeam(data.teamName, socket.id, roomCode);
      if (team) {
        // Notify team leader
        socket.emit('team_created', { team: team });
        
        // Notify all players in the room about new team
        io.to(`game_${roomCode}`).emit('team_list_updated', {
          teams: Array.from(teams.values()).filter(t => t.roomCode === roomCode)
        });
      }
    }
  });

  socket.on('join_team', (data) => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const success = joinTeam(socket.id, data.teamId);
      if (success) {
        const team = teams.get(data.teamId);
        socket.emit('team_joined', { team: team });
        
        // Notify all team members
        team.members.forEach(memberId => {
          io.to(memberId).emit('team_member_joined', {
            playerId: socket.id,
            playerName: playerInfo.playerName,
            team: team
          });
        });
      } else {
        socket.emit('team_join_failed', { reason: 'Team is full or does not exist' });
      }
    }
  });

  socket.on('leave_team', () => {
    const playerInfo = players.get(socket.id);
    const roomCode = playerInfo ? playerInfo.roomCode : null;
    
    if (roomCode) {
      const team = getPlayerTeam(socket.id);
      if (team) {
        leaveTeam(socket.id);
        socket.emit('team_left', {});
        
        // Notify remaining team members
        team.members.forEach(memberId => {
          io.to(memberId).emit('team_member_left', {
            playerId: socket.id,
            playerName: playerInfo.playerName
          });
        });
      }
    }
  });

  // Shared resources handlers
  socket.on('contribute_resources', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team) {
      const success = addToSharedResources(team.id, data.resources);
      if (success) {
        // Notify all team members about updated shared resources
        team.members.forEach(memberId => {
          io.to(memberId).emit('shared_resources_updated', {
            sharedResources: team.sharedResources
          });
        });
      }
    }
  });

  socket.on('use_shared_resources', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team) {
      const success = useSharedResources(team.id, data.resources);
      if (success) {
        // Notify all team members about updated shared resources
        team.members.forEach(memberId => {
          io.to(memberId).emit('shared_resources_updated', {
            sharedResources: team.sharedResources
          });
        });
      } else {
        socket.emit('shared_resources_failed', { reason: 'Insufficient shared resources' });
      }
    }
  });

  // Joint projects handlers
  socket.on('create_joint_project', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team && team.leaderId === socket.id) {
      const project = createJointProject(team.id, data.projectType, data.location, data.cost);
      if (project) {
        // Notify all team members about new project
        team.members.forEach(memberId => {
          io.to(memberId).emit('joint_project_created', { project: project });
        });
      }
    }
  });

  socket.on('contribute_to_project', (data) => {
    const success = contributeToProject(socket.id, data.projectId, data.contribution);
    if (success) {
      const team = getPlayerTeam(socket.id);
      if (team) {
        const project = team.jointProjects.find(p => p.id === data.projectId);
        if (project) {
          // Notify all team members about project progress
          team.members.forEach(memberId => {
            io.to(memberId).emit('project_progress_updated', { project: project });
          });
        }
      }
    }
  });

  // Team objectives handlers
  socket.on('create_team_objective', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team && team.leaderId === socket.id) {
      const objective = createTeamObjective(team.id, data.objectiveType, data.description, data.reward);
      if (objective) {
        // Notify all team members about new objective
        team.members.forEach(memberId => {
          io.to(memberId).emit('team_objective_created', { objective: objective });
        });
      }
    }
  });

  socket.on('check_team_objectives', () => {
    const team = getPlayerTeam(socket.id);
    if (team) {
      const completedObjectives = checkTeamObjectives(team.id);
      if (completedObjectives.length > 0) {
        // Notify all team members about completed objectives
        team.members.forEach(memberId => {
          io.to(memberId).emit('objectives_completed', { objectives: completedObjectives });
        });
      }
    }
  });

  // Team chat handlers
  socket.on('team_chat_message', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team) {
      const message = {
        playerId: socket.id,
        playerName: players.get(socket.id)?.playerName || 'Player',
        message: data.message,
        timestamp: Date.now()
      };
      
      team.chat.push(message);
      
      // Notify all team members
      team.members.forEach(memberId => {
        io.to(memberId).emit('team_chat_message', message);
      });
    }
  });

  // Map markers for communication
  socket.on('place_map_marker', (data) => {
    const team = getPlayerTeam(socket.id);
    if (team) {
      const marker = {
        id: `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: socket.id,
        playerName: players.get(socket.id)?.playerName || 'Player',
        x: data.x,
        y: data.y,
        message: data.message,
        type: data.type || 'info',
        timestamp: Date.now()
      };
      
      // Notify all team members about the marker
      team.members.forEach(memberId => {
        io.to(memberId).emit('map_marker_placed', marker);
      });
    }
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    console.log(`💬 Chat message from ${socket.id}:`, data.message);
    
    // Broadcast to all players in the same game
    socket.broadcast.emit('chat_message_broadcast', {
      playerId: socket.id,
      username: 'Player',
      message: data.message,
      type: data.type || 'chat',
      timestamp: new Date()
    });
  });
  
  // Handle getting available game modes
  socket.on('get_game_modes', () => {
    socket.emit('game_modes_list', {
      modes: Object.keys(GAME_MODE_CONFIGS).map(mode => ({
        id: mode,
        ...GAME_MODE_CONFIGS[mode]
      }))
    });
  });

  // Handle ping
  socket.on('ping', (data) => {
    socket.emit('pong', {
      timestamp: Date.now(),
      pingTimestamp: data.timestamp,
      latency: Date.now() - data.timestamp
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // Handle player leaving game
    const playerInfo = players.get(socket.id);
    if (playerInfo) {
      const roomCode = playerInfo.roomCode;
      const game = games.get(roomCode);
      
      if (game) {
        // Remove player from game
        game.players = game.players.filter(p => p.id !== socket.id);
        
        // Update turn order
        game.gameState.turnOrder = game.gameState.turnOrder.filter(id => id !== socket.id);
        
        // Adjust current turn if needed
        if (game.gameState.currentTurn >= game.gameState.turnOrder.length) {
          game.gameState.currentTurn = 0;
        }
        
        // Notify remaining players
        socket.to(`game_${roomCode}`).emit('player_left', {
          playerId: socket.id,
          game: game
        });
        
        console.log(`👋 Player ${socket.id} left game ${roomCode}`);
        
        // Clean up empty games
        if (game.players.length === 0) {
          games.delete(roomCode);
          console.log(`🗑️ Deleted empty game ${roomCode}`);
        }
      }
      
      // Remove player from players map
      players.delete(socket.id);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for all origins`);
  console.log(`📡 Socket.io server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };
