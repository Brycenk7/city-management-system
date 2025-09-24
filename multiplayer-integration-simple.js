console.log('Loading SimpleMultiplayerIntegration class... v2.1');

class SimpleMultiplayerIntegration {
    constructor(mapSystem) {
        console.log('SimpleMultiplayerIntegration constructor called');
        this.mapSystem = mapSystem;
        this.wsManager = new WebSocketManager();
        this.isInMultiplayer = false;
        this.currentRoom = null;
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
        this.actionsThisTurn = 0;
        this.maxActionsPerTurn = 3; // Default actions limit
        this.turnTimeLimit = 60; // 60 seconds per turn
        this.turnStartTime = null;
        this.turnTimer = null;
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
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            this.updatePlayersList(data.game.players);
            this.updateUI();
            
            // Set player ID in resource management
            if (this.mapSystem && this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.setCurrentPlayerId(this.playerId);
            }
            
            // Start turn timer if it's our turn (game creator is always first)
            if (this.isMyTurn()) {
                this.startTurnTimer();
                console.log('Turn timer started on game creation');
            }
            
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
            this.turnOrder = data.game.gameState.turnOrder;
            this.currentTurn = data.game.gameState.currentTurn;
            this.updatePlayersList(data.game.players);
            this.updateUI();
            
            // Set player ID in resource management
            if (this.mapSystem && this.mapSystem.resourceManagement) {
                this.mapSystem.resourceManagement.setCurrentPlayerId(this.playerId);
            }
            
            // Start turn timer if it's our turn
            if (this.isMyTurn()) {
                this.startTurnTimer();
                console.log('Turn timer started on game join');
            }
            
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
            
            // Start turn timer if it's our turn
            if (this.isMyTurn()) {
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

        // Game mode events
        this.wsManager.on('game_modes_list', (data) => {
            this.handleGameModesList(data);
        });

        this.wsManager.on('game_creation_failed', (data) => {
            this.handleGameCreationFailed(data);
        });

        // Map state updates
        this.wsManager.on('map_state_updated', (data) => {
            console.log('Map state updated from another player');
            this.syncMap(data.cells);
            this.showNotification('Map synchronized with other players', 'success');
        });
    }

    showMultiplayerUI() {
        console.log('showMultiplayerUI called');
        
        // Check if panel already exists
        if (this.multiplayerPanel) {
            this.multiplayerPanel.remove();
        }
        
        this.createMultiplayerPanel();
        
        // Panel will be shown/hidden by tab management
        if (!this.multiplayerPanel) {
            console.error('Multiplayer panel is null!');
        }
        
        // Check if elements were created
        const gameStats = document.getElementById('game-stats');
        const dropdown = document.getElementById('multiplayer-dropdown');
        console.log('Elements after creation:', {
            gameStats: !!gameStats,
            dropdown: !!dropdown
        });
        
        // Open the dropdown by default when showing multiplayer UI
        if (dropdown) {
            dropdown.style.display = 'block';
            const toggleBtn = document.getElementById('multiplayer-toggle');
            if (toggleBtn) {
                toggleBtn.textContent = '▲';
            }
        }
        
        this.setupTabListeners();
        this.updateUI();
        console.log('Multiplayer UI created and updated');
        
        // Check current tab and update visibility
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabType = activeTab.getAttribute('data-tab');
            console.log('Checking initial tab after panel creation:', tabType);
            this.handleTabChange(tabType);
        }
    }

