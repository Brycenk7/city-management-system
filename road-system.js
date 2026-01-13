// Road System - Simple road management and validation
class RoadSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    // Check if a road can be placed at the given location
    isValidRoadPlacement(row, col) {
        // First check if the target cell is not water (roads can't be placed on water)
        const currentCell = this.mapSystem.cells[row][col];
        const waterTypes = ['water', 'lake', 'ocean', 'river'];
        const isWater = waterTypes.includes(currentCell.attribute) || waterTypes.includes(currentCell.class);

        if (isWater) {
            return false; // Roads cannot be placed on water
        }

        // Check if trying to place on natural terrain (forest, mountain, etc.)
        const naturalTerrain = ['forest', 'mountain', 'desert'];
        if (naturalTerrain.includes(currentCell.attribute) || naturalTerrain.includes(currentCell.class)) {
            return false; // Roads cannot be placed on natural terrain
        }

        // Check if there's a disconnected or power-inoperable road at this location
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellElement && (cellElement.classList.contains('disconnected-road') || 
                           cellElement.getAttribute('data-power-inoperable') === 'true')) {
            return false; // Cannot place roads on disconnected/inoperable roads
        }
        
        // Check ownership in multiplayer - cannot build off another player's roads
        if (window.multiplayerIntegration && window.multiplayerIntegration.isInMultiplayerMode()) {
            const currentPlayerId = window.multiplayerIntegration.playerId;
            if (this.isAdjacentToOtherPlayerRoad(row, col, currentPlayerId)) {
                return false; // Cannot build off another player's road
            }
            if (this.isAdjacentToOtherPlayerIndustrial(row, col, currentPlayerId)) {
                return false; // Cannot build off another player's industrial
            }
        }
        
        // Roads must be adjacent to industrial zones, other roads, or bridges
        return this.isAdjacentToIndustrial(row, col) || this.isAdjacentToRoad(row, col) || this.isAdjacentToBridge(row, col);
    }
    
    // Check if a location is adjacent to an industrial zone
    isAdjacentToIndustrial(row, col) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if a location is adjacent to a road
    isAdjacentToRoad(row, col) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'road' || cell.class === 'road') {
                    // Check if this road is disconnected (inoperable)
                    const cellElement = document.querySelector(`[data-row="${checkRow}"][data-col="${checkCol}"]`);
                    if (cellElement && (cellElement.classList.contains('disconnected-road') || 
                                       cellElement.getAttribute('data-power-inoperable') === 'true')) {
                        return false; // Cannot connect to disconnected/inoperable roads
                    }
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if adjacent to another player's road (for multiplayer ownership)
    isAdjacentToOtherPlayerRoad(row, col, currentPlayerId) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'road' || cell.class === 'road') {
                    // Check if this road belongs to another player
                    if (cell.playerId && cell.playerId !== currentPlayerId) {
                        return true; // Adjacent to another player's road
                    }
                }
            }
        }
        
        return false;
    }
    
    // Check if adjacent to another player's industrial (for multiplayer ownership)
    isAdjacentToOtherPlayerIndustrial(row, col, currentPlayerId) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    // Check if this industrial belongs to another player
                    if (cell.playerId && cell.playerId !== currentPlayerId) {
                        return true; // Adjacent to another player's industrial
                    }
                }
            }
        }
        
        return false;
    }
    
    // Check if a location is adjacent to a bridge
    isAdjacentToBridge(row, col) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'bridge' || cell.class === 'bridge') {
                    // Check if this bridge is disconnected (inoperable)
                    const cellElement = document.querySelector(`[data-row="${checkRow}"][data-col="${checkCol}"]`);
                    if (cellElement && cellElement.classList.contains('disconnected-road')) {
                        return false; // Cannot connect to disconnected bridges
                    }
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Check if a road is connected to the road network
    isRoadConnected(row, col) {
        // Check if this road is marked as power-inoperable first
        const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cellElement && cellElement.getAttribute('data-power-inoperable') === 'true') {
            console.log(`Road at ${row},${col} is power-inoperable - not connected`);
            return false;
        }
        
        // A road is connected if it's part of a network that reaches an industrial zone
        return this.isConnectedToIndustrialNetwork(row, col);
    }
    
    // Check if a road is connected to the industrial network (using flood fill)
    isConnectedToIndustrialNetwork(row, col) {
        const visited = new Set();
        const queue = [{ row, col }];
        let industrialZonesFound = 0;
        let roadsChecked = 0;
        
        console.log(`Starting flood fill for road at ${row},${col}`);
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            roadsChecked++;
            
            // Check if this cell is an industrial zone
            if (current.row >= 0 && current.row < this.mapSystem.mapSize.rows &&
                current.col >= 0 && current.col < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[current.row][current.col];
                
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    industrialZonesFound++;
                    console.log(`Found industrial zone at ${current.row},${current.col} for road at ${row},${col}`);
                    return true; // Found industrial zone in the network
                }
                
                // Also check if this cell is adjacent to an industrial zone
                const hasAdjacentIndustrial = this.hasAdjacentIndustrial(current.row, current.col);
                if (hasAdjacentIndustrial) {
                    console.log(`Found adjacent industrial zone near ${current.row},${current.col} for road at ${row},${col}`);
                    return true; // Found industrial zone adjacent to this cell
                }
            }
            
            // Add adjacent roads and bridges to the queue (including diagonal directions)
        const directions = [
                { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                
                if (newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                    newCol >= 0 && newCol < this.mapSystem.mapSize.cols) {
                    
                    const adjacentCell = this.mapSystem.cells[newRow][newCol];
                    
                    if (adjacentCell.attribute === 'road' || adjacentCell.class === 'road' ||
                        adjacentCell.attribute === 'bridge' || adjacentCell.class === 'bridge') {
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        console.log(`No industrial zones found for road at ${row},${col} (searched ${visited.size} cells, checked ${roadsChecked} roads, found ${industrialZonesFound} industrial zones)`);
        return false; // No industrial zone found in the network
    }
    
    // Update road connections and visual indicators
    updateRoadConnections() {
        let disconnectedCount = 0;
        let totalRoads = 0;
        let connectedCount = 0;
        
        console.log('Updating road connections...');
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.class === 'road' || 
                    cell.attribute === 'bridge' || cell.class === 'bridge') {
                    totalRoads++;
                    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cellElement) {
                        // Check if this road is marked as inoperable due to power issues
                        const isPowerInoperable = cellElement.getAttribute('data-power-inoperable') === 'true';
                        
                        if (isPowerInoperable) {
                            // Road is inoperable due to power issues - keep it red
                            // BUT: Don't apply red styling if player overlay is active
                            const overlayActive = window.multiplayerIntegration && 
                                                window.multiplayerIntegration.showPlayerOverlay;
                            
                            if (!overlayActive) {
                                disconnectedCount++;
                                const type = (cell.attribute === 'bridge' || cell.class === 'bridge') ? 'Bridge' : 'Road';
                                cellElement.title = `${type}: Inoperable due to power shortage`;
                                console.log(`Road at ${row},${col} is power-inoperable - keeping red styling`);
                            } else {
                                // Overlay is active - don't apply inoperable styling
                                // The overlay will handle the visual appearance
                                console.log(`Road at ${row},${col} is power-inoperable but overlay is active - skipping red styling`);
                            }
                        } else {
                            const isConnected = this.isRoadConnected(row, col);
                            if (isConnected) {
                                connectedCount++;
                                // Road/Bridge is connected - normal appearance
                                cellElement.classList.remove('disconnected-road');
                                
                                // Don't update colors if player overlay is active (let overlay handle colors)
                                const overlayActive = window.multiplayerIntegration && 
                                                    window.multiplayerIntegration.showPlayerOverlay;
                                
                                if (!overlayActive) {
                                    // Force the correct road color with !important to override CSS
                                    if (cell.attribute === 'road' || cell.class === 'road') {
                                        cellElement.style.setProperty('background-color', '#4A4A4A', 'important');
                                        // Preserve the grid border
                                        cellElement.style.setProperty('border', '0.5px solid rgba(0,0,0,0.12)', 'important');
                                    } else if (cell.attribute === 'bridge' || cell.class === 'bridge') {
                                        cellElement.style.setProperty('background-color', '#708090', 'important');
                                        // Preserve the grid border
                                        cellElement.style.setProperty('border', '0.5px solid rgba(0,0,0,0.12)', 'important');
                                    }
                                }
                                const type = (cell.attribute === 'bridge' || cell.class === 'bridge') ? 'Bridge' : 'Road';
                                cellElement.title = `${type}: Connected to industrial network`;
                            } else {
                                disconnectedCount++;
                                // Road/Bridge is disconnected - show warning with red highlighting
                                // Don't update colors if player overlay is active
                                const overlayActive = window.multiplayerIntegration && 
                                                    window.multiplayerIntegration.showPlayerOverlay;
                                
                                if (!overlayActive) {
                                    cellElement.classList.add('disconnected-road');
                                    cellElement.style.setProperty('background-color', '#ffcccc', 'important');
                                    cellElement.style.setProperty('border', '2px solid #ff4444', 'important');
                                }
                                const type = (cell.attribute === 'bridge' || cell.class === 'bridge') ? 'Bridge' : 'Road';
                                cellElement.title = `${type}: Disconnected from industrial network - inoperable`;
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`Road connection update complete: ${connectedCount}/${totalRoads} connected, ${disconnectedCount} disconnected`);
        
        // Show single notification if there are disconnected roads
        if (disconnectedCount > 0 && totalRoads > 0) {
            this.showDisconnectedRoadsNotification(disconnectedCount, totalRoads);
        }
    }
    
    // Show notification for disconnected roads
    showDisconnectedRoadsNotification(disconnectedCount, totalRoads) {
        // Remove any existing notification
        const existingNotification = document.getElementById('disconnected-roads-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.id = 'disconnected-roads-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(255, 68, 68, 0.3);
            text-align: center;
            max-width: 400px;
        `;
        notification.innerHTML = `⚠️ ${disconnectedCount} of ${totalRoads} roads/bridges are disconnected from industrial zones!`;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    // Get road network statistics
    getRoadStats() {
        const stats = {
            totalRoads: 0,
            connectedRoads: 0,
            disconnectedRoads: 0
        };
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.class === 'road') {
                    stats.totalRoads++;
                    if (this.isRoadConnected(row, col)) {
                        stats.connectedRoads++;
                    } else {
                        stats.disconnectedRoads++;
                    }
                }
            }
        }
        
        return stats;
    }
    
    // Force update road connections when an industrial zone is placed
    onIndustrialZonePlaced(industrialRow, industrialCol) {
        console.log(`Industrial zone placed at ${industrialRow},${industrialCol} - updating road connections`);
        
        // Verify the industrial zone is actually there
        const cell = this.mapSystem.cells[industrialRow][industrialCol];
        console.log('Cell at industrial location:', cell);
        
        // Count roads before update
        let roadsBefore = 0;
        let connectedBefore = 0;
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const roadCell = this.mapSystem.cells[row][col];
                if (roadCell.attribute === 'road' || roadCell.class === 'road' ||
                    roadCell.attribute === 'bridge' || roadCell.class === 'bridge') {
                    roadsBefore++;
                    if (this.isRoadConnected(row, col)) {
                        connectedBefore++;
                    }
                }
            }
        }
        console.log(`Roads before update: ${connectedBefore}/${roadsBefore} connected`);
        
        // Force clear all disconnected road classes first
        this.clearAllDisconnectedRoadClasses();
        
        // Update road connections to reflect the new industrial zone
        this.updateRoadConnections();
        
        // Count roads after update
        let roadsAfter = 0;
        let connectedAfter = 0;
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const roadCell = this.mapSystem.cells[row][col];
                if (roadCell.attribute === 'road' || roadCell.class === 'road' ||
                    roadCell.attribute === 'bridge' || roadCell.class === 'bridge') {
                    roadsAfter++;
                    if (this.isRoadConnected(row, col)) {
                        connectedAfter++;
                    }
                }
            }
        }
        console.log(`Roads after update: ${connectedAfter}/${roadsAfter} connected`);
    }
    
    // Clear all disconnected road classes to force re-evaluation
    clearAllDisconnectedRoadClasses() {
        console.log('Clearing all disconnected road classes...');
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.class === 'road' ||
                    cell.attribute === 'bridge' || cell.class === 'bridge') {
                    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cellElement) {
                        cellElement.classList.remove('disconnected-road');
                        cellElement.removeAttribute('data-power-inoperable');
                        // Reset to normal road colors
                        if (cell.attribute === 'road' || cell.class === 'road') {
                            cellElement.style.setProperty('background-color', '#4A4A4A', 'important');
                            // Preserve the grid border
                            cellElement.style.setProperty('border', '0.5px solid rgba(0,0,0,0.12)', 'important');
                        } else if (cell.attribute === 'bridge' || cell.class === 'bridge') {
                            cellElement.style.setProperty('background-color', '#708090', 'important');
                            // Preserve the grid border
                            cellElement.style.setProperty('border', '0.5px solid rgba(0,0,0,0.12)', 'important');
                        }
                    }
                }
            }
        }
    }
    
    // Check if a cell is adjacent to an industrial zone
    hasAdjacentIndustrial(row, col) {
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    console.log(`Found adjacent industrial zone at ${checkRow},${checkCol} near ${row},${col}`);
                    return true;
                }
            }
        }
        return false;
    }
    
    // Check if a location has road access (excluding inoperable roads)
    hasRoadAccess(row, col) {
        // Check if the cell itself is a road (and not inoperable)
        const currentCell = this.mapSystem.cells[row][col];
        if (currentCell.attribute === 'road' || currentCell.class === 'road') {
            const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cellElement && cellElement.classList.contains('disconnected-road')) {
                return false; // Inoperable road doesn't count as road access
            }
            return true;
        }
        
        // Check if adjacent to operable roads
        return this.isAdjacentToRoad(row, col);
    }
    
    // Validate that all roads have at least one industrial connection
    validateAllRoadConnections() {
        console.log('Validating all road connections...');
        let totalRoads = 0;
        let connectedRoads = 0;
        let disconnectedRoads = 0;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.class === 'road' ||
                    cell.attribute === 'bridge' || cell.class === 'bridge') {
                    totalRoads++;
                    
                    if (this.isRoadConnected(row, col)) {
                        connectedRoads++;
                    } else {
                        disconnectedRoads++;
                        console.log(`Disconnected road found at ${row},${col}`);
                    }
                }
            }
        }
        
        console.log(`Road validation complete: ${connectedRoads}/${totalRoads} connected, ${disconnectedRoads} disconnected`);
        return { totalRoads, connectedRoads, disconnectedRoads };
    }
    
    // Classify road regions (required by cell-interaction.js)
    classifyRoadRegions() {
        console.log('RoadSystem: Classifying road regions');
        // This method is called when roads are placed
        // We can use this to update road connections
        this.updateRoadConnections();
    }
    
    // Reclassify road regions after removal (required by cell-interaction.js)
    reclassifyRoadAfterRemoval(removedRow, removedCol) {
        console.log(`RoadSystem: Reclassifying road regions after removal at ${removedRow},${removedCol}`);
        // This method is called when roads are removed
        // We can use this to update road connections
        this.updateRoadConnections();
    }
}

