// Cell Interaction - Click handling, painting, and validation
class CellInteraction {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.paintedCells = new Set(); // Track painted cells during current drag
    }
    
    handleCellClick(e) {
        // Handle cell click events - only for single clicks (not drag operations)
        const cell = e.target;
        if (cell.classList.contains('cell')) {
            // Only handle click if we're not in a drag operation
            // Add a small delay to ensure this is a real click, not part of a drag
            setTimeout(() => {
                if (!this.mapSystem.isDragging) {
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    
                    // Check if game is paused in multiplayer mode
                    if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode() && window.multiplayerIntegration.gamePaused) {
                        console.log('Game is paused - blocking all actions');
                        window.multiplayerIntegration.showNotification('Game is paused - no actions allowed', 'warning');
                        return;
                    }
                    
                    // Check if it's the player's turn in multiplayer mode
                    if (window.multiplayerIntegration && !window.multiplayerIntegration.canPlaceBuilding(this.mapSystem.selectedAttribute)) {
                        this.showTurnError(cell);
                        return;
                    }

                    // Check if placement is valid
                    if (!this.isValidPlacement(row, col, this.mapSystem.selectedAttribute)) {
                        this.showPlacementError(cell, this.mapSystem.selectedAttribute);
                        return;
                    }
                    
                    // Check resource costs BEFORE placing
                    if (this.mapSystem.resourceManagement) {
                        const costs = this.getBuildingCosts(this.mapSystem.selectedAttribute);
                        if (costs) {
                            if (!this.mapSystem.resourceManagement.hasEnoughResources(costs)) {
                                this.showInsufficientResourcesError(cell, this.mapSystem.selectedAttribute, costs);
                                return;
                            }
                        }
                    }
                    
                    // Place the building
                    this.paintCell(cell, true); // Skip validation since it was already checked
                }
            }, 10); // Small delay to distinguish clicks from drags
        }
    }
    
    handleCellMouseDown(e) {
        // Don't paint in viewer mode
        if (this.mapSystem.currentTab === 'viewer') {
            return;
        }
        
        // Check if game is paused in multiplayer mode
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode() && window.multiplayerIntegration.gamePaused) {
            console.log('Game is paused - blocking mouse interaction');
            window.multiplayerIntegration.showNotification('Game is paused - no actions allowed', 'warning');
            return;
        }
        
        e.preventDefault(); // Prevent text selection
        this.mapSystem.clearAllErrorStyling(); // Clear any existing error states
        
        // Set the selected attribute based on current mode
        if (this.mapSystem.currentTab === 'player') {
            this.mapSystem.selectedAttribute = this.mapSystem.playerMode;
        }
        
        // Safety check: don't place if selectedAttribute is null
        if (!this.mapSystem.selectedAttribute) {
            console.log('No selected attribute, skipping placement');
            return;
        }
        
        this.mapSystem.isDragging = true;
        this.mapSystem.dragStartCell = e.target;
        this.mapSystem.lastPaintedCell = null;
        
        // For single clicks, let the click handler deal with it
        // For drag operations, we'll paint in handleGlobalMouseMove
    }
    
    handleGlobalMouseMove(e) {
        // Don't paint in viewer mode
        if (this.mapSystem.currentTab === 'viewer') {
            return;
        }
        
        if (this.mapSystem.isDragging) {
            const cell = e.target;
            // Check if we're over a cell and it hasn't been painted in this drag operation
            if (cell.classList.contains('cell') && !this.paintedCells.has(cell)) {
                // Set the selected attribute based on current mode
                if (this.mapSystem.currentTab === 'player') {
                    this.mapSystem.selectedAttribute = this.mapSystem.playerMode;
                }
                
                // Check if placement is valid before painting
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                // Check if cell already has the attribute we're trying to place
                const currentCell = this.mapSystem.cells[row][col];
                if (currentCell.attribute === this.mapSystem.selectedAttribute || 
                    currentCell.class === this.mapSystem.selectedAttribute) {
                    // Cell already has this attribute, skip painting
                    this.paintedCells.add(cell); // Add to set to prevent future attempts
                    return;
                }
                
                if (this.isValidPlacement(row, col, this.mapSystem.selectedAttribute)) {
                    // Paint immediately and add to painted cells set
                    this.paintCell(cell, true); // Pass true to skip validation in paintCell
                    this.paintedCells.add(cell);
                    console.log('Painted cell, added to set:', cell, 'Set size:', this.paintedCells.size);
                } else {
                    // Show error for invalid placement
                    this.showPlacementError(cell, this.mapSystem.selectedAttribute);
                    console.log('Validation failed for cell:', cell, 'Attribute:', this.mapSystem.selectedAttribute);
                }
            }
        }
    }
    
    handleGlobalMouseUp(e) {
        if (this.mapSystem.isDragging) {
            this.mapSystem.isDragging = false;
            this.mapSystem.dragStartCell = null;
            this.mapSystem.lastPaintedCell = null;
            this.paintedCells.clear(); // Clear painted cells set
        }
    }
    
    handleGlobalMouseLeave(e) {
        // Stop dragging if mouse leaves the document
        if (this.mapSystem.isDragging) {
            this.mapSystem.isDragging = false;
            this.mapSystem.dragStartCell = null;
            this.mapSystem.lastPaintedCell = null;
            this.paintedCells.clear(); // Clear painted cells set
        }
    }
    
    paintCell(cell, skipValidation = false) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        console.log('paintCell called:', {
            attribute: this.mapSystem.selectedAttribute,
            row, col,
            skipValidation
        });
        
        // Check if game is paused in multiplayer mode
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode() && window.multiplayerIntegration.gamePaused) {
            console.log('Game is paused - blocking all actions');
            window.multiplayerIntegration.showNotification('Game is paused - no actions allowed', 'warning');
            return;
        }
        
        // Store the previous attribute to check if we're removing water
        const previousAttribute = this.mapSystem.cells[row][col].attribute;
        const previousClass = this.mapSystem.cells[row][col].class;
        
        // Handle erase mode
        if (this.mapSystem.selectedAttribute === 'erase') {
            // Check if current tile is protected natural terrain
            const currentCell = this.mapSystem.cells[row][col];
            const protectedTerrain = ['ocean', 'lake', 'forest', 'mountain', 'water', 'river', 'riverStart', 'riverEnd'];
            
            if (protectedTerrain.includes(currentCell.attribute) || protectedTerrain.includes(currentCell.class)) {
                // Show error feedback for protected terrain
                this.showEraseError(cell, currentCell.attribute || currentCell.class);
                return;
            }
            
            // Only erase if it's player-placed infrastructure/zoning
            if (this.mapSystem.isPlayerPlaced(row, col)) {
                // In multiplayer, only allow erasing your own buildings
                if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
                    const cell = this.mapSystem.cells[row][col];
                    if (cell.playerId && cell.playerId !== window.multiplayerIntegration.playerId) {
                        this.showEraseError(cell, 'Cannot erase other player\'s buildings');
                        return;
                    }
                }
                // Get the cost of the item being erased for refund calculation
                const erasedAttribute = currentCell.attribute;
                const refundAmounts = this.calculateRefundAmounts(erasedAttribute);
                
                // Erase the item
                this.mapSystem.erasePlayerModifications(row, col);
                
                // Send multiplayer update if in multiplayer mode
                if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
                    // Check if this building was placed in the current turn (before erasing)
                    const wasPlacedThisTurn = currentCell && currentCell.placedThisTurn === true;
                    
                    window.multiplayerIntegration.sendGameAction('remove', row, col, erasedAttribute, null);
                    
                    // Handle action counting for erasing
                    if (window.multiplayerIntegration.isMyTurn()) {
                        if (wasPlacedThisTurn) {
                            // Refund the action since we're erasing something we placed this turn
                            const actionCost = window.multiplayerIntegration.getActionCost(erasedAttribute);
                            window.multiplayerIntegration.actionsThisTurn = Math.max(0, window.multiplayerIntegration.actionsThisTurn - actionCost);
                            console.log(`Action refunded for erasing current turn building: ${window.multiplayerIntegration.actionsThisTurn}/${window.multiplayerIntegration.maxActionsPerTurn} (refunded: ${actionCost})`);
                            window.multiplayerIntegration.showNotification(`Action refunded - erased building from current turn! (${actionCost} action(s) refunded)`, 'success');
                            // Update action counter display
                            window.multiplayerIntegration.updateActionCounter();
                        } else {
                            // No action cost for erasing buildings from previous turns
                            console.log(`No action cost for erasing previous turn building: ${window.multiplayerIntegration.actionsThisTurn}/${window.multiplayerIntegration.maxActionsPerTurn}`);
                            window.multiplayerIntegration.showNotification('Building erased from previous turn - no action cost', 'info');
                        }
                    }
                }
                
                // Add refund to resources
                if (this.mapSystem.resourceManagement && refundAmounts) {
                    for (const [resource, amount] of Object.entries(refundAmounts)) {
                        this.mapSystem.resourceManagement.addResource(resource, amount);
                    }
                    console.log(`Refunded ${JSON.stringify(refundAmounts)} for erasing ${erasedAttribute}`);
                }
                
                // Update resource management after erasing
                if (this.mapSystem.resourceManagement) {
                    this.mapSystem.resourceManagement.recalculate();
                }
                
                // Update UI to show action changes
                if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
                    window.multiplayerIntegration.updateUI();
                }
            }
            this.mapSystem.lastPaintedCell = cell;
            this.updateCellInfo();
            return;
        }
        
        // Check if it's the player's turn in multiplayer mode
        if (window.multiplayerIntegration && !window.multiplayerIntegration.canPlaceBuilding(this.mapSystem.selectedAttribute)) {
            this.showTurnError(cell);
            return;
        }

        // Check if placement is valid (specific validation first, then general)
        // Skip validation if called from drag handler (already validated)
        if (!skipValidation && !this.isValidPlacement(row, col, this.mapSystem.selectedAttribute)) {
            // Show error feedback and don't place
            this.showPlacementError(cell, this.mapSystem.selectedAttribute);
            return;
        }
        
        // Check resource costs BEFORE placing
        if (this.mapSystem.resourceManagement) {
            const costs = this.getBuildingCosts(this.mapSystem.selectedAttribute);
            if (costs) {
                // Check if player has enough resources
                if (!this.mapSystem.resourceManagement.hasEnoughResources(costs)) {
                    this.showInsufficientResourcesError(cell, this.mapSystem.selectedAttribute, costs);
                    return;
                }
            }
        }
        
        // Save original terrain before making changes (for erase functionality)
        this.mapSystem.saveOriginalTerrain(row, col);
        
        // Update cell attribute and class
        this.mapSystem.cells[row][col].attribute = this.mapSystem.selectedAttribute;
        this.mapSystem.cells[row][col].class = this.mapSystem.selectedClass;
        
        // Tag with player ownership in multiplayer
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
            this.mapSystem.cells[row][col].playerId = window.multiplayerIntegration.playerId;
            this.mapSystem.cells[row][col].placedThisTurn = true; // Mark as placed this turn
        }
        
        // Send multiplayer update if in multiplayer mode
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
            window.multiplayerIntegration.sendGameAction('place', row, col, this.mapSystem.selectedAttribute, this.mapSystem.selectedClass);
            
            // Count action if it's our turn
            if (window.multiplayerIntegration.isMyTurn()) {
                const actionCost = window.multiplayerIntegration.getActionCost(this.mapSystem.selectedAttribute);
                window.multiplayerIntegration.actionsThisTurn += actionCost;
                console.log(`Action used: ${window.multiplayerIntegration.actionsThisTurn}/${window.multiplayerIntegration.maxActionsPerTurn} (cost: ${actionCost})`);
                // Update action counter display
                window.multiplayerIntegration.updateActionCounter();
            }
        }
        
        // Update visual representation
        this.mapSystem.updateCellVisual(row, col);
        
        // Handle water region reclassification
        if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(this.mapSystem.selectedAttribute)) {
            if (this.mapSystem.waterSystem) {
                this.mapSystem.waterSystem.classifyWaterRegions();
            }
        } else if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(previousAttribute)) {
            // If we're removing water, reclassify nearby water regions
            if (this.mapSystem.waterSystem) {
                this.mapSystem.waterSystem.reclassifyWaterAfterRemoval(row, col);
            }
        }
        
        // Handle road region reclassification
        if (['road', 'bridge'].includes(this.mapSystem.selectedAttribute)) {
            if (this.mapSystem.roadSystem) {
                this.mapSystem.roadSystem.classifyRoadRegions();
            }
        } else if (['road', 'bridge'].includes(previousAttribute)) {
            // If we're removing roads, reclassify nearby road regions
            if (this.mapSystem.roadSystem) {
                this.mapSystem.roadSystem.reclassifyRoadAfterRemoval(row, col);
            }
        }
        
        // Update stats
        this.mapSystem.updateStats();
        
        // Update resource management
        if (this.mapSystem.resourceManagement) {
            // Deduct resource costs for buildings
            const costs = this.getBuildingCosts(this.mapSystem.selectedAttribute);
            if (costs) {
                // Deduct resources (we already checked availability above)
                for (const [resource, amount] of Object.entries(costs)) {
                    this.mapSystem.resourceManagement.removeResource(resource, amount);
                }
            }
            this.mapSystem.resourceManagement.recalculate();
        }
        
        // Update last painted cell for drag painting
        this.mapSystem.lastPaintedCell = cell;
        
        // Update info panel
        this.updateCellInfo();
        
        // Update road connections after any placement or erasure with a delay
        setTimeout(() => {
            // Verify the cell data is actually updated before checking road connections
            const cell = this.mapSystem.cells[row][col];
            console.log(`Road update for ${this.mapSystem.selectedAttribute} at ${row},${col}:`, cell);
            console.log(`Cell attribute: "${cell.attribute}", Cell class: "${cell.class}"`);
            
            // Ensure roads remain connected to industrial zones after any building placement
            this.ensureRoadConnectionsToIndustrial();
            
            this.updateRoadConnections();
        }, 200); // Increased delay to ensure building is fully placed and processed
        
        // If we just placed an industrial zone, update road connections again to ensure they become operable
        if (this.mapSystem.selectedAttribute === 'industrial') {
            // Call the road system's specific method for industrial zone placement with a delay
            if (this.mapSystem.roadSystem) {
                setTimeout(() => {
                    console.log(`Industrial zone specific update for ${row},${col}`);
                    this.mapSystem.roadSystem.onIndustrialZonePlaced(row, col);
                }, 250); // Increased delay to ensure industrial zone is fully processed
            }
        }
    }
    
    handleCellHover(e) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const cell = this.mapSystem.cells[row][col];
        
        // Update info panel with hovered cell info
        document.getElementById('cellInfo').innerHTML = `
            <div class="info-item">
                <span class="info-label">Position:</span>
                <span class="info-value">Row ${row}, Col ${col}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Type:</span>
                <span class="info-value">${cell.attribute}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Class:</span>
                <span class="info-value">${cell.class}</span>
            </div>
        `;
    }
    
    handleCellLeave(e) {
        // Reset info panel to selected tool info
        this.updateCellInfo();
    }
    
    updateCellInfo() {
        const cellInfo = document.getElementById('cellInfo');
        if (cellInfo) {
            const classData = this.mapSystem.classInfo.getClassData(this.mapSystem.selectedAttribute);
            cellInfo.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Selected:</span>
                    <span class="info-value">${this.mapSystem.selectedAttribute}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Description:</span>
                    <span class="info-value">${classData.description}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Rules:</span>
                    <span class="info-value">${classData.rules}</span>
                </div>
            `;
        }
    }
    
    isValidPlacement(row, col, attribute) {
        // Check bounds
        if (row < 0 || row >= this.mapSystem.mapSize.rows || col < 0 || col >= this.mapSystem.mapSize.cols) {
            return false;
        }
        
        // First, check specific validation for buildings that have special rules
        switch (attribute) {
            case 'bridge':
                return this.isValidBridgePlacement(row, col);
            case 'road':
                return this.isValidRoadPlacement(row, col);
            case 'powerPlant':
                return this.isValidPowerPlantPlacement(row, col);
            case 'powerLines':
                return this.isValidPowerLinesPlacement(row, col);
            case 'lumberYard':
                return this.isValidLumberYardPlacement(row, col);
            case 'miningOutpost':
                return this.isValidMiningOutpostPlacement(row, col);
            case 'industrial':
                return this.isValidIndustrialPlacement(row, col);
            case 'commercial':
                return this.isValidCommercialPlacement(row, col);
            case 'residential':
                return this.isValidResidentialPlacement(row, col);
            case 'mixed':
                return this.isValidMixedPlacement(row, col);
        }
        
        // For other attributes, do general validation
        if (this.mapSystem.currentTab === 'player') {
            const currentCell = this.mapSystem.cells[row][col];
            const naturalTerrain = ['forest', 'mountain', 'lake', 'ocean', 'water', 'river', 'riverStart', 'riverEnd'];
            const infrastructure = ['road', 'bridge', 'powerPlant', 'powerLines', 'lumberYard', 'miningOutpost'];
            const zoning = ['residential', 'commercial', 'industrial', 'mixed'];
            
            // Allow buildings to be placed on grassland
            if (currentCell.attribute === 'grassland' || currentCell.class === 'grassland') {
                // Building on grassland is allowed, continue with other checks
            }
            // Check if current cell is natural terrain
            else if (naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class)) {
                return false; // No buildings on natural terrain
            }
            
            // Prevent replacing existing infrastructure unless using erase
            if (attribute !== 'erase') {
                if (infrastructure.includes(currentCell.attribute) || infrastructure.includes(currentCell.class)) {
                    return false;
                }
                if (zoning.includes(currentCell.attribute) || zoning.includes(currentCell.class)) {
                    return false;
                }
            }
        }
        
        // Special placement rules for different attributes
        // Handle special cases
        if (attribute === 'erase') {
            return true; // Erase can be used on any tile
        }
        if (attribute === 'riverStart') {
            return this.isValidRiverStartPlacement(row, col);
        }
        if (attribute === 'riverEnd') {
            return this.isValidRiverEndPlacement(row, col);
        }
        
        // Default to true for other attributes
        return true;
    }
    
    isValidRiverStartPlacement(row, col) {
        // River start must be on the edge of the map
        return (row === 0 || row === this.mapSystem.mapSize.rows - 1 || 
                col === 0 || col === this.mapSystem.mapSize.cols - 1);
    }
    
    isValidRiverEndPlacement(row, col) {
        // River end must be adjacent to water
        return this.mapSystem.isAdjacentToAnyWater(row, col);
    }
    
    isValidPowerPlantPlacement(row, col) {
        // Power plant must have water access OR be adjacent to another power plant
        return this.mapSystem.hasPowerPlantAccess(row, col);
    }
    
    isValidPowerLinesPlacement(row, col) {
        // Power lines cannot be placed on power plants
        const currentCell = this.mapSystem.cells[row][col];
        if (currentCell.attribute === 'powerPlant') {
            return false;
        }
        
        // Power lines must be adjacent to power plant or other power lines
        return this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
    }
    
    isValidLumberYardPlacement(row, col) {
        // Check if player has enough wood (10 wood required)
        if (this.mapSystem.resourceManagement && this.mapSystem.resourceManagement.resources.wood < 10) {
            return false;
        }
        
        // Lumber yard must have forests within 3 tiles
        return this.mapSystem.hasLumberYardForestAccess(row, col);
    }
    
    isValidMiningOutpostPlacement(row, col) {
        // Check if player has enough resources (20 wood and 10 ore required)
        if (this.mapSystem.resourceManagement) {
            if (this.mapSystem.resourceManagement.resources.wood < 20) {
                return false;
            }
            if (this.mapSystem.resourceManagement.resources.ore < 10) {
                return false;
            }
        }
        
        // Mining outpost must be within 1 tile of a mountain (4 directions only)
        return this.isAdjacentToMountain4Directions(row, col);
    }
    
    isAdjacentToMountain4Directions(row, col) {
        // Check only 4 adjacent cells (up, down, left, right)
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (const dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            // Check bounds
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'mountain' || cell.class === 'mountain') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isValidIndustrialPlacement(row, col) {
        // Industrial must have water access and be near power
        const hasWater = this.mapSystem.hasIndustrialWaterAccess(row, col);
        const hasPower = this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
        
        console.log(`Industrial placement at (${row}, ${col}): water=${hasWater}, power=${hasPower}`);
        
        return hasWater && hasPower;
    }
    
    isValidCommercialPlacement(row, col) {
        // Commercial must be near operable roads AND within 5 tiles of power
        const hasRoadAccess = this.mapSystem.roadSystem ? 
            this.mapSystem.roadSystem.hasRoadAccess(row, col) : 
            this.mapSystem.isAdjacentToCommercialRoad(row, col);
        const hasPowerAccess = this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
        
        return hasRoadAccess && hasPowerAccess;
    }
    
    isValidResidentialPlacement(row, col) {
        // Residential must be near operable roads and not too close to industrial
        const hasRoadAccess = this.mapSystem.roadSystem ? 
            this.mapSystem.roadSystem.hasRoadAccess(row, col) : 
            this.mapSystem.isAdjacentToCommercialRoad(row, col);
        
        return hasRoadAccess && !this.mapSystem.isAdjacentToIndustrial(row, col);
    }
    
    
    
    
    isValidMixedPlacement(row, col) {
        // Mixed use only requires power within a 5x5 area
        console.log(`Checking mixed use placement at ${row},${col}`);
        if (this.mapSystem.powerLineSystem) {
            const result = this.mapSystem.powerLineSystem.isWithinPowerPlantOrPowerLinesRadius(row, col, 2); // 2 radius = 5x5 area
            console.log(`Mixed use power check result: ${result}`);
            return result;
        }
        // Fallback to adjacent power check
        console.log(`Using fallback power check for mixed use at ${row},${col}`);
        return this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
    }
    
    // Ensure roads remain connected to industrial zones after any building placement
    ensureRoadConnectionsToIndustrial() {
        if (!this.mapSystem.roadSystem) return;
        
        console.log('Ensuring road connections to industrial zones...');
        
        // First, validate all road connections
        const validation = this.mapSystem.roadSystem.validateAllRoadConnections();
        
        // If there are disconnected roads, try to fix them
        if (validation.disconnectedRoads > 0) {
            console.log(`Found ${validation.disconnectedRoads} disconnected roads - attempting to fix...`);
            
            // Force a complete road connection update
            this.mapSystem.roadSystem.updateRoadConnections();
            
            // Validate again to see if the fix worked
            const revalidation = this.mapSystem.roadSystem.validateAllRoadConnections();
            console.log(`After fix: ${revalidation.connectedRoads}/${revalidation.totalRoads} connected, ${revalidation.disconnectedRoads} disconnected`);
        }
    }
    
    // Check if there's an industrial zone nearby that could connect to a road
    hasNearbyIndustrialZone(row, col) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                newCol >= 0 && newCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[newRow][newCol];
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    return true; // Found an industrial zone nearby
                }
            }
        }
        
        return false;
    }
    
    showPlacementError(cell, attribute) {
        // Add error styling
        cell.style.border = '2px solid #ff0000';
        cell.style.backgroundColor = '#ffcccc';
        
        // Show specific error message for City Player Pro
        if (this.mapSystem.currentTab === 'player') {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            const currentCell = this.mapSystem.cells[row][col];
            const naturalTerrain = ['forest', 'mountain', 'lake', 'ocean', 'water', 'river', 'riverStart', 'riverEnd'];
            
            let errorMessage = '';
            
            if (naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class)) {
                // Allow bridges on water
                if (attribute === 'bridge' && (currentCell.attribute === 'water' || currentCell.attribute === 'lake' || 
                    currentCell.attribute === 'ocean' || currentCell.attribute === 'river' ||
                    currentCell.class === 'water' || currentCell.class === 'lake' || 
                    currentCell.class === 'ocean' || currentCell.class === 'river')) {
                    errorMessage = '❌ Bridges must be placed on water next to roads!';
                } else {
                    errorMessage = `❌ Cannot place ${attribute} on ${currentCell.attribute || currentCell.class} terrain!\nNatural terrain cannot be built on.`;
                }
            } else {
                // Check if trying to replace existing infrastructure
                const infrastructure = ['road', 'bridge', 'powerPlant', 'powerLines', 'lumberYard', 'miningOutpost'];
                const zoning = ['residential', 'commercial', 'industrial', 'mixed'];
                
                if (infrastructure.includes(currentCell.attribute) || zoning.includes(currentCell.attribute)) {
                    errorMessage = `❌ Cannot place ${attribute} on existing ${currentCell.attribute}!\nUse the erase tool to remove it first.`;
                } else if (attribute === 'powerPlant') {
                    errorMessage = '❌ Power plant requires water within 1 tile or to be adjacent to another power plant!';
                } else if (attribute === 'powerLines') {
                if (currentCell.attribute === 'powerPlant') {
                    errorMessage = '❌ Cannot place power lines on power plants!';
                } else {
                    errorMessage = '❌ Power lines must be within 5 tiles of a power plant or adjacent to other power lines!';
                }
            } else if (attribute === 'lumberYard') {
                if (this.mapSystem.resourceManagement && this.mapSystem.resourceManagement.resources.wood < 10) {
                    errorMessage = '❌ Lumber yard requires 10 wood to build! Check your resources.';
                } else {
                    errorMessage = '❌ Lumber yard must be placed within 3 tiles of forests!';
                }
                } else if (attribute === 'miningOutpost') {
                if (this.mapSystem.resourceManagement) {
                    if (this.mapSystem.resourceManagement.resources.wood < 20) {
                        errorMessage = '❌ Mining outpost requires 20 wood to build! Check your resources.';
                    } else if (this.mapSystem.resourceManagement.resources.ore < 10) {
                        errorMessage = '❌ Mining outpost requires 10 ore to build! Check your resources.';
                    } else {
                        errorMessage = '❌ Mining outpost must be placed within 1 tile of a mountain!';
                    }
                } else {
                    errorMessage = '❌ Mining outpost must be placed within 1 tile of a mountain!';
                }
            } else if (attribute === 'road') {
                // Road placement validation
                if (!this.isValidRoadPlacement(row, col)) {
                    // Check if it's water
                    const currentCell = this.mapSystem.cells[row][col];
                    const waterTypes = ['water', 'lake', 'ocean', 'river'];
                    const isWater = waterTypes.includes(currentCell.attribute) || waterTypes.includes(currentCell.class);
                    
                    if (isWater) {
                        errorMessage = '❌ Roads cannot be placed on water! Use bridges instead.';
                    } else {
                        errorMessage = '❌ Roads must be placed next to industrial zones, roads, or bridges!';
                    }
                }
            } else if (attribute === 'bridge') {
                // Bridge placement validation
                if (!this.isValidBridgePlacement(row, col)) {
                    errorMessage = '❌ Bridges must be placed on water next to roads or bridges!';
                }
            } else {
                errorMessage = `❌ Cannot place ${attribute} here! Check building requirements.`;
            }
            }
            
            // Show tooltip with specific error message
            this.showErrorTooltip(cell, errorMessage);
        }
        
        // Remove error styling after 2 seconds
        setTimeout(() => {
            this.clearErrorStyling(cell);
        }, 2000);
    }
    
    showTurnError(cell) {
        // Add error styling
        cell.style.border = '2px solid #FF9800';
        cell.style.backgroundColor = '#fff3cd';
        
        // Show error message with more context
        const actionsLeft = window.multiplayerIntegration ? 
            (window.multiplayerIntegration.maxActionsPerTurn - window.multiplayerIntegration.actionsThisTurn) : 0;
        const errorMsg = actionsLeft <= 0 ? 
            `You are out of actions this turn! (${window.multiplayerIntegration.actionsThisTurn}/${window.multiplayerIntegration.maxActionsPerTurn} used)` :
            'Not your turn! Wait for your turn to place buildings.';
        this.showErrorTooltip(cell, errorMsg);
        
        // Remove error styling after a delay
        setTimeout(() => {
            this.clearErrorStyling(cell);
        }, 3000);
    }

    clearErrorStyling(cell) {
        cell.style.border = '';
        cell.style.backgroundColor = '';
    }
    
    clearAllErrorStyling() {
        document.querySelectorAll('.cell').forEach(cell => {
            this.clearErrorStyling(cell);
        });
    }
    
    showErrorTooltip(cell, message) {
        // Remove any existing tooltip
        const existingTooltip = document.querySelector('.error-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'error-tooltip';
        tooltip.textContent = message;
        tooltip.style.cssText = `
            position: absolute;
            background: #ff4444;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
        `;
        
        // Position tooltip near the cell
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = (rect.left + rect.width / 2) + 'px';
        tooltip.style.top = (rect.top - 40) + 'px';
        tooltip.style.transform = 'translateX(-50%)';
        
        // Add to document
        document.body.appendChild(tooltip);
        
        // Remove tooltip after 3 seconds
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 3000);
    }
    
    showEraseError(cell, terrainType) {
        // Add error styling
        cell.style.border = '2px solid #f39c12';
        cell.style.backgroundColor = '#fef5e7';
        
        // Show specific error message for erase mode
        if (this.mapSystem.currentTab === 'player') {
            const errorMessage = `Cannot erase ${terrainType} - protected natural terrain`;
            this.showErrorTooltip(cell, errorMessage);
        }
        
        // Remove error styling after 2 seconds
        setTimeout(() => {
            this.clearErrorStyling(cell);
        }, 2000);
    }
    
    getBuildingCosts(attribute) {
        const costs = {
            // Basic infrastructure - doubled cost
            'road': { wood: 4 },
            'bridge': { wood: 16, ore: 6 },

            // Zoning - updated costs
            'residential': { wood: 60, ore: 8 },
            'commercial': { wood: 30, ore: 20 },
            'industrial': { wood: 40, ore: 20 },
            'mixed': { wood: 44, ore: 24 },

            // Power infrastructure - unchanged
            'powerPlant': { wood: 25, ore: 15 },
            'powerLines': { wood: 3, ore: 1 },

            // Resource production - unchanged
            'lumberYard': { wood: 10 }, // Pays for itself in 20 seconds
            'miningOutpost': { wood: 20, ore: 10 }, // Pays for itself in 40 seconds

            // No cost items
            'erase': null,
            'water': null,
            'grassland': null,
            'forest': null,
            'mountain': null,
            'desert': null,
            'riverStart': null,
            'riverEnd': null,
            'river': null,
            'lake': null,
            'ocean': null
        };

        return costs[attribute] || null;
    }
    
    calculateRefundAmounts(attribute) {
        const costs = this.getBuildingCosts(attribute);
        if (!costs) return null;
        
        // Refund 50% of the original cost
        const refundRate = 0.5;
        const refundAmounts = {};
        
        for (const [resource, amount] of Object.entries(costs)) {
            refundAmounts[resource] = Math.floor(amount * refundRate);
        }
        
        return refundAmounts;
    }
    
    isValidRoadPlacement(row, col) {
        // Use the road system for validation
        if (this.mapSystem.roadSystem) {
            return this.mapSystem.roadSystem.isValidRoadPlacement(row, col);
        }
        
        // Fallback validation if road system is not available
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            // Check bounds
            if (newRow >= 0 && newRow < this.mapSystem.rows && 
                newCol >= 0 && newCol < this.mapSystem.cols) {
                
                const adjacentCell = this.mapSystem.cells[newRow][newCol];
                
                // Check if adjacent cell is industrial
                if (adjacentCell.attribute === 'industrial' || adjacentCell.class === 'industrial') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isRoadConnected(row, col) {
        // Use the road system for connection checking
        if (this.mapSystem.roadSystem) {
            return this.mapSystem.roadSystem.isRoadConnected(row, col);
        }
        
        // Fallback validation if road system is not available
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            // Check bounds
            if (newRow >= 0 && newRow < this.mapSystem.rows && 
                newCol >= 0 && newCol < this.mapSystem.cols) {
                
                const adjacentCell = this.mapSystem.cells[newRow][newCol];
                if (adjacentCell.attribute === 'industrial' || adjacentCell.attribute === 'road' ||
                    adjacentCell.class === 'industrial' || adjacentCell.class === 'road') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isValidBridgePlacement(row, col) {
        // Check if there's a road or bridge adjacent to this position
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];
        
        // First check if the target cell is water
        const currentCell = this.mapSystem.cells[row][col];
        const waterTypes = ['water', 'lake', 'ocean', 'river'];
        const isWater = waterTypes.includes(currentCell.attribute) || waterTypes.includes(currentCell.class);
        
        if (!isWater) {
            return false; // Bridges can only be placed on water
        }
        
        // Check if there's a road or bridge adjacent to this position
        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            // Check bounds
            if (newRow >= 0 && newRow < this.mapSystem.mapSize.rows && 
                newCol >= 0 && newCol < this.mapSystem.mapSize.cols) {
                
                const adjacentCell = this.mapSystem.cells[newRow][newCol];
                
                if (adjacentCell.attribute === 'road' || adjacentCell.class === 'road' ||
                    adjacentCell.attribute === 'bridge' || adjacentCell.class === 'bridge') {
                    
                    // Check if the adjacent road/bridge is inoperable (disconnected)
                    const cellElement = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
                    if (cellElement && cellElement.classList.contains('disconnected-road')) {
                        return false; // Cannot place bridges off of inoperable roads/bridges
                    }
                    
                    return true;
                }
            }
        }
        
        return false;
    }
    
    updateRoadConnections() {
        // Use the road system for connection updates
        if (this.mapSystem.roadSystem) {
            this.mapSystem.roadSystem.updateRoadConnections();
            return;
        }
        
        // Fallback if road system is not available
        for (let row = 0; row < this.mapSystem.rows; row++) {
            for (let col = 0; col < this.mapSystem.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.attribute === 'bridge') {
                    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cellElement) {
                        if (this.isRoadConnected(row, col)) {
                            // Road is connected - normal appearance
                            cellElement.classList.remove('disconnected-road');
                            cellElement.style.backgroundColor = '';
                            cellElement.style.border = '';
                        } else {
                            // Road is disconnected - red tint
                            cellElement.classList.add('disconnected-road');
                            cellElement.style.backgroundColor = '#ffcccc';
                            cellElement.style.border = '2px solid #ff4444';
                        }
                    }
                }
            }
        }
    }
    
    showInsufficientResourcesError(cell, attribute, costs) {
        const missingResources = [];
        for (const [resource, amount] of Object.entries(costs)) {
            const current = this.mapSystem.resourceManagement.resources[resource];
            if (current < amount) {
                missingResources.push(`${resource}: ${current}/${amount}`);
            }
        }
        
        const errorMessage = `❌ Insufficient resources for ${attribute}!\nMissing: ${missingResources.join(', ')}\nCheck your resource count in the General Info tab.`;
        console.log(errorMessage);
        
        // Visual feedback
        cell.classList.add('invalid-placement');
        
        // Show error tooltip
        this.showErrorTooltip(cell, errorMessage);
        
        // Remove error styling after 3 seconds
        setTimeout(() => {
            cell.classList.remove('invalid-placement');
        }, 3000);
    }
}