    setupTabListeners() {
        // Listen for tab changes
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.getAttribute('data-tab');
                this.handleTabChange(tabType);
            });
        });

        // Check initial tab state
        const activeTab = document.querySelector('.tab.active');
        console.log('Active tab found:', activeTab);
        if (activeTab) {
            const tabType = activeTab.getAttribute('data-tab');
            console.log('Initial tab type:', tabType);
            this.handleTabChange(tabType);
        } else {
            console.log('No active tab found');
        }
    }

    handleTabChange(tabType) {
        // Temporarily show multiplayer panel on all tabs for debugging
        console.log('Tab changed to:', tabType);
        if (this.multiplayerPanel) {
            console.log('Multiplayer panel exists, forcing visibility');
            this.multiplayerPanel.style.display = 'block';
            this.multiplayerPanel.style.visibility = 'visible';
            this.multiplayerPanel.style.opacity = '1';
            console.log('Multiplayer panel forced visible for', tabType, 'tab');
        } else {
            console.log('Multiplayer panel does not exist yet');
        }
    }

    createMultiplayerPanel() {
        this.multiplayerPanel = document.createElement('div');
        this.multiplayerPanel.id = 'multiplayer-panel';
        this.multiplayerPanel.className = 'tool-section';
        this.multiplayerPanel.style.cssText = `
            background: linear-gradient(135deg, #007bff, #0056b3);
            border: 2px solid #000;
            padding: 10px;
            margin: 10px 0;
            display: block;
            visibility: visible;
            opacity: 1;
            color: white;
            border-radius: 8px;
        `;
        
        // No hover effects needed - integrated into tools panel

        this.multiplayerPanel.innerHTML = `
            <div class="tool-section">
                <h4>🌐 Multiplayer</h4>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span id="status-text" style="font-size: 0.8rem; color: #dc3545;">Disconnected</span>
                    <button id="multiplayer-toggle" style="background: none; border: none; font-size: 1rem; cursor: pointer; padding: 2px 4px; border-radius: 3px; color: #666;">▼</button>
                </div>
            
                <!-- Important Stats (Always Visible) -->
                <div id="multiplayer-stats">
                    <!-- Game Info (when in game) -->
                    <div id="game-stats" style="display: none;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; font-size: 0.65rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Room:</span>
                                <span id="room-code-display" style="color: #007bff; font-weight: bold;"></span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Players:</span>
                                <span id="player-count" style="color: #007bff; font-weight: bold;">1</span>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 4px; font-size: 0.65rem;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Turn:</span>
                                <span id="turn-indicator" style="color: #dc3545; font-weight: bold;">No</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Time:</span>
                                <span id="turn-timer" style="color: #007bff; font-weight: bold;">--</span>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.65rem;">
                            <span>Actions:</span>
                            <span id="actions-left" style="color: #007bff; font-weight: bold;">3/3</span>
                        </div>
                    </div>
                    
                    <!-- Quick Action Buttons (always visible when in game) -->
                    <div id="quick-actions" style="display: none; margin-top: 4px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px;">
                            <button id="next-turn-btn" class="tool-btn" style="padding: 3px; background: linear-gradient(135deg, #007bff, #0056b3); font-size: 0.6rem;">Next Turn</button>
                            <button id="sync-map-btn" class="tool-btn" style="padding: 3px; background: linear-gradient(135deg, #6c757d, #5a6268); font-size: 0.6rem;">Sync Map</button>
                        </div>
                    </div>
                </div>
            
                <!-- Dropdown Content (Hidden by default) -->
                <div id="multiplayer-dropdown" style="display: none; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.1);">
                    <!-- Room Controls -->
                    <div id="room-controls" style="margin-bottom: 6px;">
                        <button id="create-game-btn" class="tool-btn" style="width: 100%; margin-bottom: 4px; background: linear-gradient(135deg, #007bff, #0056b3); font-size: 0.6rem; padding: 3px;">Create Game</button>
                        <div style="margin-bottom: 4px;">
                            <select id="game-mode-select" style="width: 100%; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 0.6rem; background: white;">
                                <option value="free_for_all">Free for All</option>
                                <option value="teams">Teams</option>
                                <option value="coop">Cooperative</option>
                            </select>
                            <div id="game-mode-description" style="font-size: 0.55rem; color: #666; margin-top: 1px;"></div>
                        </div>
                        <div style="display: flex; gap: 3px;">
                            <input type="text" id="room-code-input" placeholder="Room Code" style="flex: 1; padding: 3px; border: 1px solid #ddd; border-radius: 3px; font-size: 0.6rem;">
                            <button id="join-game-btn" class="tool-btn" style="padding: 3px 6px; background: linear-gradient(135deg, #6c757d, #5a6268); font-size: 0.6rem;">Join</button>
                        </div>
                    </div>

                    <!-- Players List -->
                    <div id="players-list" style="display: none; margin-bottom: 6px;">
                        <h5 style="margin: 0 0 3px 0; font-size: 0.7rem; color: #333;">Players:</h5>
                        <div id="players-container" style="font-size: 0.6rem;"></div>
                    </div>

                    <!-- Additional Action Buttons -->
                    <div id="additional-actions" style="display: none; margin-bottom: 6px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px;">
                            <button id="refresh-map-btn" class="tool-btn" style="padding: 3px; background: linear-gradient(135deg, #dc3545, #c82333); font-size: 0.6rem;">Refresh</button>
                            <button id="leave-game-btn" class="tool-btn" style="padding: 3px; background: linear-gradient(135deg, #6c757d, #5a6268); font-size: 0.6rem;">Leave</button>
                        </div>
                    </div>

                    <!-- Team Panel -->
                    <div id="team-panel" style="display: none; margin-bottom: 6px; padding: 4px; background: rgba(111, 66, 193, 0.1); border-radius: 3px; border: 1px solid rgba(111, 66, 193, 0.3);">
                        <h5 style="margin: 0 0 3px 0; font-size: 0.7rem; color: #6f42c1;">Team:</h5>
                        <div id="team-info" style="font-size: 0.6rem; margin-bottom: 3px;">
                            <div>Status: <span id="team-status" style="color: #6f42c1;">No Team</span></div>
                            <div>Members: <span id="team-members" style="color: #6f42c1;">0</span></div>
                            <div id="team-id-display" style="display: none; margin-top: 2px; padding: 2px; background: rgba(0,0,0,0.1); border-radius: 2px;">
                                <div><strong>ID:</strong> <span id="team-id-text" style="color: #6f42c1;"></span></div>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; margin-bottom: 2px;">
                            <button id="create-team-btn" class="tool-btn" style="padding: 2px; background: linear-gradient(135deg, #6f42c1, #5a32a3); font-size: 0.55rem;">Create</button>
                            <button id="join-team-btn" class="tool-btn" style="padding: 2px; background: linear-gradient(135deg, #007bff, #0056b3); font-size: 0.55rem;">Join</button>
                        </div>
                        <button id="leave-team-btn" style="display: none; width: 100%; padding: 2px; background: linear-gradient(135deg, #dc3545, #c82333); color: white; border: none; border-radius: 2px; cursor: pointer; font-size: 0.55rem;">Leave Team</button>
                    </div>
                </div>
            </div>
        `;

        // Insert the multiplayer panel into the left sidebar (tools panel), after resources
        const leftSidebar = document.querySelector('.tools-panel');
        console.log('Left sidebar found:', leftSidebar);
        
        if (leftSidebar) {
            leftSidebar.appendChild(this.multiplayerPanel);
            console.log('Panel appended to left sidebar');
            console.log('Panel parent after insertion:', this.multiplayerPanel.parentElement);
        } else {
            // Fallback: try to find the center tool panel
            console.log('Left sidebar not found, trying center tool panel');
            const centerToolPanel = document.getElementById('toolPanel');
            console.log('Center tool panel found:', centerToolPanel);
            if (centerToolPanel) {
                centerToolPanel.appendChild(this.multiplayerPanel);
                console.log('Panel appended to center tool panel');
            } else {
                // Last resort: append to body
                document.body.appendChild(this.multiplayerPanel);
                console.log('Panel appended to body (last resort)');
            }
        }
        
        // Add a visible test element to make sure we can see something
        const testDiv = document.createElement('div');
        testDiv.innerHTML = 'MULTIPLAYER PANEL TEST - Should be visible';
        testDiv.style.cssText = 'background: red; color: white; padding: 10px; margin: 10px; border: 3px solid black; font-weight: bold; font-size: 16px;';
        document.body.appendChild(testDiv);
        console.log('Test element added to body');
        
        
        // No scrollbar styling needed - using dropdown approach
        
        this.setupUIEventListeners();
        console.log('Event listeners set up');
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
        
        const createBtn = document.getElementById('create-game-btn');
        const joinBtn = document.getElementById('join-game-btn');
        const leaveBtn = document.getElementById('leave-game-btn');
        
        if (createBtn) {
            console.log('Create game button found, adding listener');
            createBtn.addEventListener('click', () => {
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
            leaveBtn.addEventListener('click', () => this.leaveGame());
        }

        // Game mode selection
        const gameModeSelect = document.getElementById('game-mode-select');
        if (gameModeSelect) {
            gameModeSelect.addEventListener('change', () => this.updateGameModeDescription());
            // Initialize the description
            this.updateGameModeDescription();
        }

        const nextTurnBtn = document.getElementById('next-turn-btn');
        if (nextTurnBtn) {
            nextTurnBtn.addEventListener('click', () => this.advanceTurn());
        }

        const syncMapBtn = document.getElementById('sync-map-btn');
        if (syncMapBtn) {
            syncMapBtn.addEventListener('click', () => {
                console.log('Manual map sync requested');
                if (this.isInMultiplayer) {
                    this.sendMapState();
                    this.showNotification('Map state sent to other players', 'info');
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



    }

    updatePlayersList(players) {
        this.players.clear();
        players.forEach(player => {
            this.players.set(player.id, player);
        });
        this.updatePlayersDisplay();
    }

    updatePlayersDisplay() {
        const playersContainer = document.getElementById('players-container');
        if (!playersContainer) return;

        playersContainer.innerHTML = '';
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
                    <div style="font-weight: ${isCurrentPlayer ? 'bold' : 'normal'}; color: ${isCurrentPlayer ? '#FFD700' : 'white'};">${player.username} ${isCurrentPlayer ? '(You)' : ''}</div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        Wood: ${resources.wood || 0} | Ore: ${resources.ore || 0} | Power: ${resources.power || 0}
                    </div>
                </div>
                ${isCurrentTurn ? '<div style="color: #4CAF50; font-weight: bold;">TURN</div>' : ''}
            `;
            
            playersContainer.appendChild(playerDiv);
        });
    }

    updateUI() {
        console.log('updateUI called, isInMultiplayer:', this.isInMultiplayer);
        const statusText = document.getElementById('status-text');
        const gameStats = document.getElementById('game-stats');
        const roomControls = document.getElementById('room-controls');
        const playersList = document.getElementById('players-list');
        const actionButtons = document.getElementById('action-buttons');
        const teamPanel = document.getElementById('team-panel');
        
        console.log('UI elements found:', {
            statusText: !!statusText,
            gameStats: !!gameStats,
            roomControls: !!roomControls,
            playersList: !!playersList,
            actionButtons: !!actionButtons,
            teamPanel: !!teamPanel
        });

        if (this.wsManager.isConnected) {
            if (statusText) {
                statusText.textContent = 'Connected';
                statusText.style.color = '#28a745';
            }
        } else {
            if (statusText) {
                statusText.textContent = 'Disconnected';
                statusText.style.color = '#dc3545';
            }
        }

        if (this.isInMultiplayer) {
            if (roomControls) roomControls.style.display = 'none';
            if (gameStats) gameStats.style.display = 'block';
            
            // Show quick actions when in multiplayer
            const quickActions = document.getElementById('quick-actions');
            if (quickActions) quickActions.style.display = 'block';
            
            // Show the dropdown content when in multiplayer
            const playersList = document.getElementById('players-list');
            const additionalActions = document.getElementById('additional-actions');
            const teamPanel = document.getElementById('team-panel');
            
            if (playersList) playersList.style.display = 'block';
            if (additionalActions) additionalActions.style.display = 'block';
            if (teamPanel) teamPanel.style.display = 'block';
            
            console.log('Multiplayer UI shown - game stats visible, controls in dropdown');
            
            document.getElementById('room-code-display').textContent = this.currentRoom;
            document.getElementById('player-count').textContent = this.players.size;
            
            const isMyTurn = this.turnOrder[this.currentTurn] === this.playerId;
            document.getElementById('turn-indicator').textContent = isMyTurn ? 'Yes' : 'No';
            document.getElementById('turn-indicator').style.color = isMyTurn ? '#4CAF50' : '#f44336';
            
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
            
            // Update button visibility within the dropdown
            const nextTurnBtn = document.getElementById('next-turn-btn');
            if (nextTurnBtn) {
                nextTurnBtn.style.display = isMyTurn ? 'block' : 'none';
            }
            
            this.updatePlayersDisplay();
        } else {
            if (roomControls) roomControls.style.display = 'block';
            if (gameStats) gameStats.style.display = 'none';
            
            // Hide quick actions when not in multiplayer
            const quickActions = document.getElementById('quick-actions');
            if (quickActions) quickActions.style.display = 'none';
            
            // All other elements are in dropdown, which is hidden by default
            console.log('Not in multiplayer - showing room controls only');
        }
    }

    createGame() {
        const playerName = prompt('Enter your name:') || 'Player';
        const gameMode = document.getElementById('game-mode-select')?.value || 'free_for_all';
        console.log('Creating game with player name:', playerName, 'in mode:', gameMode);
        this.wsManager.send('create_game', {
            playerName: playerName,
            gameMode: gameMode
        });
    }

    joinGame() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }
        this.wsManager.send('join_game', {
            roomCode: roomCode,
            playerName: prompt('Enter your name:') || 'Player'
        });
    }

    leaveGame() {
        this.wsManager.send('leave_game', {});
        this.isInMultiplayer = false;
        this.currentRoom = null;
        this.playerId = null;
        this.players.clear();
        
        // Stop resource updates
        this.stopResourceUpdates();
        
        // Stop game state updates
        this.stopGameStateUpdates();
        
        // Stop turn timer
        this.stopTurnTimer();
        
        // Reset actions
        this.actionsThisTurn = 0;
        
        this.updateUI();
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
        notification.textContent = `Action Rejected: ${reason}`;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    isInMultiplayerMode() {
        return this.isInMultiplayer;
    }

    isMyTurn() {
        if (!this.isInMultiplayer || this.turnOrder.length === 0) {
            console.log('isMyTurn: not in multiplayer or no turn order, returning true');
            return true;
        }
        const isMyTurn = this.turnOrder[this.currentTurn] === this.playerId;
        console.log('isMyTurn check:', {
            isInMultiplayer: this.isInMultiplayer,
            turnOrderLength: this.turnOrder.length,
            currentTurn: this.currentTurn,
            currentPlayerId: this.turnOrder[this.currentTurn],
            myPlayerId: this.playerId,
            isMyTurn: isMyTurn
        });
        return isMyTurn;
    }

    advanceTurn() {
        if (!this.isInMultiplayer) return;
        
        this.wsManager.send('advance_turn', {
            roomCode: this.currentRoom,
            playerId: this.playerId
        });
    }

    canPlaceBuilding() {
        if (!this.isInMultiplayer) return true;
        
        // If turn order is not set up yet, allow placement
        if (!this.turnOrder || this.turnOrder.length === 0) {
            console.log('Turn order not set up yet, allowing placement');
            return true;
        }
        
        const isMyTurn = this.isMyTurn();
        const hasActionsLeft = this.actionsThisTurn < this.maxActionsPerTurn;
        
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

    // Game mode methods
    updateGameModeDescription() {
        const gameModeSelect = document.getElementById('game-mode-select');
        const descriptionDiv = document.getElementById('game-mode-description');
        
        if (!gameModeSelect || !descriptionDiv) return;
        
        const descriptions = {
            'free_for_all': 'Build your city independently, compete for resources and territory',
            'team_based': 'Work in teams to build connected cities and shared infrastructure',
            'competitive': 'Compete for limited resources in a high-stakes economic battle',
            'collaborative': 'Work together to build the ultimate megacity with shared goals'
        };
        
        descriptionDiv.textContent = descriptions[gameModeSelect.value] || descriptions['free_for_all'];
    }

    handleGameModesList(data) {
        console.log('Available game modes:', data.modes);
        // This could be used to dynamically populate the game mode selector
    }

    handleGameCreationFailed(data) {
        this.showNotification(`Game creation failed: ${data.reason}`, 'error');
    }

    // Map synchronization methods
    syncMap(cellData) {
        console.log('Syncing map with server data...', cellData);
        
        if (!this.mapSystem || !this.mapSystem.cells) {
            console.error('MapSystem not available for sync');
            return;
        }

        if (!cellData || !Array.isArray(cellData)) {
            console.error('Invalid cell data received:', cellData);
            return;
        }

        // Only sync if we don't have any player modifications yet
        // This prevents overwriting the current player's work
        let hasPlayerModifications = false;
        
        // Check if this is the first sync (when joining a game)
        const isFirstSync = !this.hasSyncedBefore;
        this.hasSyncedBefore = true;
        
        if (!isFirstSync) {
            for (let row = 0; row < this.mapSystem.cells.length; row++) {
                for (let col = 0; col < this.mapSystem.cells[row].length; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell && this.mapSystem.isPlayerPlaced && this.mapSystem.isPlayerPlaced(row, col)) {
                        hasPlayerModifications = true;
                        break;
                    }
                }
                if (hasPlayerModifications) break;
            }
        }

        if (hasPlayerModifications) {
            console.log('Player has modifications, skipping map sync to prevent overwrite');
            this.showNotification('Map sync skipped - you have modifications', 'warning');
            return;
        }

        console.log('Applying map sync...');
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

        console.log(`Updated ${cellsUpdated} cells`);

        // Update the visual representation
        this.mapSystem.updateStats();
        
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
        console.log('startTurnTimer called');
        this.stopTurnTimer(); // Clear any existing timer
        this.turnStartTime = Date.now();
        console.log('Turn start time set:', this.turnStartTime);
        
        this.turnTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.turnStartTime) / 1000);
            const remaining = this.turnTimeLimit - elapsed;
            
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
        
        console.log(`Turn timer started: ${this.turnTimeLimit} seconds`);
    }

    stopTurnTimer() {
        if (this.turnTimer) {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        this.updateTurnTimerDisplay(0);
    }

    updateTurnTimerDisplay(remaining) {
        const timerElement = document.getElementById('turn-timer');
        if (timerElement) {
            if (remaining > 0) {
                timerElement.textContent = `${remaining}s`;
                timerElement.style.color = remaining <= 10 ? '#f44336' : '#4CAF50';
            } else {
                timerElement.textContent = '--';
                timerElement.style.color = '#666';
            }
            console.log('Turn timer updated:', remaining);
        } else {
            console.log('Turn timer element not found!');
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