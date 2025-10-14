// Cell Interaction - Click handling, painting, and validation
class CellInteraction {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    // handleCellClick removed - using script.js version instead
    
    handleCellMouseDown(e) {
        // Don't paint in viewer mode
        if (this.mapSystem.currentTab === 'viewer') {
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
        this.paintCell(e.target);
    }
    
    handleGlobalMouseMove(e) {
        // Don't paint in viewer mode
        if (this.mapSystem.currentTab === 'viewer') {
            return;
        }
        
        if (this.mapSystem.isDragging) {
            const cell = e.target;
            // Check if we're over a cell and it's different from the last painted cell
            if (cell.classList.contains('cell') && cell !== this.mapSystem.lastPaintedCell) {
                // Set the selected attribute based on current mode
                if (this.mapSystem.currentTab === 'player') {
                    this.mapSystem.selectedAttribute = this.mapSystem.playerMode;
                }
                this.paintCell(cell);
            }
        }
    }
    
    handleGlobalMouseUp(e) {
        if (this.mapSystem.isDragging) {
            this.mapSystem.isDragging = false;
            this.mapSystem.dragStartCell = null;
            this.mapSystem.lastPaintedCell = null;
        }
    }
    
    handleGlobalMouseLeave(e) {
        // Stop dragging if mouse leaves the document
        if (this.mapSystem.isDragging) {
            this.mapSystem.isDragging = false;
            this.mapSystem.dragStartCell = null;
            this.mapSystem.lastPaintedCell = null;
        }
    }
    
    paintCell(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
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
                // Get the cost of the item being erased for refund calculation
                const erasedAttribute = currentCell.attribute;
                const refundAmounts = this.calculateRefundAmounts(erasedAttribute);
                
                // Special handling for bridge erasure - determine appropriate water type
                if (erasedAttribute === 'bridge') {
                    const appropriateWaterType = this.determineAppropriateWaterType(row, col);
                    this.mapSystem.cells[row][col].attribute = appropriateWaterType;
                    this.mapSystem.cells[row][col].class = appropriateWaterType;
                    this.mapSystem.updateCellVisual(row, col);
                } else {
                    // Erase the item normally
                    this.mapSystem.erasePlayerModifications(row, col);
                }
                
                // Send multiplayer update if in multiplayer mode
                if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
                    window.multiplayerIntegration.sendGameAction('remove', row, col, erasedAttribute, null);
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
                
                // Force immediate visual update for the DOM element
                const cellData = this.mapSystem.cells[row][col];
                cell.className = `cell ${cellData.class}`;
                cell.dataset.attribute = cellData.attribute;
                cell.style.backgroundColor = '';
                cell.style.border = '';
                cell.removeAttribute('data-inoperable');
                cell.removeAttribute('data-power-inoperable');
            }
            this.mapSystem.lastPaintedCell = cell;
            this.updateCellInfo();
            return;
        }
        
        // Check if it's the player's turn in multiplayer mode
        if (window.multiplayerIntegration && !window.multiplayerIntegration.canPlaceBuilding()) {
            this.showTurnError(cell);
            return;
        }

        // Check if placement is valid for river start/end
        if (!this.isValidPlacement(row, col, this.mapSystem.selectedAttribute)) {
            // Show error feedback and don't place
            this.showPlacementError(cell, this.mapSystem.selectedAttribute);
            return;
        }
        
        // Check resource generation impact before placing
        this.checkResourceGenerationImpact(row, col, this.mapSystem.selectedAttribute);
        
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
        
        // Send multiplayer update if in multiplayer mode
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
            window.multiplayerIntegration.sendGameAction('place', row, col, this.mapSystem.selectedAttribute, this.mapSystem.selectedClass);
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
        
        // In City Player Pro, prevent placement over natural terrain and existing infrastructure
        if (this.mapSystem.currentTab === 'player') {
            const currentCell = this.mapSystem.cells[row][col];
            const naturalTerrain = ['forest', 'mountain', 'lake', 'ocean', 'water', 'river', 'riverStart', 'riverEnd'];
            const waterTerrain = ['lake', 'ocean', 'water', 'river', 'riverStart', 'riverEnd'];
            const infrastructure = ['road', 'bridge', 'powerPlant', 'powerLines', 'lumberYard', 'miningOutpost'];
            const zoning = ['residential', 'commercial', 'industrial', 'mixed'];
            
            // Check if current cell is natural terrain
            // EXCEPTION: Bridges are allowed on water terrain
            const isWater = waterTerrain.includes(currentCell.attribute) || waterTerrain.includes(currentCell.class);
            const isBridgePlacement = attribute === 'bridge';
            
            if ((naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class)) && 
                !(isWater && isBridgePlacement)) {
                return false;
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
        switch (attribute) {
            case 'erase':
                return true; // Erase can be used on any tile
            case 'riverStart':
                return this.isValidRiverStartPlacement(row, col);
            case 'riverEnd':
                return this.isValidRiverEndPlacement(row, col);
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
            case 'bridge':
                return this.isValidBridgePlacement(row, col);
            case 'mixed':
                return this.isValidMixedPlacement(row, col);
            case 'road':
                return this.isValidRoadPlacement(row, col);
            default:
                return true;
        }
    }
    
