console.log('Loading SimpleMultiplayerIntegration class... v2.1');

class SimpleMultiplayerIntegration {
    constructor(mapSystem) {
        console.log('SimpleMultiplayerIntegration constructor called - v20241220-refresh');
        this.mapSystem = mapSystem;
        this.wsManager = new WebSocketManager();
        this.isInMultiplayer = false;
        this.gameStarted = false;
        this.gamePaused = false;
        this.currentRoom = null;
        this.isHost = false; // Track if current player is the host
        this.isCreatingGame = false; // Prevent duplicate create game calls
        this.playerId = null;
        this.playerName = null;
        this.players = new Map();
        this.chatMessages = [];
        this.currentTurn = 0;
        this.turnOrder = [];
        this.pendingActions = new Map();
        this.playerColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
            '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
        ];
        this.hasSyncedBefore = false;
        this.actionsThisTurn = 0.0; // Use decimal for fractional actions
        this.maxActionsPerTurn = 3.0; // Default actions limit
        this.turnTimeLimit = 60; // 60 seconds per turn
        this.turnStartTime = null;
        this.turnTimer = null;
        this.turnTimeRemaining = null; // Track remaining time when paused
        this.turnTimerPaused = false;
        this.playerJustLeft = false; // Track if a player just left to reset timer
        // Leave game now just refreshes the page, no complex state needed
    }

    async initializeMultiplayer() {
        try {
            await this.wsManager.connect();
            this.setupEventHandlers();
            console.log('Multiplayer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
    }

    setupEventHandlers() {
        this.wsManager.on('game_created', (data) => {
            this.currentRoom = data.roomCode;
            this.playerId = data.playerId;
            this.playerName = data.game.players[0].username;
            this.isInMultiplayer = true;
            this.gameStarted = false; // Game not started yet
            this.isHost = true; // Creator is the host
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            this.updatePlayersList(data.game.players);
            this.updateUI();
            this.updateRoomDependentElements();
            
            // Set player ID in resource management
            if (this.mapSystem && this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.setCurrentPlayerId(this.playerId);
            }
            
            // Don't start turn timer until game is started
            // Timer will be started when "Start Game" is pressed
            
            // Start resource updates
            this.startResourceUpdates();
            
            // Start game state updates
            this.startGameStateUpdates();
            
            // Send current map state to server
            setTimeout(() => {
                this.sendMapState();
                console.log('Sent initial map state to server');
            }, 2000); // Wait a bit longer for the game to be fully set up
            
            console.log('Game created:', data.roomCode, 'as', this.playerName);
            console.log('Turn order:', this.turnOrder);
            console.log('Current turn:', this.currentTurn);
        });

        this.wsManager.on('game_joined', (data) => {
            this.currentRoom = data.roomCode;
            this.playerId = data.playerId;
            this.playerName = data.game.players.find(p => p.id === data.playerId)?.username || 'Player';
            this.isInMultiplayer = true;
            
            // Check if game is already started - use multiple indicators
            const gameState = data.game.gameState;
            this.gameStarted = gameState.gameStarted || 
                              (gameState.status === 'active' || gameState.status === 'started') ||
                              (gameState.currentTurn > 0) ||
                              (gameState.cells && gameState.cells.length > 0 && gameState.cells.some(cell => cell.attribute && cell.attribute !== 'grassland'));
            
            this.gamePaused = gameState.gamePaused || false;
            this.isHost = gameState.isHost || false;
            
            console.log('Game joined successfully');
            
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            this.updatePlayersList(data.game.players);
            this.updateUI();
            this.updateRoomDependentElements();
            
            // Set player ID in resource management
            if (this.mapSystem && this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.setCurrentPlayerId(this.playerId);
            }
            
            // Don't start turn timer until game is started
            // Timer will be started when "Start Game" is pressed
            
            // Start resource updates
            this.startResourceUpdates();
            
            // Start game state updates
            this.startGameStateUpdates();
            
            // Sync the map if it exists - force sync when joining
            if (data.game.gameState && data.game.gameState.cells) {
                console.log('Forcing map sync on game join...');
                this.forceMapSync(data.game.gameState.cells);
            }
            
            console.log('Successfully joined game:', data.roomCode, 'as', this.playerName);
            console.log('Turn order:', this.turnOrder);
            console.log('Current turn:', this.currentTurn);
        });

        this.wsManager.on('player_joined', (data) => {
            console.log('Player joined:', data.player.username);
            this.updatePlayersList(data.game.players);
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            
            // Handle game state for new player joining mid-game
            if (data.game.gameState.gameStarted) {
                console.log('Player joined during active game');
                this.gameStarted = true;
                this.gamePaused = data.game.gameState.gamePaused || false;
                
                // Show appropriate message
                if (data.player.username === this.playerName) {
                    this.showNotification('Joined active game! You can start playing immediately.', 'success');
                } else {
                    this.showNotification(`${data.player.username} joined the active game`, 'info');
                }
            }
            
            this.updateUI();
        });

        this.wsManager.on('player_left', (data) => {
            console.log('Player left:', data.playerId);
            console.log('Remaining players:', data.game.players);
            
            // Remove the player from our local players map
            this.players.delete(data.playerId);
            
            // Update with server data
            this.updatePlayersList(data.game.players);
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            
            // Set flag to reset timer on next turn change
            this.playerJustLeft = true;
            
            // Check if it's now our turn and start timer immediately
            if (this.isMyTurn()) {
                console.log('Player left - starting timer with 60s');
                this.turnTimeLimit = 60; // Reset to full 60 seconds
                this.playerJustLeft = false; // Clear the flag
                this.startTurnTimer();
            }
            
            // Handle host transfer if the leaving player was the host
            if (data.wasHost && data.newHost) {
                console.log('Host left, transferring to:', data.newHost);
                this.isHost = (data.newHost === this.playerId);
                
                if (this.isHost) {
                    this.showHostTransferAlert(true, 'You are now the host!');
                    this.showNotification('🎮 You are now the host!', 'success');
                    console.log('You are now the host');
                } else {
                    this.showHostTransferAlert(false, `${data.newHostName} is now the host`);
                    this.showNotification(`${data.newHostName} is now the host`, 'info');
                    console.log('New host:', data.newHostName);
                }
            }
            
            this.updateUI();
            console.log('Player count after leave:', this.players.size);
        });

        this.wsManager.on('turn_changed', (data) => {
            this.currentTurn = data.currentTurn;
            this.turnOrder = data.turnOrder;
            
            // Reset actions for new turn
            this.actionsThisTurn = 0;
            
            // Clear "placedThisTurn" flags for all cells
            this.clearPlacedThisTurnFlags();
            
            // Show alert if it's now our turn
            if (this.isMyTurn()) {
                this.showTurnStartAlert();
                this.showNotification('🎮 It\'s your turn! You have ' + this.maxActionsPerTurn + ' actions.', 'success');
                // Also show browser alert for extra attention
                if (document.hidden) {
                    // Only show alert if tab is not focused
                    setTimeout(() => {
                        alert('🎮 It\'s your turn in City Player Pro!');
                    }, 100);
                }
            }
            
            // Start turn timer if it's our turn
            if (this.isMyTurn()) {
                // If a player just left, reset timer to full 60 seconds
                if (this.playerJustLeft) {
                    console.log('Timer reset to 60s due to player leaving');
                    this.turnTimeLimit = 60; // Reset to full 60 seconds
                    this.playerJustLeft = false; // Clear the flag
                }
                this.startTurnTimer();
            } else {
                this.stopTurnTimer();
            }
            
            // Recalculate resources when turn changes to ensure proper ownership
            if (this.mapSystem && this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.recalculate();
                console.log('Resources recalculated on turn change');
            }
            
            this.updateUI();
            console.log('Turn changed to:', data.currentTurn);
        });

        this.wsManager.on('action_executed', (data) => {
            this.handleActionExecuted(data);
        });

        this.wsManager.on('action_rejected', (data) => {
            this.handleActionRejected(data);
        });

        this.wsManager.on('trade_offer', (data) => {
            this.handleTradeOffer(data);
        });

        this.wsManager.on('trade_completed', (data) => {
            this.handleTradeCompleted(data);
        });

        this.wsManager.on('trade_rejected', (data) => {
            this.handleTradeRejected(data);
        });

        this.wsManager.on('victory_achieved', (data) => {
            this.handleVictoryAchieved(data);
        });

        this.wsManager.on('game_state_update', (data) => {
            console.log('Game state updated:', data);
            this.handleGameStateUpdate(data);
        });

        this.wsManager.on('player_resources_updated', (data) => {
            console.log('Player resources updated:', data);
            this.updatePlayersList(data.game.players);
            this.updateUI();
        });

        // Team management events
        this.wsManager.on('team_created', (data) => {
            this.handleTeamCreated(data);
        });

        this.wsManager.on('team_joined', (data) => {
            this.handleTeamJoined(data);
        });

        this.wsManager.on('team_left', (data) => {
            this.handleTeamLeft(data);
        });

        this.wsManager.on('team_member_joined', (data) => {
            this.handleTeamMemberJoined(data);
        });

        this.wsManager.on('team_member_left', (data) => {
            this.handleTeamMemberLeft(data);
        });

        this.wsManager.on('team_list_updated', (data) => {
            this.handleTeamListUpdated(data);
        });

        // Shared resources events
        this.wsManager.on('shared_resources_updated', (data) => {
            this.handleSharedResourcesUpdated(data);
        });

        this.wsManager.on('shared_resources_failed', (data) => {
            this.handleSharedResourcesFailed(data);
        });

        // Joint projects events
        this.wsManager.on('joint_project_created', (data) => {
            this.handleJointProjectCreated(data);
        });

        this.wsManager.on('project_progress_updated', (data) => {
            this.handleProjectProgressUpdated(data);
        });

        // Team objectives events
        this.wsManager.on('team_objective_created', (data) => {
            this.handleTeamObjectiveCreated(data);
        });

        this.wsManager.on('objectives_completed', (data) => {
            this.handleObjectivesCompleted(data);
        });

        // Team chat events
        this.wsManager.on('team_chat_message', (data) => {
            this.handleTeamChatMessage(data);
        });

        // Map markers events
        this.wsManager.on('map_marker_placed', (data) => {
            this.handleMapMarkerPlaced(data);
        });


        this.wsManager.on('game_creation_failed', (data) => {
            this.handleGameCreationFailed(data);
        });

        this.wsManager.on('game_join_failed', (data) => {
            this.handleGameJoinFailed(data);
        });

        this.wsManager.on('player_disconnected', (data) => {
            this.handlePlayerDisconnected(data);
        });

        // Map state updates
        this.wsManager.on('map_state_updated', (data) => {
            console.log('🗺️ Map state updated event received:', data);
            console.log('🗺️ Cells data:', data.cells);
            console.log('🗺️ Cells length:', data.cells ? data.cells.length : 'undefined');
            console.log('🗺️ First few cells:', data.cells ? data.cells.slice(0, 3) : 'none');
            
            if (data.cells && data.cells.length > 0) {
                console.log('🗺️ Cell data structure:', typeof data.cells[0], data.cells[0]);
                this.syncMap(data.cells);
                this.showNotification('Map synchronized with host', 'success');
            } else {
                console.error('🗺️ No cell data received');
                this.showNotification('No map data received from host', 'error');
            }
        });

        // Handle request for current map (host only)
        this.wsManager.on('request_current_map', (data) => {
            console.log('🗺️ Server requesting current map from host');
            if (this.isHost && this.isInMultiplayer) {
                const mapData = this.getCurrentMapData();
                if (mapData && mapData.length > 0) {
                    console.log('🗺️ Host sending current map data:', mapData.length, 'cells');
                    this.wsManager.send('send_current_map', {
                        roomCode: this.currentRoom,
                        requestingPlayer: data.requestingPlayer,
                        cells: mapData
                    });
                } else {
                    console.error('🗺️ Host has no map data to send');
                }
            }
        });

        // Game control events
        this.wsManager.on('game_started', (data) => {
            console.log('Game started by', data.startedBy);
            
            this.gameStarted = true;
            this.gamePaused = false; // Reset pause state when game starts
            
            // Start turn timer if it's our turn
            if (this.isMyTurn()) {
                this.startTurnTimer();
            }
            
            this.updateUI();
            
            // Force show game started elements
            const gameStartedElements = document.querySelectorAll('.game-started-dependent');
            gameStartedElements.forEach(element => {
                element.style.display = 'block';
            });
            
            this.showNotification(`Game started by ${data.startedBy}!`, 'success');
        });

        this.wsManager.on('game_paused', (data) => {
            console.log('Game paused by', data.playerName);
            this.gamePaused = true;
            
            // Pause the turn timer
            if (this.turnTimer) {
                this.turnTimeRemaining = Math.max(0, Math.floor(this.turnTimeLimit - (Date.now() - this.turnStartTime) / 1000));
                this.stopTurnTimer();
                this.turnTimerPaused = true;
                console.log('Turn timer paused, remaining time:', this.turnTimeRemaining);
            }
            
            this.updateUI();
            this.showNotification(`Game paused by ${data.playerName}`, 'warning');
        });

        this.wsManager.on('game_unpaused', (data) => {
            console.log('Game unpaused by', data.playerName);
            this.gamePaused = false;
            
            // Resume the turn timer if it was paused and it's our turn
            if (this.turnTimerPaused && this.turnTimeRemaining > 0 && this.isMyTurn()) {
                // Temporarily set the time limit to the remaining time for this turn only
                const originalTimeLimit = this.turnTimeLimit;
                this.turnTimeLimit = this.turnTimeRemaining;
                this.startTurnTimer();
                this.turnTimerPaused = false;
                // Reset to original time limit for future turns
                this.turnTimeLimit = originalTimeLimit;
                console.log('Turn timer resumed, remaining time:', this.turnTimeRemaining);
            }
            
            this.updateUI();
            this.showNotification(`Game unpaused by ${data.playerName}`, 'success');
        });

        // Handle server errors
        this.wsManager.on('error', (data) => {
            console.error('Server error:', data.message);
            this.showNotification(data.message, 'error');
        });

        // Handle pong response to test server communication
        this.wsManager.on('pong', (data) => {
            console.log('Server responded to ping:', data);
        });

        // Debug: Log specific events only (removed onAny to prevent flooding)

        // Listen for connection status changes
        this.wsManager.socket.on('connect', () => {
            console.log('WebSocket connected, updating UI');
            this.updateUI();
        });

        this.wsManager.socket.on('disconnect', () => {
            console.log('WebSocket disconnected, updating UI');
            this.updateUI();
        });

        this.wsManager.on('websocket_disconnected', (data) => {
            console.log('WebSocket disconnected event received:', data);
            if (this.isInMultiplayer) {
                console.log('Was in multiplayer, resetting state due to disconnect');
                this.resetLocalMultiplayerState();
                this.showNotification('Connection lost. Please refresh to reconnect.', 'warning');
            } else {
                // Even if not in multiplayer, ensure UI is in initial state
                this.resetUIToInitialState();
            }
        });
    }

    showMultiplayerUI() {
        console.log('showMultiplayerUI called');
        
        // Don't create the panel here - let tab management handle it
        console.log('Multiplayer UI setup complete - panel will be created when switching to multiplayer tab');
        
        this.setupTabListeners();
        this.updateUI();
        this.updateRoomDependentElements();
        console.log('Multiplayer UI setup complete');
    }

    updateRoomDependentElements() {
        const roomDependentElements = document.querySelectorAll('.room-dependent');
        const hasRoom = this.currentRoom && this.currentRoom !== 'None';
        
        roomDependentElements.forEach(element => {
            if (hasRoom) {
                element.style.display = element.classList.contains('stat-item') ? 'flex' : 'block';
            } else {
                element.style.display = 'none';
            }
        });
    }

    updateGameStartedDependentElements() {
        const gameStartedElements = document.querySelectorAll('.game-started-dependent');
        
        gameStartedElements.forEach(element => {
            if (element.id === 'sync-map-btn') {
                // Sync map button only visible to non-hosts when game started
                const shouldShow = (this.gameStarted && !this.isHost);
                element.style.display = shouldShow ? 'block' : 'none';
            } else {
                // Other game started elements visible to all players when game started
                const shouldShow = this.gameStarted;
                element.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }

    updateFixedNextTurnButton() {
        const nextTurnContainer = document.querySelector('.next-turn-container');
        const nextTurnFixedBtn = document.getElementById('next-turn-fixed-btn');
        if (!nextTurnContainer || !nextTurnFixedBtn) return;

        // Show container only when in multiplayer and game has started
        if (this.isInMultiplayer && this.gameStarted) {
            nextTurnContainer.style.display = 'flex';
            
            // Enable/disable based on turn and pause state
            const isMyTurn = this.isMyTurn();
            const isDisabled = !isMyTurn || this.gamePaused;
            nextTurnFixedBtn.disabled = isDisabled;
            
            if (this.gamePaused) {
                nextTurnFixedBtn.textContent = 'Game Paused';
                nextTurnFixedBtn.style.background = '#ff9800';
            } else if (isMyTurn) {
                nextTurnFixedBtn.textContent = 'Next Turn';
                nextTurnFixedBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            } else {
                nextTurnFixedBtn.textContent = 'Not Your Turn';
                nextTurnFixedBtn.style.background = '#ccc';
            }
            
            // Update action counter
            this.updateActionCounter();
        } else {
            nextTurnContainer.style.display = 'none';
        }
    }
    
    updateActionCounter() {
        const actionCounter = document.getElementById('action-counter-fixed');
        if (!actionCounter) return;
        
        const actionsLeft = this.maxActionsPerTurn - this.actionsThisTurn;
        // Format fractional actions nicely
        const displayActionsLeft = actionsLeft % 1 === 0 ? actionsLeft.toString() : actionsLeft.toFixed(1);
        const displayMaxActions = this.maxActionsPerTurn % 1 === 0 ? this.maxActionsPerTurn.toString() : this.maxActionsPerTurn.toFixed(1);
        actionCounter.textContent = `${displayActionsLeft}/${displayMaxActions}`;
        
        // Update color based on actions remaining
        actionCounter.classList.remove('low-actions', 'no-actions');
        if (actionsLeft <= 0) {
            actionCounter.classList.add('no-actions');
        } else if (actionsLeft <= 1) {
            actionCounter.classList.add('low-actions');
        }
    }

    setupTabListeners() {
        // Listen for tab changes by monitoring the body data-tab attribute
        // This integrates with the existing TabManagement system
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-tab') {
                    const tabType = document.body.getAttribute('data-tab');
                    console.log('Tab changed via TabManagement to:', tabType);
                    this.handleTabChange(tabType);
                }
            });
        });
        
        // Start observing the body element for data-tab changes
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-tab']
        });
        
        // Check initial tab state
        const initialTab = document.body.getAttribute('data-tab') || 'builder';
        console.log('Initial tab type:', initialTab);
        this.handleTabChange(initialTab);
    }

    handleTabChange(tabType) {
        console.log('Tab changed to:', tabType);
        
        if (tabType === 'player') {
            // Enable general info and multiplayer tabs in sidebar
            const generalInfoTab = document.querySelector('[data-sidebar-tab="general-info"]');
            const multiplayerTab = document.querySelector('[data-sidebar-tab="multiplayer"]');
            
            if (generalInfoTab) {
                generalInfoTab.style.display = 'block';
            }
            if (multiplayerTab) {
                multiplayerTab.style.display = 'block';
            }
            
            // Set up sidebar tabs if not already done
            if (!this.sidebarTabsSetup) {
                this.setupSidebarTabs();
                this.sidebarTabsSetup = true;
            }
            
            console.log('City Player Pro tab activated - sidebar tabs enabled');
        } else {
            // Hide general info and multiplayer tabs in sidebar
            const generalInfoTab = document.querySelector('[data-sidebar-tab="general-info"]');
            const multiplayerTab = document.querySelector('[data-sidebar-tab="multiplayer"]');
            
            if (generalInfoTab) {
                generalInfoTab.style.display = 'none';
            }
            if (multiplayerTab) {
                multiplayerTab.style.display = 'none';
            }
            
            // Switch back to general info tab if multiplayer was active
            const activeSidebarTab = document.querySelector('.sidebar-tab.active');
            if (activeSidebarTab && activeSidebarTab.getAttribute('data-sidebar-tab') === 'multiplayer') {
                this.switchSidebarTab('general-info');
            }
            
            console.log('Tab changed to', tabType, '- sidebar tabs hidden');
        }
    }

    createMultiplayerPanel() {
        console.log('Creating multiplayer panel in tab system...');
        
        // Get the multiplayer tab content area
        const multiplayerTab = document.getElementById('multiplayer-tab');
        if (!multiplayerTab) {
            console.error('Multiplayer tab not found!');
            return;
        }
        
        // Clear any existing content
        multiplayerTab.innerHTML = '';
        
        // Create the multiplayer content
        multiplayerTab.innerHTML = `
            <div class="multiplayer-content">
            <!-- Room Controls with Status in Gap (shown when not in room) -->
            <div class="room-controls-section" id="room-controls-section">
                <div class="room-controls-header">
                    <h5>Room Controls</h5>
                    <div class="status-inline">
                        <span class="status-value" id="connection-status">Disconnected</span>
                    </div>
                </div>
                <div class="room-controls">
                    <input type="text" id="room-id-input" placeholder="Enter Room ID" class="multiplayer-input">
                    <button id="join-room-btn" class="multiplayer-btn small">Join Room</button>
                    <button id="create-room-btn" class="multiplayer-btn small">Create Room</button>
                </div>
                <div class="room-info-inline">
                    <span class="room-label">Room:</span>
                    <span class="room-value" id="room-info">None</span>
                </div>
            </div>

            <!-- Players List (shown when in room, before game starts) -->
            <div class="players-main-section" id="players-main-section" style="display: none;">
                <div class="players-main-header">
                    <h5>Players in Room</h5>
                    <div class="status-inline">
                        <span class="status-value" id="connection-status-main">Disconnected</span>
                    </div>
                </div>
                <div class="players-main-list" id="players-main-list">
                    <div class="no-players">No players connected</div>
                </div>
                <div class="room-info-main">
                    <span class="room-label">Room:</span>
                    <span class="room-value" id="room-info-main">None</span>
                </div>
                <div class="start-game-section">
                    <button id="start-game-btn" class="multiplayer-btn primary" disabled>Start Game</button>
                    <div class="start-game-info">Waiting for players to join...</div>
                </div>
            </div>
                
                <!-- Additional Status (Hidden until game started) -->
                <div class="additional-status game-started-dependent" style="display: none;">
                    <div class="stat-item">
                        <span class="stat-label">Players:</span>
                        <span class="stat-value" id="players-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Turn:</span>
                        <span class="stat-value" id="current-turn">1</span>
                    </div>
                    <!-- Timer moved to next to green Next Turn button -->
                    <div class="stat-item">
                        <span class="stat-label">Actions:</span>
                        <span class="stat-value" id="actions-left">3/3</span>
                    </div>
                </div>
                
                <!-- Action Buttons (Hidden until game started) -->
                <div class="multiplayer-actions game-started-dependent" style="display: none;">
                    <button id="sync-map-btn" class="multiplayer-btn secondary">Sync Map</button>
                    <button id="pause-game-btn" class="multiplayer-btn warning">Pause Game</button>
                </div>
                
                <!-- Dropdown Toggle -->
                <div class="dropdown-toggle">
                    <button id="multiplayer-toggle" class="multiplayer-btn dropdown">▼ More Options</button>
                </div>
                
                <!-- Dropdown Content -->
                <div class="dropdown-content" id="multiplayer-dropdown" style="display: none;">
                    
                    
                    <!-- Players List -->
                    <div class="dropdown-section">
                        <h5>Players</h5>
                        <div id="players-list" class="players-list">
                            <div class="no-players">No players connected</div>
                        </div>
                    </div>
                    
                    <!-- Additional Actions -->
                    <div class="dropdown-section">
                        <h5>Actions</h5>
                        <div class="action-buttons">
                            <button id="refresh-btn" class="multiplayer-btn small">Refresh</button>
                            <button id="leave-room-btn" class="multiplayer-btn small danger">Leave Room</button>
                        </div>
                    </div>
                    
                    <!-- Team Panel -->
                    <div class="dropdown-section">
                        <h5>Team</h5>
                        <div class="team-panel">
                            <input type="text" id="team-name-input" placeholder="Team Name" class="multiplayer-input">
                            <button id="create-team-btn" class="multiplayer-btn small">Create Team</button>
                            <button id="join-team-btn" class="multiplayer-btn small">Join Team</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Set the multiplayer panel reference to the tab content
        this.multiplayerPanel = multiplayerTab;
        
        this.setupUIEventListeners();
        this.setupSidebarTabs();
        console.log('Multiplayer panel created in tab system');
    }

    setupSidebarTabs() {
        console.log('Setting up sidebar tabs...');
        
        // Add event listeners to sidebar tabs
        const sidebarTabs = document.querySelectorAll('.sidebar-tab');
        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-sidebar-tab');
                this.switchSidebarTab(tabType);
            });
        });
        
        // Set initial active tab
        this.switchSidebarTab('general-info');
    }

    switchSidebarTab(tabType) {
        console.log('Switching sidebar tab to:', tabType);
        
        // Remove active class from all tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        const activeTab = document.querySelector(`[data-sidebar-tab="${tabType}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Hide all tab content
        document.querySelectorAll('.sidebar-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab content
        const selectedContent = document.getElementById(`${tabType}-tab`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
        
        // Special handling for general info tab - only show in player mode
        if (tabType === 'general-info') {
            const currentMainTab = document.body.getAttribute('data-tab');
            if (currentMainTab !== 'player') {
                // Switch back to general info if not in player mode (this shouldn't happen)
                this.switchSidebarTab('general-info');
                return;
            }
        }
        
        // Special handling for multiplayer tab - create content if needed
        if (tabType === 'multiplayer') {
            const currentMainTab = document.body.getAttribute('data-tab');
            if (currentMainTab === 'player') {
                // Only create multiplayer content if we're in player mode
                if (!this.multiplayerPanel || this.multiplayerPanel.innerHTML.trim() === '') {
                    console.log('Creating multiplayer content for multiplayer tab');
                    this.createMultiplayerPanel();
                }
            } else {
                // If not in player mode, switch back to resources
                this.switchSidebarTab('resources');
                return;
            }
        }
    }

    setupUIEventListeners() {
        console.log('Setting up UI event listeners...');
        
        // Toggle functionality for dropdown
        const toggleBtn = document.getElementById('multiplayer-toggle');
        const dropdown = document.getElementById('multiplayer-dropdown');
        
        if (toggleBtn && dropdown) {
            let isDropdownOpen = false;
            
            const toggleDropdown = () => {
                isDropdownOpen = !isDropdownOpen;
                if (isDropdownOpen) {
                    dropdown.style.display = 'block';
                    toggleBtn.textContent = '▲';
                } else {
                    dropdown.style.display = 'none';
                    toggleBtn.textContent = '▼';
                }
            };
            
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleDropdown();
            });
        }
        
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        const leaveBtn = document.getElementById('leave-room-btn');
        
        if (createBtn) {
            console.log('Create game button found, adding listener');
            // Remove any existing listeners to prevent duplicates
            createBtn.removeEventListener('click', this.createGame);
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Create game button clicked!');
                this.createGame();
            });
        } else {
            console.error('Create game button not found!');
        }
        
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.joinGame());
        }
        
        if (leaveBtn) {
            console.log('Leave room button found, adding event listener');
            leaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Leave room button clicked! Refreshing page...');
                window.location.reload();
            });
        } else {
            console.error('Leave room button not found!');
        }
        
        // Add a test function to window for debugging
        window.testLeaveRoom = () => {
            console.log('Manual leave room test called');
            this.leaveGame();
        };


        // Blue Next Turn button removed - using only the fixed green button

        const syncMapBtn = document.getElementById('sync-map-btn');
        if (syncMapBtn) {
            syncMapBtn.addEventListener('click', () => {
                console.log('Manual map sync requested');
                if (this.isInMultiplayer) {
                    // Everyone can sync, but it always gets the host's map
                    this.requestHostMapSync();
                    this.showNotification('Syncing with host\'s map...', 'info');
                } else {
                    this.showNotification('Not in multiplayer mode', 'error');
                }
            });
        }

        const refreshMapBtn = document.getElementById('refresh-map-btn');
        if (refreshMapBtn) {
            refreshMapBtn.addEventListener('click', () => {
                console.log('Manual map refresh requested');
                this.forceMapRerender();
                this.showNotification('Map refreshed', 'info');
            });
        }

        const initiateTradeBtn = document.getElementById('initiate-trade-btn');
        if (initiateTradeBtn) {
            initiateTradeBtn.addEventListener('click', () => this.showTradeDialog());
        }

        // Team management buttons
        const createTeamBtn = document.getElementById('create-team-btn');
        if (createTeamBtn) {
            createTeamBtn.addEventListener('click', () => this.showCreateTeamDialog());
        }

        const joinTeamBtn = document.getElementById('join-team-btn');
        if (joinTeamBtn) {
            joinTeamBtn.addEventListener('click', () => this.showJoinTeamDialog());
        }

        const leaveTeamBtn = document.getElementById('leave-team-btn');
        if (leaveTeamBtn) {
            leaveTeamBtn.addEventListener('click', () => this.leaveTeam());
        }

        // Start game button - simplified approach
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            // Remove any existing listeners first
            startGameBtn.onclick = null;
            
            // Use simple onclick for reliability
            startGameBtn.onclick = (e) => {
                console.log('🚀 BUTTON CLICKED!');
                e.preventDefault();
                e.stopPropagation();
                this.startGame();
            };
            
        } else {
            console.error('❌ Start game button not found!');
        }

        // Fixed Next Turn button
        const nextTurnFixedBtn = document.getElementById('next-turn-fixed-btn');
        if (nextTurnFixedBtn) {
            nextTurnFixedBtn.addEventListener('click', () => this.advanceTurn());
        }

        // Pause Game button
        const pauseGameBtn = document.getElementById('pause-game-btn');
        if (pauseGameBtn) {
            pauseGameBtn.addEventListener('click', () => this.toggleGamePause());
        }
    }

    updatePlayersList(players) {
        console.log('updatePlayersList called with:', players);
        this.players.clear();
        players.forEach(player => {
            this.players.set(player.id, player);
        });
        console.log('Players map updated, size:', this.players.size);
        this.updatePlayersDisplay();
    }

    updatePlayersDisplay() {
        const playersContainer = document.getElementById('players-list');
        console.log('updatePlayersDisplay called, players container found:', !!playersContainer);
        if (!playersContainer) return;

        playersContainer.innerHTML = '';
        console.log('Updating players display with', this.players.size, 'players');
        this.players.forEach((player, playerId) => {
            const playerDiv = document.createElement('div');
            playerDiv.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding: 5px;
                background: rgba(255,255,255,0.1);
                border-radius: 5px;
            `;
            
            const isCurrentPlayer = playerId === this.playerId;
            const isCurrentTurn = this.turnOrder[this.currentTurn] === playerId;
            
            // Ensure resources exist and have default values
            const resources = player.resources || { wood: 0, ore: 0, power: 0, commercialGoods: 0 };
            
            playerDiv.innerHTML = `
                <div style="width: 12px; height: 12px; border-radius: 50%; background: ${player.color}; margin-right: 8px; ${isCurrentTurn ? 'box-shadow: 0 0 8px #fff;' : ''}"></div>
                <div style="flex: 1;">
                    <div style="font-weight: ${isCurrentPlayer ? 'bold' : 'normal'}; color: ${isCurrentPlayer ? '#FFD700' : '#2c3e50'};">${player.username} ${isCurrentPlayer ? '(You)' : ''}</div>
                    <div style="font-size: 12px; opacity: 0.8; color: #2c3e50;">
                        Wood: ${Math.floor(resources.wood || 0)} | Ore: ${Math.floor(resources.ore || 0)} | Power: ${Math.floor(resources.power || 0)}
                    </div>
                </div>
                ${isCurrentTurn ? '<div style="color: #4CAF50; font-weight: bold;">TURN</div>' : ''}
            `;
            
            playersContainer.appendChild(playerDiv);
        });
    }

    updateUI() {
        const statusText = document.getElementById('connection-status');
        const statusTextMain = document.getElementById('connection-status-main');
        const roomControlsSection = document.getElementById('room-controls-section');
        const playersMainSection = document.getElementById('players-main-section');
        const gameStats = document.getElementById('game-stats');
        const playersList = document.getElementById('players-list');
        const actionButtons = document.getElementById('action-buttons');
        const teamPanel = document.getElementById('team-panel');
        
        // Only log if we're in multiplayer mode to avoid spam
        if (this.isInMultiplayer) {
            console.log('UI elements found:', {
                statusText: !!statusText,
                statusTextMain: !!statusTextMain,
                roomControlsSection: !!roomControlsSection,
                playersMainSection: !!playersMainSection,
                gameStats: !!gameStats,
                playersList: !!playersList,
                actionButtons: !!actionButtons,
                teamPanel: !!teamPanel
            });
        }

        console.log('Updating connection status. isConnected:', this.wsManager.isConnected);
        if (this.wsManager.isConnected) {
            if (statusText) {
                statusText.textContent = 'Connected';
                statusText.style.color = '#28a745';
            }
            if (statusTextMain) {
                statusTextMain.textContent = 'Connected';
                statusTextMain.style.color = '#28a745';
            }
            console.log('Status updated to: Connected');
        } else {
            if (statusText) {
                statusText.textContent = 'Disconnected';
                statusText.style.color = '#dc3545';
            }
            if (statusTextMain) {
                statusTextMain.textContent = 'Disconnected';
                statusTextMain.style.color = '#dc3545';
            }
            console.log('Status updated to: Disconnected');
        }

        if (this.isInMultiplayer) {
            // Hide room controls, show players main section
            if (roomControlsSection) roomControlsSection.style.display = 'none';
            if (playersMainSection) playersMainSection.style.display = 'block';
            
            // Update room info in main section
            const roomInfoMain = document.getElementById('room-info-main');
            if (roomInfoMain) roomInfoMain.textContent = this.currentRoom;
            
            // Update players list in main section
            this.updatePlayersMainDisplay();
            
            // Update start game button
            this.updateStartGameButton();
            
            // Update game started dependent elements
            this.updateGameStartedDependentElements();
            
        // Update fixed Next Turn button
        this.updateFixedNextTurnButton();
        
        // Ensure timer is running if it's our turn and game is started
        if (this.isInMultiplayer && this.gameStarted && this.isMyTurn() && !this.gamePaused) {
            if (!this.turnTimer) {
                console.log('Timer auto-started from updateUI');
                this.startTurnTimer();
            }
        }
            
            if (this.gameStarted) {
                // Game has started - hide players main section, show game controls
                if (playersMainSection) playersMainSection.style.display = 'none';
                
                console.log('🎮 Game started - showing game controls and stats');
                
                const roomInfo = document.getElementById('room-info');
                if (roomInfo) roomInfo.textContent = this.currentRoom;
                
                const playersCount = document.getElementById('players-count');
                if (playersCount) playersCount.textContent = this.players.size;
                
                const currentTurn = document.getElementById('current-turn');
                if (currentTurn) currentTurn.textContent = this.currentTurn + 1;
                
                // Update actions left display
                const actionsLeft = this.maxActionsPerTurn - this.actionsThisTurn;
                const actionsLeftElement = document.getElementById('actions-left');
                if (actionsLeftElement) {
                    actionsLeftElement.textContent = `${actionsLeft}/${this.maxActionsPerTurn}`;
                    actionsLeftElement.style.color = actionsLeft > 0 ? '#4CAF50' : '#f44336';
                    console.log('Actions left updated:', `${actionsLeft}/${this.maxActionsPerTurn}`);
                } else {
                    console.log('Actions left element not found!');
                }
                
                // Blue Next Turn button removed - using only the fixed green button

                // Update pause button
                const pauseBtn = document.getElementById('pause-game-btn');
                if (pauseBtn) {
                    pauseBtn.textContent = this.gamePaused ? 'Unpause Game' : 'Pause Game';
                    pauseBtn.className = this.gamePaused ? 'multiplayer-btn success' : 'multiplayer-btn warning';
                }
                
                this.updatePlayersDisplay();
            } else {
                // In room but game not started - show players list
                console.log('🎮 In room but game not started - showing players list');
            }
        } else {
            // Not in multiplayer - show room controls only
            if (roomControlsSection) roomControlsSection.style.display = 'block';
            if (playersMainSection) playersMainSection.style.display = 'none';
            
            // Hide quick actions when not in multiplayer
            const quickActions = document.getElementById('quick-actions');
            if (quickActions) quickActions.style.display = 'none';
            
            // Update fixed Next Turn button (will hide it)
            this.updateFixedNextTurnButton();
            
            console.log('Not in multiplayer - showing room controls only');
        }
    }

    updatePlayersMainDisplay() {
        const playersMainList = document.getElementById('players-main-list');
        if (!playersMainList) return;

        playersMainList.innerHTML = '';
        
        if (this.players.size === 0) {
            playersMainList.innerHTML = '<div class="no-players">No players connected</div>';
            return;
        }

        this.players.forEach((player, playerId) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            
            const isCurrentPlayer = playerId === this.playerId;
            const resources = player.resources || { wood: 0, ore: 0, power: 0, commercialGoods: 0 };
            
            playerDiv.innerHTML = `
                <div class="player-color" style="background: ${player.color};"></div>
                <div class="player-info">
                    <div class="player-name">${player.username} ${isCurrentPlayer ? '(You)' : ''}</div>
                    <div class="player-resources">Wood: ${Math.floor(resources.wood || 0)} | Ore: ${Math.floor(resources.ore || 0)} | Power: ${Math.floor(resources.power || 0)}</div>
                </div>
            `;
            
            playersMainList.appendChild(playerDiv);
        });
    }

    updateStartGameButton() {
        const startGameBtn = document.getElementById('start-game-btn');
        const startGameInfo = document.querySelector('.start-game-info');
        
        console.log('🔧 updateStartGameButton called - gameStarted:', this.gameStarted, 'isHost:', this.isHost, 'players:', this.players.size);
        
        if (!startGameBtn) {
            console.error('❌ Start game button not found!');
            return;
        }
        
        // If game is already started, hide start game section entirely
        if (this.gameStarted) {
            console.log('✅ Game already started, hiding start game section - gameStarted:', this.gameStarted);
            startGameBtn.style.display = 'none';
            if (startGameInfo) {
                startGameInfo.textContent = `Game is active! (${this.players.size} players)`;
                startGameInfo.style.color = '#4CAF50';
                console.log('✅ Updated start game info to show active game');
            }
            return;
        }
        
        // Only show start game button to the host (room creator)
        if (this.isHost) {
            console.log('Host detected, showing start game button');
            startGameBtn.style.display = 'block';
            
            // Enable button if there are at least 2 players
            if (this.players.size >= 2) {
                startGameBtn.disabled = false;
                startGameBtn.textContent = 'Start Game';
                if (startGameInfo) {
                    startGameInfo.textContent = `Ready to start! (${this.players.size} players)`;
                    startGameInfo.style.color = '#4CAF50';
                }
            } else {
                startGameBtn.disabled = true;
                startGameBtn.textContent = 'Start Game';
                if (startGameInfo) {
                    startGameInfo.textContent = `Waiting for players to join... (${this.players.size}/2)`;
                    startGameInfo.style.color = '#ff9800';
                }
            }
        } else {
            // Hide button for non-hosts
            console.log('❌ Non-host detected, hiding start game button - gameStarted:', this.gameStarted, 'isHost:', this.isHost);
            startGameBtn.style.display = 'none';
            if (startGameInfo) {
                startGameInfo.textContent = `Waiting for host to start game... (${this.players.size} players)`;
                startGameInfo.style.color = '#2196F3';
                console.log('❌ Set message to "Waiting for host to start game" - THIS IS WRONG IF GAME IS STARTED!');
            }
        }
    }

    startGame() {
        // Show immediate feedback
        this.showNotification('Starting game...', 'info');
        
        if (!this.isHost) {
            console.log('❌ Only host can start the game');
            this.showNotification('Only the host can start the game', 'error');
            return;
        }
        
        if (!this.currentRoom) {
            console.log('❌ No room');
            this.showNotification('No room to start game in', 'error');
            return;
        }

        if (this.players.size < 2) {
            console.log('❌ Not enough players:', this.players.size);
            this.showNotification('Need at least 2 players to start the game', 'error');
            return;
        }

        console.log('Generating terrain...');
        
        // Generate terrain first
        this.generateTerrainForGame();
        
        // Wait a moment for terrain generation to complete
        setTimeout(() => {
            // Get map data after generation
            const mapData = this.getCurrentMapData();
            console.log('🗺️ Map data ready:', mapData ? mapData.length : 'null', 'cells');
            
            // Check WebSocket connection
            console.log('🔌 WebSocket connected:', this.wsManager.isConnected);
            console.log('🔌 WebSocket socket exists:', !!this.wsManager.socket);
            
            // Send start game message to server with map data
            this.wsManager.send('start_game', {
                roomCode: this.currentRoom,
                playerId: this.playerId,
                mapData: mapData
            });
            
            console.log('📤 Start game message with map data sent!');
        }, 500); // Wait 500ms for terrain generation
        
        // Add a fallback - if server doesn't respond in 5 seconds, start locally
        setTimeout(() => {
            if (!this.gameStarted) {
                console.log('⚠️ Server did not respond after 5 seconds, starting game locally...');
                console.log('⚠️ This means other players will NOT see the game start');
                this.gameStarted = true;
                this.gamePaused = false;
                this.updateUI();
                this.showNotification('Game started locally (server may be offline)', 'warning');
                
                // Start turn timer if it's our turn
                if (this.isMyTurn()) {
                    this.startTurnTimer();
                }
            }
        }, 5000);
    }

    generateTerrainForGame() {
        console.log('🌍 Generating terrain for multiplayer game...');
        
        // Try different ways to generate terrain
        let terrainGenerated = false;
        
        // Method 1: this.mapSystem.mapGenerator
        if (this.mapSystem && this.mapSystem.mapGenerator && this.mapSystem.mapGenerator.generateMap) {
            try {
                this.mapSystem.mapGenerator.generateMap();
                console.log('✅ Terrain generated via mapSystem.mapGenerator');
                terrainGenerated = true;
            } catch (e) {
                console.log('❌ mapSystem.mapGenerator failed:', e);
            }
        }
        
        // Method 2: this.mapSystem.generateMap
        if (!terrainGenerated && this.mapSystem && this.mapSystem.generateMap) {
            try {
                this.mapSystem.generateMap();
                console.log('✅ Terrain generated via mapSystem.generateMap');
                terrainGenerated = true;
            } catch (e) {
                console.log('❌ mapSystem.generateMap failed:', e);
            }
        }
        
        // Method 3: window.mapSystem
        if (!terrainGenerated && window.mapSystem) {
            try {
                if (window.mapSystem.mapGenerator && window.mapSystem.mapGenerator.generateMap) {
                    window.mapSystem.mapGenerator.generateMap();
                    console.log('✅ Terrain generated via window.mapSystem.mapGenerator');
                    terrainGenerated = true;
                } else if (window.mapSystem.generateMap) {
                    window.mapSystem.generateMap();
                    console.log('✅ Terrain generated via window.mapSystem.generateMap');
                    terrainGenerated = true;
                }
            } catch (e) {
                console.log('❌ window.mapSystem failed:', e);
            }
        }
        
        // Method 4: Direct function call
        if (!terrainGenerated && typeof window.generateMap === 'function') {
            try {
                window.generateMap();
                console.log('✅ Terrain generated via window.generateMap');
                terrainGenerated = true;
            } catch (e) {
                console.log('❌ window.generateMap failed:', e);
            }
        }
        
        if (!terrainGenerated) {
            console.log('❌ No terrain generation method found');
            return;
        }
        
        // Force a map refresh to ensure it's displayed
        setTimeout(() => {
            if (this.mapSystem && this.mapSystem.forceMapRerender) {
                this.mapSystem.forceMapRerender();
            } else if (window.mapSystem && window.mapSystem.forceMapRerender) {
                window.mapSystem.forceMapRerender();
            } else if (typeof window.forceMapRerender === 'function') {
                window.forceMapRerender();
            }
        }, 100);
    }

    getCurrentMapData() {
        console.log('🗺️ Getting current map data...');
        
        let cells = null;
        
        // Try different ways to get map data
        if (this.mapSystem && this.mapSystem.cells) {
            cells = this.mapSystem.cells;
            console.log('✅ Using mapSystem.cells');
        } else if (window.mapSystem && window.mapSystem.cells) {
            cells = window.mapSystem.cells;
            console.log('✅ Using window.mapSystem.cells');
        } else {
            console.log('❌ No map cells found');
            return null;
        }
        
        // Get the current map cells - convert 2D array to 1D array with coordinates
        const mapData = [];
        for (let row = 0; row < cells.length; row++) {
            for (let col = 0; col < cells[row].length; col++) {
                const cell = cells[row][col];
                mapData.push({
                    x: col,
                    y: row,
                    attribute: cell.attribute,
                    class: cell.class,
                    building: cell.building,
                    playerId: cell.playerId || null
                });
            }
        }
        
        console.log('✅ Map data retrieved:', mapData.length, 'cells');
        return mapData;
    }

    toggleGamePause() {
        if (this.gamePaused) {
            this.unpauseGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        console.log('Pausing game...');
        
        // Send pause game message to server
        this.wsManager.send('pause_game', {
            roomCode: this.currentRoom,
            playerId: this.playerId
        });
    }

    unpauseGame() {
        console.log('Unpausing game...');
        
        // Send unpause game message to server
        this.wsManager.send('unpause_game', {
            roomCode: this.currentRoom,
            playerId: this.playerId
        });
    }

    createGame() {
        console.log('createGame() called');
        
        // Prevent multiple calls
        if (this.isCreatingGame) {
            console.log('Already creating game, ignoring duplicate call');
            return;
        }
        this.isCreatingGame = true;
        
        const playerName = prompt('Enter your name:') || 'Player';
        console.log('Player name entered:', playerName);
        
        if (!playerName || playerName.trim() === '') {
            console.log('No player name entered, aborting');
            this.isCreatingGame = false;
            return;
        }
        
        // Use default game mode (removed game mode selection)
        const gameMode = 'free_for_all';
        console.log('WebSocket connected:', this.wsManager.isConnected);
        
        if (!this.wsManager.isConnected) {
            console.error('WebSocket not connected, cannot create game');
            this.isCreatingGame = false;
            return;
        }
        
        console.log('Sending create_game message...');
        this.wsManager.send('create_game', {
            playerName: playerName,
            gameMode: gameMode
        });
        console.log('create_game message sent');
        
        // Reset flag after a delay
        setTimeout(() => {
            this.isCreatingGame = false;
        }, 1000);
    }

    joinGame() {
        const roomCode = document.getElementById('room-id-input').value.trim();
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        
        if (!this.wsManager.isConnected) {
            this.showNotification('Not connected to server. Please refresh the page.', 'error');
            return;
        }
        
        const playerName = prompt('Enter your name:') || 'Player';
        console.log('Attempting to join game:', { roomCode, playerName });
        console.log('WebSocket connected:', this.wsManager.isConnected);
        
        // Set a timeout to detect if join fails
        const joinTimeout = setTimeout(() => {
            this.showNotification('Join request timed out. Server may be unavailable.', 'error');
        }, 10000);
        
        // Clear timeout when we get a response
        const originalHandler = this.wsManager.eventHandlers.get('game_joined');
        this.wsManager.on('game_joined', (data) => {
            clearTimeout(joinTimeout);
            if (originalHandler) originalHandler(data);
        });
        
        this.wsManager.send('join_game', {
            roomCode: roomCode,
            playerName: playerName
        });
    }

    async leaveGame() {
        // Prevent multiple leave attempts
        if (this.leaveInProgress) {
            console.log('Leave already in progress, ignoring request');
            return;
        }
        
        this.leaveInProgress = true;
        console.log('🔄 Leaving game...');
        console.log('WebSocket connected:', this.wsManager.isConnected);
        console.log('Current room:', this.currentRoom);
        console.log('Current players:', this.players.size);
        
        // Show immediate visual feedback that leave is in progress
        const leaveBtn = document.getElementById('leave-room-btn');
        if (leaveBtn) {
            leaveBtn.textContent = 'Leaving...';
            leaveBtn.disabled = true;
            leaveBtn.style.opacity = '0.6';
        }
        
        // Immediately reset UI to show leaving state
        console.log('🔄 Immediately resetting UI to disconnected state...');
        this.resetUIToInitialState();
        
        // Clear any existing leave timeout to prevent conflicts
        if (this.leaveTimeout) {
            clearTimeout(this.leaveTimeout);
            this.leaveTimeout = null;
        }
        
        // If not connected, just reset local state
        if (!this.wsManager.isConnected) {
            console.log('Not connected to server, just resetting local state');
            this.resetLocalMultiplayerState();
            this.leaveInProgress = false;
            return;
        }
        
        // Send leave game message to server
        console.log('📤 Sending leave_game message...');
        this.wsManager.send('leave_game', {
            roomCode: this.currentRoom,
            playerId: this.playerId,
            playerName: this.playerName
        });
        
        // Set a timeout to force disconnect if server doesn't respond
        this.leaveTimeout = setTimeout(async () => {
            console.log('⏰ Leave game timeout, forcing disconnect');
            await this.forceDisconnect();
            this.leaveTimeout = null;
            this.leaveInProgress = false;
        }, 3000); // Reduced timeout to 3 seconds
        
        // Listen for server confirmation (one-time only)
        this.wsManager.socket.once('leave_game_confirmed', async () => {
            console.log('✅ Server confirmed leave game');
            if (this.leaveTimeout) {
                clearTimeout(this.leaveTimeout);
                this.leaveTimeout = null;
            }
            await this.forceDisconnect();
            this.leaveInProgress = false;
        });
        
        // Also listen for disconnect event
        this.wsManager.socket.once('disconnect', async () => {
            console.log('🔌 Server disconnected after leave game');
            if (this.leaveTimeout) {
                clearTimeout(this.leaveTimeout);
                this.leaveTimeout = null;
            }
            this.resetLocalMultiplayerState();
            this.leaveInProgress = false;
        });
        
        console.log('📡 Leave game message sent, waiting for server confirmation...');
    }
    
    async forceDisconnect() {
        console.log('Forcing WebSocket disconnect');
        if (this.wsManager.socket) {
            this.wsManager.socket.disconnect();
        }
        this.wsManager.isConnected = false;
        this.resetLocalMultiplayerState();
        
        // Reconnect for future room operations
        console.log('🔄 Reconnecting for future room operations...');
        try {
            await this.wsManager.connect();
            console.log('✅ Reconnected successfully');
        } catch (error) {
            console.error('❌ Failed to reconnect:', error);
        }
    }
    
    resetLocalMultiplayerState() {
        console.log('Resetting local multiplayer state');
        
        // Reset all multiplayer state
        this.isInMultiplayer = false;
        this.currentRoom = null;
        this.playerId = null;
        this.playerName = null;
        this.isHost = false;
        this.gameStarted = false;
        this.gamePaused = false;
        this.players.clear();
        this.turnOrder = [];
        this.currentTurn = 0;
        
        // Stop resource updates
        this.stopResourceUpdates();
        
        // Stop game state updates
        this.stopGameStateUpdates();
        
        // Stop turn timer
        this.stopTurnTimer();
        
        // Reset actions
        this.actionsThisTurn = 0;
        
        // Reset leave progress flag
        this.leaveInProgress = false;
        
        // Force complete UI reset to initial state
        this.resetUIToInitialState();
        
        console.log('Local multiplayer state reset complete');
    }
    
    resetUIToInitialState() {
        console.log('Resetting UI to initial disconnected state');
        
        // Reset connection status
        const statusText = document.getElementById('connection-status');
        const statusTextMain = document.getElementById('connection-status-main');
        if (statusText) {
            statusText.textContent = 'Disconnected';
            statusText.style.color = '#dc3545';
        }
        if (statusTextMain) {
            statusTextMain.textContent = 'Disconnected';
            statusTextMain.style.color = '#dc3545';
        }
        
        // Show room controls (initial state)
        const roomControlsSection = document.querySelector('.room-controls-section');
        if (roomControlsSection) {
            roomControlsSection.style.display = 'block';
        }
        
        // Hide players main section (initial state)
        const playersMainSection = document.getElementById('players-main-section');
        if (playersMainSection) {
            playersMainSection.style.display = 'none';
        }
        
        // Clear room input
        const roomIdInput = document.getElementById('room-id-input');
        if (roomIdInput) {
            roomIdInput.value = '';
        }
        
        // Reset room info
        const roomInfo = document.getElementById('room-info');
        const roomInfoMain = document.getElementById('room-info-main');
        if (roomInfo) {
            roomInfo.textContent = 'None';
        }
        if (roomInfoMain) {
            roomInfoMain.textContent = 'None';
        }
        
        // Hide all game-started-dependent elements
        const gameStartedElements = document.querySelectorAll('.game-started-dependent');
        gameStartedElements.forEach(element => {
            element.style.display = 'none';
        });
        
        // Hide additional status (Players, Turn, Actions)
        const additionalStatus = document.querySelector('.additional-status');
        if (additionalStatus) {
            additionalStatus.style.display = 'none';
        }
        
        // Hide multiplayer actions (Sync Map, Pause Game)
        const multiplayerActions = document.querySelector('.multiplayer-actions');
        if (multiplayerActions) {
            multiplayerActions.style.display = 'none';
        }
        
        // Hide all game-related sections
        const gameStats = document.querySelector('.game-stats');
        if (gameStats) {
            gameStats.style.display = 'none';
        }
        
        const playersList = document.getElementById('players-list');
        if (playersList) {
            playersList.style.display = 'none';
        }
        
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
        
        const teamPanel = document.querySelector('.team-panel');
        if (teamPanel) {
            teamPanel.style.display = 'none';
        }
        
        // Hide start game section
        const startGameSection = document.querySelector('.start-game-section');
        if (startGameSection) {
            startGameSection.style.display = 'none';
        }
        
        // Hide game controls (sync map, pause game, etc.)
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            gameControls.style.display = 'none';
        }
        
        // Hide dropdown sections that contain game stats and controls
        const dropdownSections = document.querySelectorAll('.dropdown-section');
        dropdownSections.forEach(section => {
            const heading = section.querySelector('h5');
            if (heading && (
                heading.textContent.includes('Game Stats') ||
                heading.textContent.includes('Game Control') ||
                heading.textContent.includes('Players')
            )) {
                section.style.display = 'none';
            }
        });
        
        // Hide fixed next turn button
        const nextTurnContainer = document.querySelector('.next-turn-container');
        if (nextTurnContainer) {
            nextTurnContainer.style.display = 'none';
        }
        
        // Clear players list
        const playersMainList = document.getElementById('players-main-list');
        if (playersMainList) {
            playersMainList.innerHTML = '<div class="no-players">No players connected</div>';
        }
        
        console.log('UI reset to initial state complete');
    }

    sendGameAction(action, row, col, attribute, className) {
        if (!this.isInMultiplayer) {
            console.log('Not in multiplayer mode, skipping action');
            return;
        }
        
        console.log(`Sending game action: ${action} at (${row}, ${col}) with attribute: ${attribute}`);
        console.log('Player ID:', this.playerId);
        console.log('Is connected:', this.wsManager.isConnected);
        
        const actionId = `${this.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Track pending action
        this.pendingActions.set(actionId, {
            type: action,
            row: row,
            col: col,
            attribute: attribute,
            className: className,
            timestamp: Date.now()
        });
        
        this.updatePendingActionsDisplay();
        
        const actionData = {
            action: action,
            row: row,
            col: col,
            attribute: attribute,
            className: className,
            playerId: this.playerId,
            timestamp: Date.now()
        };
        
        console.log('Sending action data:', actionData);
        this.wsManager.send('game_action', actionData);
    }

    updatePendingActionsDisplay() {
        const pendingDiv = document.getElementById('pending-actions');
        const pendingCount = document.getElementById('pending-count');
        
        if (pendingDiv && pendingCount) {
            const count = this.pendingActions.size;
            if (count > 0) {
                pendingDiv.style.display = 'block';
                pendingCount.textContent = count;
            } else {
                pendingDiv.style.display = 'none';
            }
        }
    }

    handleActionExecuted(data) {
        console.log('Action executed:', data);
        console.log('Player ID from action:', data.playerId);
        console.log('Current player ID:', this.playerId);
        console.log('Is this my action?', data.playerId === this.playerId);
        
        // Remove from pending actions if it was ours
        this.pendingActions.forEach((action, actionId) => {
            if (action.row === data.row && action.col === data.col && 
                action.type === data.type && action.attribute === data.attribute) {
                this.pendingActions.delete(actionId);
            }
        });
        
        this.updatePendingActionsDisplay();
        
        // Update action counter if this is our action
        if (data.playerId === this.playerId && data.type === 'place') {
            const actionCost = this.getActionCost(data.attribute);
            this.actionsThisTurn += actionCost;
            console.log(`Action counter updated: ${this.actionsThisTurn}/${this.maxActionsPerTurn} actions used`);
            this.updateActionCounter();
            this.updateUI(); // Refresh UI to show updated action counter
        }
        
        // Process action regardless of who sent it
        if (data.type === 'place') {
            console.log(`Processing place action: ${data.attribute} at (${data.row}, ${data.col})`);
            
            // Update the cell data
            if (this.mapSystem && this.mapSystem.cells && this.mapSystem.cells[data.row]) {
                this.mapSystem.cells[data.row][data.col].attribute = data.attribute;
                this.mapSystem.cells[data.row][data.col].class = data.className;
                
                // Preserve player ownership and turn placement
                if (data.playerId) {
                    this.mapSystem.cells[data.row][data.col].playerId = data.playerId;
                    // Only mark as placed this turn if it's the current player's turn
                    this.mapSystem.cells[data.row][data.col].placedThisTurn = (data.playerId === this.playerId);
                }
                
                // Update visual representation
                if (this.mapSystem.updateCellVisual) {
                    this.mapSystem.updateCellVisual(data.row, data.col);
                }
                
                // Update stats
                if (this.mapSystem.updateStats) {
                    this.mapSystem.updateStats();
                }
                
                // Recalculate resources after any building placement
                if (this.mapSystem.resourceManagement) {
                    this.mapSystem.resourceManagement.recalculate();
                    console.log('Resources recalculated after building placement');
                }
                
                console.log(`Successfully placed ${data.attribute} at (${data.row}, ${data.col})`);
            } else {
                console.error('MapSystem not available or cell not found');
            }
        } else if (data.type === 'remove') {
            console.log(`Processing remove action at (${data.row}, ${data.col})`);
            
            // Erase the cell
            if (this.mapSystem && this.mapSystem.erasePlayerModifications) {
                this.mapSystem.erasePlayerModifications(data.row, data.col);
            }
            
            // Update visual representation
            if (this.mapSystem && this.mapSystem.updateCellVisual) {
                this.mapSystem.updateCellVisual(data.row, data.col);
            }
            
            // Update stats
            if (this.mapSystem && this.mapSystem.updateStats) {
                this.mapSystem.updateStats();
            }
            
            // Recalculate resources after any building removal
            if (this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.recalculate();
                console.log('Resources recalculated after building removal');
            }
            
            console.log(`Successfully removed building at (${data.row}, ${data.col})`);
        }
    }

    handleActionRejected(data) {
        console.log('Action rejected:', data);
        
        // Remove from pending actions
        this.pendingActions.delete(data.actionId);
        this.updatePendingActionsDisplay();
        
        this.showActionRejectedMessage(data.reason);
    }

    showActionRejectedMessage(reason) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            text-align: center;
        `;
        
        // Provide more descriptive error messages
        let displayReason = reason;
        if (reason && reason.toLowerCase().includes('not your turn')) {
            // Check if player has no actions left
            const actionsLeft = this.maxActionsPerTurn - this.actionsThisTurn;
            if (actionsLeft <= 0) {
                displayReason = `You are out of actions this turn! (${this.actionsThisTurn}/${this.maxActionsPerTurn} used)`;
            } else {
                const currentPlayer = this.turnOrder ? this.turnOrder[this.currentTurn] : 'Unknown';
                displayReason = `It's not your turn! Wait for your turn to place buildings.`;
            }
        } else if (reason && reason.toLowerCase().includes('insufficient')) {
            displayReason = `Insufficient resources! Check your resource count.`;
        } else if (reason && reason.toLowerCase().includes('invalid placement')) {
            displayReason = `Invalid placement! Check building requirements and terrain.`;
        } else if (reason && reason.toLowerCase().includes('game not started')) {
            displayReason = `Game has not started yet! Wait for the host to start the game.`;
        } else if (reason && reason.toLowerCase().includes('paused')) {
            displayReason = `Game is paused! No actions allowed until someone unpauses.`;
        } else if (!reason || reason.trim() === '') {
            displayReason = `Action rejected! Check game state and requirements.`;
        }
        
        notification.textContent = `❌ Action Rejected: ${displayReason}`;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds (longer for more detailed messages)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    isInMultiplayerMode() {
        return this.isInMultiplayer;
    }

    isMyTurn() {
        if (!this.isInMultiplayer || this.turnOrder.length === 0) {
            return true;
        }
        return this.turnOrder[this.currentTurn] === this.playerId;
    }

    advanceTurn() {
        if (!this.isInMultiplayer) return;
        
        // Don't allow advancing turn when game is paused
        if (this.gamePaused) {
            console.log('Cannot advance turn - game is paused');
            this.showNotification('Cannot advance turn - game is paused', 'warning');
            return;
        }
        
        this.wsManager.send('advance_turn', {
            roomCode: this.currentRoom,
            playerId: this.playerId
        });
    }

    // Send building action to server
    sendBuildingAction(row, col, attribute) {
        if (!this.wsManager || !this.wsManager.isConnected) {
            this.showNotification('Not connected to server', 'error');
            return;
        }
        
        // Check if we can place this building
        if (!this.canPlaceBuilding(attribute)) {
            return;
        }
        
        // Create action
        const action = {
            actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'place',
            row: row,
            col: col,
            attribute: attribute,
            playerId: this.playerId,
            timestamp: Date.now()
        };
        
        // Add to pending actions
        this.pendingActions.set(action.actionId, action);
        this.updatePendingActionsDisplay();
        
        // Send to server
        this.wsManager.send('place_building', action);
        console.log(`Sent building action: ${attribute} at (${row}, ${col})`);
    }

    // Get action cost for a building type
    getActionCost(buildingType) {
        const actionCosts = {
            'erase': 0.0,        // Erase is free
            'road': 0.5,
            'bridge': 0.5,
            'residential': 1.0,
            'commercial': 1.0,
            'industrial': 1.0,
            'mixed': 1.0,
            'powerPlant': 1.0,
            'powerLines': 1.0,
            'lumberYard': 1.0,
            'miningOutpost': 1.0
        };
        return actionCosts[buildingType] || 1.0; // Default to 1 action
    }
    
    canPlaceBuilding(buildingType = null) {
        if (!this.isInMultiplayer) return true;
        
        // Always allow erase operations regardless of game state or actions
        if (buildingType === 'erase') {
            console.log('Erase operation - always allowed');
            return true;
        }
        
        // If game hasn't started yet, don't allow placement
        if (!this.gameStarted) {
            console.log('Game not started yet, cannot place buildings');
            this.showNotification('Game has not started yet - wait for the host to start the game', 'warning');
            return false;
        }
        
        // If game is paused, don't allow placement
        if (this.gamePaused) {
            console.log('Game is paused, cannot place buildings');
            this.showNotification('Game is paused - no actions allowed until someone unpauses', 'warning');
            return false;
        }
        
        // If turn order is not set up yet, allow placement
        if (!this.turnOrder || this.turnOrder.length === 0) {
            console.log('Turn order not set up yet, allowing placement');
            return true;
        }
        
        const isMyTurn = this.isMyTurn();
        const hasActionsLeft = this.actionsThisTurn < this.maxActionsPerTurn;
        
        // If building type is specified, check if player has enough actions for that specific building
        if (buildingType) {
            const actionCost = this.getActionCost(buildingType);
            const hasEnoughActions = (this.maxActionsPerTurn - this.actionsThisTurn) >= actionCost;
            
            console.log(`Can place ${buildingType}?`, isMyTurn && hasEnoughActions, 'My turn:', isMyTurn, 'Actions left:', this.maxActionsPerTurn - this.actionsThisTurn, 'Required:', actionCost);
            
            if (isMyTurn && !hasEnoughActions) {
                const actionsLeft = this.maxActionsPerTurn - this.actionsThisTurn;
                const displayActionsLeft = actionsLeft % 1 === 0 ? actionsLeft.toString() : actionsLeft.toFixed(1);
                const displayRequired = actionCost % 1 === 0 ? actionCost.toString() : actionCost.toFixed(1);
                this.showNotification(`Not enough actions! Need ${displayRequired} action(s), have ${displayActionsLeft} remaining`, 'warning');
            }
            
            return isMyTurn && hasEnoughActions;
        }
        
        console.log('Can place building?', isMyTurn && hasActionsLeft, 'My turn:', isMyTurn, 'Actions left:', this.maxActionsPerTurn - this.actionsThisTurn, 'Current turn:', this.currentTurn, 'My turn:', this.turnOrder[this.currentTurn], 'My ID:', this.playerId);
        
        if (isMyTurn && !hasActionsLeft) {
            this.showNotification(`No actions left this turn! (${this.maxActionsPerTurn}/${this.maxActionsPerTurn} used)`, 'warning');
        }
        
        return isMyTurn && hasActionsLeft;
    }

    // Victory conditions

    // Trading system
    showTradeDialog() {
        const targetPlayer = prompt('Enter target player name:');
        if (!targetPlayer) return;

        const targetPlayerId = Array.from(this.players.keys()).find(id => 
            this.players.get(id).username === targetPlayer
        );

        if (!targetPlayerId) {
            alert('Player not found!');
            return;
        }

        const resources = prompt('Resources to give (format: wood:10,ore:5):');
        const payment = prompt('Resources to receive (format: wood:15,ore:8):');

        if (resources && payment) {
            this.wsManager.send('initiate_trade', {
                targetPlayerId: targetPlayerId,
                resources: this.parseResourceString(resources),
                payment: this.parseResourceString(payment)
            });
        }
    }

    parseResourceString(str) {
        const resources = {};
        str.split(',').forEach(item => {
            const [resource, amount] = item.split(':');
            if (resource && amount) {
                resources[resource.trim()] = parseInt(amount.trim());
            }
        });
        return resources;
    }

    handleTradeOffer(data) {
        const accept = confirm(`${data.fromPlayerName} wants to trade:\nGive: ${JSON.stringify(data.resources)}\nReceive: ${JSON.stringify(data.payment)}\n\nAccept trade?`);
        
        this.wsManager.send('trade_response', {
            fromPlayerId: data.fromPlayerId,
            accepted: accept,
            resources: data.resources,
            payment: data.payment
        });
    }

    handleTradeCompleted(data) {
        this.showNotification('Trade completed successfully!', 'success');
    }

    handleTradeRejected(data) {
        this.showNotification('Trade was rejected', 'error');
    }

    // Victory handling
    handleVictoryAchieved(data) {
        const winners = data.winners.map(w => `${w.playerName} (${w.condition})`).join(', ');
        this.showNotification(`Victory! Winners: ${winners}`, 'victory');
    }

    // Game state updates
    handleGameStateUpdate(data) {
        this.updatePlayersList(data.players);
        this.updateUI();
    }

    // Utility methods
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            victory: '#FFD700',
            info: '#2196F3'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            text-align: center;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Turn start alert - prominent popup in top middle of screen
    showTurnStartAlert() {
        const alert = document.createElement('div');
        alert.className = 'turn-start-alert';
        
        alert.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px 40px;
            border-radius: 15px;
            box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
            z-index: 15000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            animation: turnStartAlertSlide 0.5s ease-out;
            min-width: 300px;
            border: 3px solid rgba(255, 255, 255, 0.3);
        `;
        
        alert.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">🎮</div>
            <div>YOUR TURN!</div>
            <div style="font-size: 16px; margin-top: 10px; opacity: 0.9;">
                You have ${this.maxActionsPerTurn} actions remaining
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'turnStartAlertFadeOut 0.5s ease-in';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }
        }, 3000);
    }

    // Host transfer alert - prominent notification for host changes
    showHostTransferAlert(isNewHost, message) {
        const alert = document.createElement('div');
        alert.className = 'host-transfer-alert';
        
        const backgroundColor = isNewHost ? 
            'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 
            'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
        
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.3);
            z-index: 15000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            animation: hostTransferSlide 0.6s ease-out;
            min-width: 350px;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;
        
        alert.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">${isNewHost ? '👑' : '👤'}</div>
            <div>${message}</div>
            <div style="font-size: 14px; margin-top: 8px; opacity: 0.9;">
                ${isNewHost ? 'You can now start games and control settings' : 'Game continues with new host'}
            </div>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.style.animation = 'hostTransferFadeOut 0.5s ease-in';
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.parentNode.removeChild(alert);
                    }
                }, 500);
            }
        }, 4000);
    }

    // Team management methods
    showCreateTeamDialog() {
        const teamName = prompt('Enter team name:');
        if (teamName) {
            console.log('Creating team with name:', teamName);
            console.log('Is connected:', this.wsManager.isConnected);
            console.log('Is in multiplayer:', this.isInMultiplayer);
            this.wsManager.send('create_team', { teamName: teamName });
        }
    }

    showJoinTeamDialog() {
        const teamId = prompt('Enter team ID to join:');
        if (teamId) {
            this.wsManager.send('join_team', { teamId: teamId });
        }
    }

    leaveTeam() {
        this.wsManager.send('leave_team', {});
    }


    // Event handlers for cooperative features
    handleTeamCreated(data) {
        this.currentTeam = data.team;
        this.updateTeamUI();
        this.showNotification(`Team created successfully! Team ID: ${data.team.id}`, 'success');
        
        // Show team ID in a more prominent way
        const teamIdDisplay = document.createElement('div');
        teamIdDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        teamIdDisplay.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">🎉 Team Created!</h3>
            <p style="margin: 0 0 10px 0;"><strong>Team Name:</strong> ${data.team.name}</p>
            <p style="margin: 0 0 15px 0;"><strong>Team ID:</strong> <code style="background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">${data.team.id}</code></p>
            <p style="margin: 0 0 15px 0; font-size: 14px;">Share this Team ID with your friends so they can join!</p>
            <button onclick="this.parentElement.remove()" style="background: rgba(0,0,0,0.2); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">Got it!</button>
        `;
        document.body.appendChild(teamIdDisplay);
    }

    handleTeamJoined(data) {
        this.currentTeam = data.team;
        this.updateTeamUI();
        this.showNotification('Joined team successfully!', 'success');
    }

    handleTeamLeft(data) {
        this.currentTeam = null;
        this.updateTeamUI();
        this.showNotification('Left team', 'info');
    }

    handleTeamMemberJoined(data) {
        this.updateTeamUI();
        this.showNotification(`${data.playerName} joined the team!`, 'info');
    }

    handleTeamMemberLeft(data) {
        this.updateTeamUI();
        this.showNotification(`${data.playerName} left the team`, 'info');
    }

    handleTeamListUpdated(data) {
        // Update team list if needed
        console.log('Team list updated:', data.teams);
    }

    handleSharedResourcesUpdated(data) {
        this.updateSharedResourcesDisplay(data.sharedResources);
    }

    handleSharedResourcesFailed(data) {
        this.showNotification(`Failed to use shared resources: ${data.reason}`, 'error');
    }

    handleJointProjectCreated(data) {
        this.updateProjectsList();
        this.showNotification('New joint project created!', 'success');
    }

    handleProjectProgressUpdated(data) {
        this.updateProjectsList();
        if (data.project.status === 'completed') {
            this.showNotification('Joint project completed!', 'victory');
        }
    }

    handleTeamObjectiveCreated(data) {
        this.updateObjectivesList();
        this.showNotification('New team objective created!', 'info');
    }

    handleObjectivesCompleted(data) {
        this.updateObjectivesList();
        this.showNotification('Team objective completed!', 'victory');
    }

    handleTeamChatMessage(data) {
        this.addTeamChatMessage(data);
    }

    handleMapMarkerPlaced(data) {
        this.addMapMarker(data);
    }

    // UI update methods
    updateTeamUI() {
        const teamStatus = document.getElementById('team-status');
        const teamMembers = document.getElementById('team-members');
        const teamIdDisplay = document.getElementById('team-id-display');
        const teamIdText = document.getElementById('team-id-text');
        const createTeamBtn = document.getElementById('create-team-btn');
        const joinTeamBtn = document.getElementById('join-team-btn');
        const leaveTeamBtn = document.getElementById('leave-team-btn');

        if (this.currentTeam) {
            if (teamStatus) teamStatus.textContent = this.currentTeam.name;
            if (teamMembers) teamMembers.textContent = this.currentTeam.members.length;
            if (teamIdDisplay) teamIdDisplay.style.display = 'block';
            if (teamIdText) teamIdText.textContent = this.currentTeam.id;
            if (createTeamBtn) createTeamBtn.style.display = 'none';
            if (joinTeamBtn) joinTeamBtn.style.display = 'none';
            if (leaveTeamBtn) leaveTeamBtn.style.display = 'block';
        } else {
            if (teamStatus) teamStatus.textContent = 'No Team';
            if (teamMembers) teamMembers.textContent = '0';
            if (teamIdDisplay) teamIdDisplay.style.display = 'none';
            if (createTeamBtn) createTeamBtn.style.display = 'block';
            if (joinTeamBtn) joinTeamBtn.style.display = 'block';
            if (leaveTeamBtn) leaveTeamBtn.style.display = 'none';
        }
    }

    updateSharedResourcesDisplay(sharedResources) {
        const wood = document.getElementById('shared-wood');
        const ore = document.getElementById('shared-ore');
        const power = document.getElementById('shared-power');
        const goods = document.getElementById('shared-goods');

        if (wood) wood.textContent = sharedResources.wood || 0;
        if (ore) ore.textContent = sharedResources.ore || 0;
        if (power) power.textContent = sharedResources.power || 0;
        if (goods) goods.textContent = sharedResources.commercialGoods || 0;
    }

    updateProjectsList() {
        const projectsList = document.getElementById('projects-list');
        if (!projectsList || !this.currentTeam) return;

        projectsList.innerHTML = this.currentTeam.jointProjects.map(project => `
            <div style="margin-bottom: 5px; padding: 3px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                <div><strong>${project.type}</strong> - ${project.progress}%</div>
                <div style="font-size: 10px;">Status: ${project.status}</div>
            </div>
        `).join('');
    }

    updateObjectivesList() {
        // This would update the objectives display
        console.log('Objectives updated');
    }


    addMapMarker(data) {
        // This would add a visual marker to the map
        console.log('Map marker placed:', data);
    }


    handleGameCreationFailed(data) {
        this.showNotification(`Game creation failed: ${data.reason}`, 'error');
    }

    handleGameJoinFailed(data) {
        console.error('Game join failed:', data);
        this.showNotification(`Failed to join game: ${data.reason || 'Unknown error'}`, 'error');
    }

    handlePlayerDisconnected(data) {
        console.log('Player disconnected:', data);
        if (data.playerId && data.playerId !== this.playerId) {
            // Another player disconnected
            this.players.delete(data.playerId);
            
            // Set flag to reset timer on next turn change (same as player leaving)
            this.playerJustLeft = true;
            
            // Check if it's now our turn and start timer immediately
            if (this.isMyTurn()) {
                console.log('Player disconnected - starting timer with 60s');
                this.turnTimeLimit = 60; // Reset to full 60 seconds
                this.playerJustLeft = false; // Clear the flag
                this.startTurnTimer();
            }
            
            this.updatePlayersList();
            this.updateUI();
            this.showNotification(`${data.playerName || 'Player'} has disconnected`, 'info');
        }
    }

    // Map synchronization methods
    syncMap(cellData) {
        console.log('🗺️ SYNC MAP CALLED');
        console.log('🗺️ Cell data type:', typeof cellData);
        console.log('🗺️ Cell data is array:', Array.isArray(cellData));
        console.log('🗺️ Cell data length:', cellData ? cellData.length : 'undefined');
        console.log('🗺️ First cell:', cellData && cellData.length > 0 ? cellData[0] : 'none');
        
        if (!this.mapSystem || !this.mapSystem.cells) {
            console.error('❌ MapSystem not available for sync');
            return;
        }

        if (!cellData || !Array.isArray(cellData)) {
            console.error('❌ Invalid cell data received:', cellData);
            return;
        }

        console.log('✅ Proceeding with map sync...');

        console.log('Applying map sync...');
        let cellsUpdated = 0;

        // Handle 1D array format from server
        if (Array.isArray(cellData) && cellData.length > 0 && (cellData[0].x !== undefined || cellData[0].playerId !== undefined)) {
            // This is a 1D array of cell objects with x, y coordinates
            console.log('🗺️ Processing 1D cell data format...');
            console.log('🗺️ Map dimensions:', this.mapSystem.cells.length, 'x', this.mapSystem.cells[0]?.length);
            
            for (const cellInfo of cellData) {
                if (cellInfo && cellInfo.x !== undefined && cellInfo.y !== undefined) {
                    const row = cellInfo.y;
                    const col = cellInfo.x;
                    
                    console.log('🗺️ Processing cell at', row, col, ':', cellInfo);
                    
                    if (row >= 0 && row < this.mapSystem.cells.length && 
                        col >= 0 && col < this.mapSystem.cells[row].length) {
                        
                        // Preserve the existing element reference
                        const existingElement = this.mapSystem.cells[row][col]?.element;
                        
                        // Update cell with new data, preserving existing element
                        this.mapSystem.cells[row][col] = { 
                            ...this.mapSystem.cells[row][col], // Keep existing cell data
                            ...cellInfo, // Apply new data
                            element: existingElement // Keep the existing DOM element
                        };
                        cellsUpdated++;
                        console.log('🗺️ Updated cell at', row, col);
                    } else {
                        console.log('🗺️ Cell out of bounds:', row, col);
                    }
                }
            }
        } else {
            // Handle 2D array format (legacy)
            console.log('🗺️ Processing 2D cell data format...');
            for (let row = 0; row < cellData.length; row++) {
                for (let col = 0; col < cellData[row].length; col++) {
                    if (cellData[row][col]) {
                        // Preserve the existing element reference
                        const existingElement = this.mapSystem.cells[row][col]?.element;
                        this.mapSystem.cells[row][col] = { 
                            ...cellData[row][col],
                            element: existingElement // Keep the existing DOM element
                        };
                        cellsUpdated++;
                    }
                }
            }
        }

        console.log(`Updated ${cellsUpdated} cells`);

        // Debug: Check a few cells to see what they look like after sync
        console.log('🗺️ Sample cells after sync:');
        for (let i = 0; i < Math.min(5, this.mapSystem.cells.length); i++) {
            for (let j = 0; j < Math.min(5, this.mapSystem.cells[i].length); j++) {
                const cell = this.mapSystem.cells[i][j];
                console.log(`Cell [${i}][${j}]:`, {
                    attribute: cell.attribute,
                    class: cell.class,
                    building: cell.building,
                    playerId: cell.playerId
                });
            }
        }

        // Update the visual representation
        this.mapSystem.updateStats();
        
        // Force visual update of all cells
        console.log('🗺️ Forcing visual update of all cells...');
        for (let row = 0; row < this.mapSystem.cells.length; row++) {
            for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                this.mapSystem.updateCellVisual(row, col);
            }
        }
        
        // Also try to force a complete map refresh
        if (this.mapSystem && typeof this.mapSystem.refreshMap === 'function') {
            console.log('🗺️ Calling refreshMap...');
            this.mapSystem.refreshMap();
        }
        
        // Force a complete visual refresh - this is the key fix
        console.log('Forcing complete visual refresh...');
        for (let row = 0; row < this.mapSystem.cells.length; row++) {
            for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell && cell.element) {
                    // Clear the cell first
                    cell.element.className = 'cell';
                    cell.element.style.background = '';
                    cell.element.style.border = '';
                    
                    // Update the visual
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }

        // Additional refresh to ensure everything is visible
        setTimeout(() => {
            console.log('Performing additional visual refresh...');
            for (let row = 0; row < this.mapSystem.cells.length; row++) {
                for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell && cell.element) {
                        this.mapSystem.updateCellVisual(row, col);
                    }
                }
            }
        }, 100);

        console.log('Map sync completed successfully');
        
        // Force a complete map re-render as a final step
        this.forceMapRerender();
        
        // Additional aggressive refresh
        setTimeout(() => {
            this.forceCompleteMapRefresh();
        }, 200);
    }

    // Force complete map re-render
    forceMapRerender() {
        console.log('Forcing complete map re-render...');
        
        if (!this.mapSystem) return;
        
        // Get the map container
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        // Force a reflow by temporarily hiding and showing
        mapContainer.style.display = 'none';
        setTimeout(() => {
            mapContainer.style.display = 'block';
            
            // Update all cells one more time
            for (let row = 0; row < this.mapSystem.cells.length; row++) {
                for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell && cell.element) {
                        this.mapSystem.updateCellVisual(row, col);
                    }
                }
            }
            
            console.log('Map re-render completed');
        }, 50);
    }

    // Force complete map refresh - most aggressive approach
    forceCompleteMapRefresh() {
        console.log('Forcing complete map refresh...');
        
        if (!this.mapSystem) return;
        
        // Force the map system to completely rebuild its visual representation
        if (this.mapSystem.rebuildMapVisuals) {
            this.mapSystem.rebuildMapVisuals();
        } else {
            // Fallback: manually update every cell
            for (let row = 0; row < this.mapSystem.cells.length; row++) {
                for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell && cell.element) {
                        // Force a complete visual reset
                        cell.element.className = 'cell';
                        cell.element.style.cssText = '';
                        
                        // Reapply all visual properties
                        if (cell.attribute) {
                            cell.element.classList.add(cell.attribute);
                            cell.element.dataset.attribute = cell.attribute;
                        }
                        if (cell.class && cell.class !== cell.attribute) {
                            cell.element.classList.add(cell.class);
                            cell.element.dataset.class = cell.class;
                        }
                    }
                }
            }
        }
        
        console.log('Complete map refresh finished');
    }

    // Clear "placedThisTurn" flags for all cells
    clearPlacedThisTurnFlags() {
        if (!this.mapSystem || !this.mapSystem.cells) return;
        
        console.log('Clearing placedThisTurn flags for all cells');
        for (let row = 0; row < this.mapSystem.cells.length; row++) {
            for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell) {
                    cell.placedThisTurn = false;
                }
            }
        }
    }

    // Turn timer methods
    startTurnTimer() {
        this.stopTurnTimer(); // Clear any existing timer
        this.turnStartTime = Date.now();
        
        // Immediately update the timer display to show full time limit
        this.updateTurnTimerDisplay(this.turnTimeLimit);
        
        this.turnTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.turnStartTime) / 1000);
            const remaining = Math.max(0, this.turnTimeLimit - elapsed);
            
            if (remaining <= 0) {
                console.log('Turn time limit reached, auto-advancing turn');
                this.advanceTurn();
                this.showNotification('Turn time limit reached! Turn auto-advanced.', 'warning');
            } else if (remaining <= 10) {
                // Warning when 10 seconds left
                this.showNotification(`${remaining} seconds left in turn!`, 'warning');
            }
            
            this.updateTurnTimerDisplay(remaining);
        }, 1000);
    }

    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        // Reset paused time tracking
        this.turnTimeRemaining = null;
        this.turnTimerPaused = false;
        // Clear player leave flag when stopping timer
        this.playerJustLeft = false;
        this.updateTurnTimerDisplay(0);
    }

    updateTurnTimerDisplay(remaining) {
        // Update the fixed timer next to the Next Turn button
        const timerElement = document.getElementById('turn-timer-fixed');
        if (timerElement) {
            // Ensure remaining is always a whole number
            const roundedRemaining = Math.max(0, Math.floor(remaining));
            
            if (this.gamePaused && this.turnTimeRemaining !== null) {
                // Show paused time with orange background in MM:SS format
                const pausedMinutes = Math.floor(this.turnTimeRemaining / 60);
                const pausedSeconds = this.turnTimeRemaining % 60;
                timerElement.textContent = `PAUSED ${pausedMinutes}:${pausedSeconds.toString().padStart(2, '0')}`;
                timerElement.style.color = 'white';
                timerElement.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
            } else if (roundedRemaining > 0) {
                // Show time in MM:SS format
                const minutes = Math.floor(roundedRemaining / 60);
                const seconds = roundedRemaining % 60;
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                timerElement.style.color = 'white';
                if (roundedRemaining <= 10) {
                    // Red background for warning
                    timerElement.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
                } else {
                    // Green background for normal
                    timerElement.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                }
            } else {
                timerElement.textContent = '--:--';
                timerElement.style.color = 'white';
                timerElement.style.background = 'linear-gradient(135deg, #666, #555)';
            }
        }
    }


    // Force map sync - bypasses modification checks
    forceMapSync(cellData) {
        console.log('Force syncing map with server data...', cellData);
        
        if (!this.mapSystem || !this.mapSystem.cells) {
            console.error('MapSystem not available for force sync');
            return;
        }

        if (!cellData || !Array.isArray(cellData)) {
            console.error('Invalid cell data received for force sync:', cellData);
            return;
        }

        console.log('Force applying map sync...');
        let cellsUpdated = 0;

        // Update each cell with the server data
        for (let row = 0; row < cellData.length; row++) {
            for (let col = 0; col < cellData[row].length; col++) {
                if (cellData[row][col]) {
                    // Preserve the existing element reference
                    const existingElement = this.mapSystem.cells[row][col]?.element;
                    this.mapSystem.cells[row][col] = { 
                        ...cellData[row][col],
                        element: existingElement // Keep the existing DOM element
                    };
                    cellsUpdated++;
                }
            }
        }

        console.log(`Force updated ${cellsUpdated} cells`);

        // Update the visual representation
        this.mapSystem.updateStats();
        
        // Force a complete visual refresh
        console.log('Forcing complete visual refresh...');
        for (let row = 0; row < this.mapSystem.cells.length; row++) {
            for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell && cell.element) {
                    // Clear the cell first
                    cell.element.className = 'cell';
                    cell.element.style.background = '';
                    cell.element.style.border = '';
                    
                    // Update the visual
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }

        // Additional refresh to ensure everything is visible
        setTimeout(() => {
            console.log('Performing additional visual refresh...');
            for (let row = 0; row < this.mapSystem.cells.length; row++) {
                for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell && cell.element) {
                        this.mapSystem.updateCellVisual(row, col);
                    }
                }
            }
        }, 100);

        console.log('Force map sync completed successfully');
        
        // Force a complete map re-render as a final step
        this.forceMapRerender();
        
        // Additional aggressive refresh
        setTimeout(() => {
            this.forceCompleteMapRefresh();
        }, 200);
    }

    // Send current map state to server
    sendMapState() {
        if (!this.isInMultiplayer || !this.mapSystem) {
            console.log('Cannot send map state: not in multiplayer or mapSystem not available');
            return;
        }

        const mapData = {
            cells: this.mapSystem.cells,
            timestamp: Date.now()
        };

        console.log('Sending map state to server:', mapData);
        this.wsManager.send('update_map_state', mapData);
    }

    // Request host's map data (works for everyone)
    requestHostMapSync() {
        if (!this.isInMultiplayer) {
            console.log('Cannot request map sync: not in multiplayer');
            return;
        }

        console.log('Requesting host map data...');
        
        if (this.isHost) {
            // Host sends their current map data to update the stored host map and broadcast to all
            const mapData = this.getCurrentMapData();
            if (!mapData || mapData.length === 0) {
                console.error('No map data available to sync');
                this.showNotification('No map data to sync', 'error');
                return;
            }

            console.log('🗺️ Host syncing current map to all players:', mapData.length, 'cells');
            
            // Send map data to server for broadcasting to other players
            this.wsManager.send('request_map_sync', {
                roomCode: this.currentRoom,
                playerId: this.playerId,
                cells: mapData
            });
        } else {
            // Non-host requests the host's current map (not stored map)
            console.log('🗺️ Non-host requesting current map from host');
            this.wsManager.send('request_map_sync', {
                roomCode: this.currentRoom,
                playerId: this.playerId
            });
        }
    }

    // Request map sync from host instead of sending to all players (legacy function)
    requestMapSyncFromHost() {
        if (!this.isInMultiplayer) {
            console.log('Cannot request map sync: not in multiplayer');
            return;
        }

        console.log('Requesting map sync from host...');
        this.wsManager.send('request_map_sync', {
            roomCode: this.currentRoom,
            playerId: this.playerId
        });
    }

    // Periodically update player resources
    startResourceUpdates() {
        if (this.resourceUpdateInterval) {
            clearInterval(this.resourceUpdateInterval);
        }

        this.resourceUpdateInterval = setInterval(() => {
            if (this.isInMultiplayer && this.mapSystem && this.mapSystem.resourceManagement) {
                // Recalculate resources to ensure proper ownership
                this.mapSystem.resourceManagement.recalculate();
                
                // Get current resources
                const currentResources = this.mapSystem.resourceManagement.resources;
                
                // Send resource update to server
                this.wsManager.send('update_player_resources', {
                    playerId: this.playerId,
                    resources: currentResources
                });
            }
        }, 5000); // Update every 5 seconds
    }

    // Periodically request game state updates
    startGameStateUpdates() {
        if (this.gameStateUpdateInterval) {
            clearInterval(this.gameStateUpdateInterval);
        }

        this.gameStateUpdateInterval = setInterval(() => {
            if (this.isInMultiplayer) {
                // Request current game state from server
                this.wsManager.send('request_game_state', {
                    roomCode: this.currentRoom
                });
            }
        }, 10000); // Update every 10 seconds
    }

    stopGameStateUpdates() {
        if (this.gameStateUpdateInterval) {
            clearInterval(this.gameStateUpdateInterval);
            this.gameStateUpdateInterval = null;
        }
    }

    stopResourceUpdates() {
        if (this.resourceUpdateInterval) {
            clearInterval(this.resourceUpdateInterval);
            this.resourceUpdateInterval = null;
        }
    }
}