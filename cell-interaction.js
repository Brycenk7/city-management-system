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
                
                // Erase the item
                this.mapSystem.erasePlayerModifications(row, col);
                
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
            const infrastructure = ['road', 'bridge', 'powerPlant', 'powerLines', 'lumberYard', 'miningOutpost'];
            const zoning = ['residential', 'commercial', 'industrial', 'mixed'];
            
            // Check if current cell is natural terrain
            if (naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class)) {
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
        // Commercial must be near roads AND within 5 tiles of power
        const hasRoadAccess = this.mapSystem.isAdjacentToCommercialRoad(row, col);
        const hasPowerAccess = this.mapSystem.isAdjacentToPowerPlantOrPowerLines(row, col);
        
        return hasRoadAccess && hasPowerAccess;
    }
    
    isValidResidentialPlacement(row, col) {
        // Residential must be near roads and not too close to industrial
        return this.mapSystem.isAdjacentToCommercialRoad(row, col) && 
               !this.mapSystem.isAdjacentToIndustrial(row, col);
    }
    
    
    isValidBridgePlacement(row, col) {
        // Bridge must be over water
        const currentCell = this.mapSystem.cells[row][col];
        return ['water', 'lake', 'ocean', 'river'].includes(currentCell.attribute) || 
               ['water', 'lake', 'ocean', 'river'].includes(currentCell.class);
    }
    
    
    isValidMixedPlacement(row, col) {
        // Mixed use must be near roads and have access to both commercial and residential areas
        return this.mapSystem.isAdjacentToCommercialRoad(row, col) && 
               this.mapSystem.isAdjacentToResidential(row, col);
    }
    
    isValidRoadPlacement(row, col) {
        // Basic roads can be placed anywhere on grassland or existing infrastructure
        return true; // Basic roads have no special requirements
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
}