    // Helper method to check if a position is adjacent to an operable road
    isAdjacentToOperableRoad(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (['road', 'bridge'].includes(cell.attribute)) {
                    // Check if the road is operable (not inoperable)
                    const domCell = document.querySelector(`[data-row="${checkRow}"][data-col="${checkCol}"]`);
                    const isInoperable = domCell ? domCell.getAttribute('data-power-inoperable') : null;
                    
                    if (!isInoperable) {
                        return true; // Found an operable road/bridge
                    }
                }
            }
        }
        
        return false; // No operable roads found
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
        const hasOperableRoadAccess = this.isAdjacentToOperableRoad(row, col);
        const hasPowerAccess = this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
        
        return hasOperableRoadAccess && hasPowerAccess;
    }
    
    isValidResidentialPlacement(row, col) {
        // Residential must be near operable roads, within 5 tiles of power lines, and not too close to industrial
        const hasOperableRoadAccess = this.isAdjacentToOperableRoad(row, col);
        const hasPowerAccess = this.mapSystem.powerLineSystem ? 
            this.mapSystem.powerLineSystem.isWithinPowerPlantOrPowerLinesRadius(row, col, 5) : 
            this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
        const notNearIndustrial = !this.mapSystem.isAdjacentToIndustrial(row, col);
        
        return hasOperableRoadAccess && hasPowerAccess && notNearIndustrial;
    }
    
    
    isValidBridgePlacement(row, col) {
        // Bridge must be over water
        const currentCell = this.mapSystem.cells[row][col];
        const isOverWater = ['water', 'lake', 'ocean', 'river'].includes(currentCell.attribute) || 
                           ['water', 'lake', 'ocean', 'river'].includes(currentCell.class);
        
        if (!isOverWater) {
            return false;
        }
        
        // Bridge must be connected to road or other bridge (check adjacent cells)
        const adjacentPositions = [
            {row: row-1, col: col}, {row: row+1, col: col},
            {row: row, col: col-1}, {row: row, col: col+1}
        ];
        
        for (const pos of adjacentPositions) {
            if (pos.row >= 0 && pos.row < this.mapSystem.mapSize.rows && 
                pos.col >= 0 && pos.col < this.mapSystem.mapSize.cols) {
                const adjacentCell = this.mapSystem.cells[pos.row][pos.col];
                
                if (['road', 'bridge'].includes(adjacentCell.attribute)) {
                    // Get the DOM element to check data attributes
                    const adjacentDOMCell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                    const isInoperable = adjacentDOMCell ? adjacentDOMCell.getAttribute('data-power-inoperable') : null;
                    
                    if (!isInoperable) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    
    isValidMixedPlacement(row, col) {
        // Mixed use must be near roads and have access to both commercial and residential areas
        return this.mapSystem.isAdjacentToCommercialRoad(row, col) && 
               this.mapSystem.isAdjacentToResidential(row, col);
    }
    
    isValidRoadPlacement(row, col) {
        // Check if trying to place road next to an inoperable road
        const adjacentPositions = [
            {row: row-1, col: col}, {row: row+1, col: col},
            {row: row, col: col-1}, {row: row, col: col+1}
        ];
        
        for (const pos of adjacentPositions) {
            if (pos.row >= 0 && pos.row < this.mapSystem.mapSize.rows && 
                pos.col >= 0 && pos.col < this.mapSystem.mapSize.cols) {
                const adjacentCell = this.mapSystem.cells[pos.row][pos.col];
                if (['road', 'bridge'].includes(adjacentCell.attribute)) {
                    // Check if adjacent road is inoperable
                    const adjacentDOMCell = document.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
                    const isInoperable = adjacentDOMCell ? adjacentDOMCell.getAttribute('data-power-inoperable') : null;
                    
                    if (isInoperable) {
                        return false; // Cannot place road next to inoperable road
                    }
                }
            }
        }
        
        return true; // Basic roads can be placed elsewhere
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
            const waterTerrain = ['lake', 'ocean', 'water', 'river', 'riverStart', 'riverEnd'];
            
            let errorMessage = '';
            
            // Check if it's natural terrain (with exception for bridges on water)
            const isNaturalTerrain = naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class);
            const isWater = waterTerrain.includes(currentCell.attribute) || waterTerrain.includes(currentCell.class);
            const isBridge = attribute === 'bridge';
            
            if (isNaturalTerrain && !(isWater && isBridge)) {
                errorMessage = `Cannot place ${attribute} on ${currentCell.attribute || currentCell.class} terrain`;
            } else {
                // Check if trying to replace existing infrastructure
                const infrastructure = ['road', 'bridge', 'powerPlant', 'powerLines', 'lumberYard', 'miningOutpost'];
                const zoning = ['residential', 'commercial', 'industrial', 'mixed'];
                
                if (infrastructure.includes(currentCell.attribute) || zoning.includes(currentCell.attribute)) {
                    errorMessage = `Cannot place ${attribute} on existing ${currentCell.attribute}. Use erase button to remove first.`;
                } else if (attribute === 'powerPlant') {
                    errorMessage = 'Power plant requires water within 1 tile or to be adjacent to another power plant';
                } else if (attribute === 'powerLines') {
                if (currentCell.attribute === 'powerPlant') {
                    errorMessage = 'Cannot place power lines on power plants';
                } else {
                    errorMessage = 'Power lines must be within 5 tiles of a power plant or adjacent to other power lines';
                }
            } else if (attribute === 'lumberYard') {
                if (this.mapSystem.resourceManagement && this.mapSystem.resourceManagement.resources.wood < 10) {
                    errorMessage = 'Lumber yard requires 10 wood to build';
                } else {
                    errorMessage = 'Lumber yard must be placed within 3 tiles of forests';
                }
            } else if (attribute === 'miningOutpost') {
                if (this.mapSystem.resourceManagement) {
                    if (this.mapSystem.resourceManagement.resources.wood < 20) {
                        errorMessage = 'Mining outpost requires 20 wood to build';
                    } else if (this.mapSystem.resourceManagement.resources.ore < 10) {
                        errorMessage = 'Mining outpost requires 10 ore to build';
                    } else {
                        errorMessage = 'Mining outpost must be placed within 1 tile of a mountain';
                    }
                } else {
                    errorMessage = 'Mining outpost must be placed within 1 tile of a mountain';
                }
                } else if (attribute === 'bridge') {
                    errorMessage = 'Bridges must be placed on water and adjacent to operable roads or other bridges';
                } else if (['road', 'bridge', 'residential', 'commercial'].includes(attribute)) {
                    // Check if the issue is inoperable roads
                    const row = parseInt(cell.dataset.row);
                    const col = parseInt(cell.dataset.col);
                    if (!this.isAdjacentToOperableRoad(row, col)) {
                        errorMessage = `Cannot place ${attribute} next to inoperable roads`;
                    } else {
                        errorMessage = `Cannot place ${attribute} here`;
                    }
                } else {
                    errorMessage = `Cannot place ${attribute} here`;
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
        
        // Show error message
        const errorMsg = 'Not your turn! Wait for your turn to place buildings.';
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
            'mixed': { wood: 36, ore: 16 },

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
    
    showInsufficientResourcesError(cell, attribute, costs) {
        const missingResources = [];
        for (const [resource, amount] of Object.entries(costs)) {
            const current = this.mapSystem.resourceManagement.resources[resource];
            if (current < amount) {
                missingResources.push(`${resource}: ${current}/${amount}`);
            }
        }
        
        const errorMessage = `Insufficient resources for ${attribute}: ${missingResources.join(', ')}`;
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

    // Resource generation impact checking and notification system
    checkResourceGenerationImpact(row, col, buildingType) {
        if (!this.mapSystem.resourceManagement) return;

        const currentResources = { ...this.mapSystem.resourceManagement.resources };
        const currentGeneration = { ...this.mapSystem.resourceManagement.generationRates };
        const currentConsumption = { ...this.mapSystem.resourceManagement.consumptionRates };

        // Calculate the impact of placing this building
        const buildingImpact = this.calculateBuildingResourceImpact(buildingType);

        // Calculate what the new rates would be
        const newGeneration = {};
        const newConsumption = {};

        for (const resource of ['power', 'commercialGoods', 'processedMaterials', 'wood', 'ore']) {
            newGeneration[resource] = (currentGeneration[resource] || 0) + (buildingImpact.generation[resource] || 0);
            newConsumption[resource] = (currentConsumption[resource] || 0) + (buildingImpact.consumption[resource] || 0);
        }

        // Check for negative net generation
        const warnings = [];
        for (const resource of ['power', 'commercialGoods', 'processedMaterials', 'wood', 'ore']) {
            const currentNetGeneration = (currentGeneration[resource] || 0) - (currentConsumption[resource] || 0);
            const newNetGeneration = newGeneration[resource] - newConsumption[resource];
            
            // Only show warning if:
            // 1. The new net generation will be negative, AND
            // 2. This building is actually affecting this resource (generation or consumption changed)
            const resourceChanged = (buildingImpact.generation[resource] || 0) !== 0 || 
                                   (buildingImpact.consumption[resource] || 0) !== 0;
            
            if (newNetGeneration < 0 && resourceChanged) {
                // Format resource name for display
                let resourceName = resource;
                if (resource === 'commercialGoods') resourceName = 'Goods';
                else if (resource === 'processedMaterials') resourceName = 'Materials';
                else resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);
                
                warnings.push({
                    resource: resource,
                    amount: Math.abs(newNetGeneration),
                    message: `⚠️ ${resourceName} production will be negative: -${Math.abs(newNetGeneration).toFixed(1)}/sec`
                });
            }
        }

        // Show warnings if any
        if (warnings.length > 0) {
            for (const warning of warnings) {
                this.showResourceWarning(warning.message);
            }
        }
    }

    calculateBuildingResourceImpact(buildingType) {
        const impact = {
            generation: { power: 0, commercialGoods: 0, processedMaterials: 0, wood: 0, ore: 0 },
            consumption: { power: 0, commercialGoods: 0, processedMaterials: 0, wood: 0, ore: 0 }
        };

        switch (buildingType) {
            case 'powerPlant':
                impact.generation.power = 1.0;
                break;
            case 'lumberYard':
                impact.generation.wood = 2.0;
                break;
            case 'miningOutpost':
                impact.generation.ore = 2.0;
                break;
            case 'industrial':
                impact.consumption.power = 0.5;
                impact.consumption.wood = 0.3;
                impact.consumption.ore = 0.3;
                impact.generation.processedMaterials = 1.0;
                break;
            case 'commercial':
                impact.consumption.power = 0.5;
                impact.consumption.processedMaterials = 1.0;
                impact.generation.commercialGoods = 0.5;
                break;
            case 'residential':
                impact.consumption.power = 0.5;
                impact.consumption.commercialGoods = 1.0;
                break;
        }

        return impact;
    }

    showResourceWarning(message) {
        // Initialize notification manager if not exists
        if (!window.notificationManager) {
            window.notificationManager = new NotificationManager();
        }
        
        // Extract resource type from message
        let resourceType = 'unknown';
        if (message.includes('Power')) resourceType = 'power';
        else if (message.includes('Goods')) resourceType = 'commercialGoods';
        else if (message.includes('Materials')) resourceType = 'processedMaterials';
        else if (message.includes('Wood')) resourceType = 'wood';
        else if (message.includes('Ore')) resourceType = 'ore';
        
        // Add or update notification
        window.notificationManager.addOrUpdateNotification(resourceType, message);
    }

    // Intelligent water type detection for bridge erasure
    determineAppropriateWaterType(row, col) {
        const adjacentPositions = [
            {row: row-1, col: col}, {row: row+1, col: col},
            {row: row, col: col-1}, {row: row, col: col+1}
        ];
        
        const waterTypes = {};
        
        // Count surrounding water types
        for (const pos of adjacentPositions) {
            if (pos.row >= 0 && pos.row < this.mapSystem.mapSize.rows && 
                pos.col >= 0 && pos.col < this.mapSystem.mapSize.cols) {
                const adjacentCell = this.mapSystem.cells[pos.row][pos.col];
                const waterType = adjacentCell.attribute || adjacentCell.class;
                
                if (['water', 'lake', 'ocean', 'river'].includes(waterType)) {
                    waterTypes[waterType] = (waterTypes[waterType] || 0) + 1;
                }
            }
        }
        
        // Determine the most appropriate water type
        if (waterTypes.ocean > 0) return 'ocean';
        if (waterTypes.lake > 0) return 'lake';
        if (waterTypes.river > 0) return 'river';
        if (waterTypes.water > 0) return 'water';
        
        // Default to water if no surrounding water detected
        return 'water';
    }
}
