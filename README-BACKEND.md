# City Builder Multiplayer Backend

A Node.js/Express backend server with Socket.io for real-time multiplayer city building game.

## 🚀 Features

- **Real-time Multiplayer**: Socket.io for instant game synchronization
- **User Authentication**: JWT-based authentication with refresh tokens
- **Room Management**: Create, join, and manage game rooms
- **Database Integration**: MongoDB with Mongoose for persistent data
- **RESTful API**: Complete REST API for game management
- **Security**: Rate limiting, input validation, and secure authentication
- **Scalable Architecture**: Modular design for easy expansion

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone and navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/citybuilder-multiplayer
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### Game Management
- `POST /api/game/create` - Create new game room
- `POST /api/game/join/:roomCode` - Join game by room code
- `POST /api/game/leave/:roomCode` - Leave game
- `GET /api/game/:roomCode` - Get game details
- `GET /api/game/list/public` - List public games
- `PUT /api/game/:roomCode/settings` - Update game settings (host only)

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `PUT /api/user/password` - Change password
- `GET /api/user/games` - Get user's game history
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/leaderboard` - Get leaderboard
- `DELETE /api/user/account` - Delete user account

## 🔌 Socket.io Events

### Client → Server
- `join_game` - Join a game room
- `leave_game` - Leave a game room
- `toggle_ready` - Toggle ready status
- `start_game` - Start game (host only)
- `game_action` - Perform game action (place/remove building)
- `chat_message` - Send chat message

### Server → Client
- `player_joined` - Player joined the game
- `player_left` - Player left the game
- `player_ready_toggled` - Player ready status changed
- `game_started` - Game has started
- `game_state` - Current game state
- `game_action_broadcast` - Game action performed by another player
- `chat_message_broadcast` - Chat message from another player
- `player_disconnected` - Player disconnected
- `error` - Error message

## 🗄️ Database Schema

### User Model
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String,
  isActive: Boolean,
  lastLogin: Date,
  stats: {
    gamesPlayed: Number,
    gamesWon: Number,
    totalScore: Number,
    averageScore: Number
  },
  preferences: {
    theme: String,
    notifications: Boolean
  }
}
```

### Game Model
```javascript
{
  roomCode: String (unique, 6 chars),
  name: String,
  description: String,
  hostId: ObjectId,
  players: [{
    userId: ObjectId,
    username: String,
    color: String,
    isReady: Boolean,
    isHost: Boolean,
    resources: Object,
    score: Number
  }],
  gameState: {
    mapSize: Object,
    cells: Array,
    gameSettings: Object,
    status: String,
    currentTurn: Number,
    turnOrder: Array,
    winner: ObjectId
  },
  isPrivate: Boolean,
  password: String,
  maxPlayers: Number,
  chat: Array
}
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configurable cross-origin requests
- **Helmet**: Security headers
- **Input Sanitization**: Prevent XSS attacks

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-frontend-domain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/citybuilder
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

- Health check endpoint: `GET /api/health`
- Server logs include connection/disconnection events
- Game cleanup runs automatically every hour
- Database connection monitoring

## 🔧 Development

### Project Structure
```
backend/
├── config/
│   └── database.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   └── Game.js
├── routes/
│   ├── auth.js
│   ├── game.js
│   └── user.js
├── socket/
│   └── socketHandlers.js
├── server.js
├── package.json
└── README-BACKEND.md
```

### Adding New Features
1. Create new route files in `routes/`
2. Add corresponding models in `models/`
3. Update Socket.io handlers in `socket/socketHandlers.js`
4. Add tests for new functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

