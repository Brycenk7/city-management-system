# WebSocket Setup Checklist for City Builder Pro

## ✅ Quick Setup Steps

### **1. Add Socket.io Client to HTML**
```html
<!-- Add this to your index.html before your existing scripts -->
<script src="https://cdn.socket.io/4.7.4/socket.io.min.js"></script>
<script src="websocket-manager.js"></script>
<script src="multiplayer-integration-simple.js"></script>
```

### **2. Update Your script.js**
Add this to your existing `script.js`:

```javascript
// Add at the top of your script.js
let multiplayerIntegration = null;

// Add this after your MapSystem initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Your existing code...
    mapSystem = new MapSystem();
    
    // Add multiplayer integration
    multiplayerIntegration = new SimpleMultiplayerIntegration(mapSystem);
    await multiplayerIntegration.initializeMultiplayer();
    multiplayerIntegration.showMultiplayerUI();
});

// Modify your existing cell click handler
function handleCellClick(e) {
    const cell = e.target;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    // Multiplayer mode
    if (multiplayerIntegration && multiplayerIntegration.isInMultiplayerMode()) {
        const action = mapSystem.selectedAttribute === 'erase' ? 'remove' : 'place';
        multiplayerIntegration.sendGameAction(action, row, col, mapSystem.selectedAttribute, mapSystem.selectedClass);
    } else {
        // Your existing single-player logic
        // ... existing code
    }
}
```

### **3. Start Your Backend Server**
```bash
cd backend
npm install
npm start
```

### **4. Test the Connection**
1. Open your game in a browser
2. Check the console for "✅ Connected to WebSocket server"
3. Look for the multiplayer controls in the top-right corner
4. Try creating or joining a game

## 🎮 How to Use

### **Create a Game**
1. Click "Create Game" button
2. Wait for "Game created!" notification
3. Share the room code with other players

### **Join a Game**
1. Enter room code in the input field
2. Click "Join Game" button
3. Wait for "Joined game successfully!" notification

### **Play Multiplayer**
1. Once in a game, place buildings normally
2. Other players' actions will appear in real-time
3. Use the chat to communicate
4. Click "Leave Game" to exit

## 🔧 Troubleshooting

### **Connection Issues**
- Check if backend server is running on port 5000
- Check browser console for error messages
- Verify your authentication token in localStorage

### **Game Not Syncing**
- Check if both players are in the same game
- Verify WebSocket connection status
- Check console for error messages

### **UI Not Showing**
- Make sure you added the script tags to your HTML
- Check if there are any JavaScript errors
- Verify the multiplayer controls div was created

## 📁 Files You Need

1. **`websocket-manager.js`** - WebSocket connection manager
2. **`multiplayer-integration-simple.js`** - Simple integration with your existing game
3. **Backend server** - Your Node.js/Express server with Socket.io

## 🚀 That's It!

Your City Builder Pro game now has multiplayer support! Players can:
- Create and join games
- Place buildings in real-time
- Chat with other players
- See each other's actions instantly

The integration is designed to work with your existing code with minimal changes.

