// Resource Management System
// Handles inventory, resource generation, and consumption

class ResourceManagement {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.resources = {
            wood: 30, // Start with 30 wood
            ore: 10,  // Start with 10 ore
            processedMaterials: 0, // New resource: processed materials from industrial zones
            commercialGoods: 0,   // Goods from commercial zones
            power: 0
        };
        this.currentPlayerId = null; // Track current player for multiplayer
        this.playerResources = new Map(); // Track resources per player in multiplayer
        this.updateCounter = 0; // Counter for road operability updates
        
        this.maxResources = {
            wood: 1000,
            ore: 1000,
            processedMaterials: 500,
            commercialGoods: 500,
            power: 30
        };
        
        this.generationRates = {
            wood: 0,
            ore: 0,
            processedMaterials: 0,
            commercialGoods: 0,
            power: 0
        };
        
        this.consumptionRates = {
            wood: 0,
            ore: 0,
            processedMaterials: 0,
            commercialGoods: 0,
            power: 0
        };
        
        this.resourceSources = {
            wood: new Set(), // Lumber yards
            ore: new Set(),  // Mining outposts
            processedMaterials: new Set(), // Industrial zones
            commercialGoods: new Set(), // Commercial zones
            power: new Set() // Power plants
        };
        
        this.resourceConsumers = {
            wood: new Set(), // Buildings that consume wood
            ore: new Set(),  // Buildings that consume ore
            processedMaterials: new Set(), // Buildings that consume processed materials
            commercialGoods: new Set(), // Buildings that consume commercial goods
            power: new Set() // Buildings that consume power
        };
        
        this.updateInterval = null;
        this.isRunning = false;
    }
    
    // Initialize resource system
    init() {
        console.log('Resource Management System initialized');
        this.calculateResourceSources();
        this.calculateResourceConsumers();
        this.startResourceGeneration();
        this.updateResourceDisplay();
    }
    
    // Start resource generation loop
    startResourceGeneration() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.updateInterval = setInterval(() => {
            this.updateResources();
        }, 1000); // Update every second
        
        console.log('Resource generation started');
    }
    
    // Stop resource generation loop
    stopResourceGeneration() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.isRunning = false;
        console.log('Resource generation stopped');
    }
    
    // Update all resources based on generation and consumption
    updateResources() {
        // In single player mode, currentPlayerId may be null - that's okay
        // The getCurrentPlayerResources() function will fallback to this.resources
        
        // Get current player's resources
        const playerResources = this.getCurrentPlayerResources();
        
        // Calculate net generation for wood and ore (generation - consumption)
        // Lumber yards and mining outposts work even without power
        const netWood = this.generationRates.wood - this.consumptionRates.wood;
        const netOre = this.generationRates.ore - this.consumptionRates.ore;
        const netPower = this.generationRates.power - this.consumptionRates.power;
        
        // Update wood and ore first (these work without power)
        playerResources.wood = Math.max(0, Math.min(this.maxResources.wood, playerResources.wood + netWood));
        playerResources.ore = Math.max(0, Math.min(this.maxResources.ore, playerResources.ore + netOre));
        playerResources.power = Math.max(0, Math.min(this.maxResources.power, playerResources.power + netPower));
        
        // Calculate processed materials production (industrial zones)
        let netProcessedMaterials = -this.consumptionRates.processedMaterials; // Start with consumption
        
        // Only produce processed materials if we have enough wood, ore, AND power
        if (playerResources.wood >= this.consumptionRates.wood && 
            playerResources.ore >= this.consumptionRates.ore &&
            playerResources.power > 0) {
            // We have enough resources and power, so industrial zones can produce
            netProcessedMaterials += this.generationRates.processedMaterials;
        }
        
        // Update processed materials
        playerResources.processedMaterials = Math.max(0, Math.min(this.maxResources.processedMaterials, playerResources.processedMaterials + netProcessedMaterials));
        
        // Calculate commercial goods production (commercial zones)
        let netCommercialGoods = -this.consumptionRates.commercialGoods; // Start with consumption
        
        // Only produce commercial goods if we have enough processed materials AND power
        if (playerResources.processedMaterials >= this.consumptionRates.processedMaterials &&
            playerResources.power > 0) {
            // We have enough processed materials and power, so commercial zones can produce
            netCommercialGoods += this.generationRates.commercialGoods;
        }
        
        // Update commercial goods
        playerResources.commercialGoods = Math.max(0, Math.min(this.maxResources.commercialGoods, playerResources.commercialGoods + netCommercialGoods));
        
        // Update the player's resources in the map
        this.updateCurrentPlayerResources(playerResources);
        
        // Update road operability based on industrial power
        // Check more frequently when power is low for responsive power management
        if (this.resources.power <= 5 || this.updateCounter % 5 === 0) {
            this.updateRoadOperabilityBasedOnIndustrialPower();
        }
        this.updateCounter++;
        
        this.updateResourceDisplay();
        this.updateIndustrialZoneIndicators();
    }
    
    // Calculate resource sources from map
    calculateResourceSources() {
        this.resourceSources.wood.clear();
        this.resourceSources.ore.clear();
        this.resourceSources.processedMaterials.clear();
        this.resourceSources.commercialGoods.clear();
        this.resourceSources.power.clear();
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                const key = `${row},${col}`;
                
                // Only count buildings owned by the current player in multiplayer
                // In single player mode (no currentPlayerId), count all buildings
                const isOwnedByCurrentPlayer = !this.currentPlayerId || !cell.playerId || cell.playerId === this.currentPlayerId;
                
                if (isOwnedByCurrentPlayer) {
                    // Wood from lumber yards
                    if (cell.attribute === 'lumberYard' || cell.class === 'lumberYard') {
                        this.resourceSources.wood.add(key);
                    }
                    
                    // Ore from mining outposts
                    if (cell.attribute === 'miningOutpost' || cell.class === 'miningOutpost') {
                        this.resourceSources.ore.add(key);
                    }
                    
                    // Processed materials from industrial zones
                    if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                        this.resourceSources.processedMaterials.add(key);
                    }
                    
                    // Commercial goods from commercial zones
                    if (cell.attribute === 'commercial' || cell.class === 'commercial') {
                        this.resourceSources.commercialGoods.add(key);
                    }
                    
                    // Mixed use zones produce half of both industrial and commercial
                    if (cell.attribute === 'mixed' || cell.class === 'mixed') {
                        this.resourceSources.processedMaterials.add(key + '_mixed'); // Half industrial production
                        this.resourceSources.commercialGoods.add(key + '_mixed'); // Half commercial production
                    }
                    
                    // Power from power plants
                    if (cell.attribute === 'powerPlant' || cell.class === 'powerPlant') {
                        this.resourceSources.power.add(key);
                    }
                }
            }
        }
        
        this.calculateGenerationRates();
    }
    
    // Calculate resource consumers from map
    calculateResourceConsumers() {
        this.resourceConsumers.wood.clear();
        this.resourceConsumers.ore.clear();
        this.resourceConsumers.processedMaterials.clear();
        this.resourceConsumers.commercialGoods.clear();
        this.resourceConsumers.power.clear();
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                const key = `${row},${col}`;
                
                // Only count buildings owned by the current player in multiplayer
                const isOwnedByCurrentPlayer = !this.currentPlayerId || !cell.playerId || cell.playerId === this.currentPlayerId;
                
                if (!isOwnedByCurrentPlayer) continue;
                
                // Most buildings consume power (except resource production buildings and power plants)
                if (this.isBuilding(cell.attribute)) {
                    // Lumber yards, mining outposts, and power plants don't need power
                    if (cell.attribute !== 'lumberYard' && cell.attribute !== 'miningOutpost' && cell.attribute !== 'powerPlant') {
                        this.resourceConsumers.power.add(key);
                    }
                }
                
                // Industrial zones consume wood and ore to produce processed materials
                if (cell.attribute === 'industrial' || cell.class === 'industrial') {
                    this.resourceConsumers.wood.add(key);
                    this.resourceConsumers.ore.add(key);
                }
                
                // Commercial zones consume processed materials to produce goods
                if (cell.attribute === 'commercial' || cell.class === 'commercial') {
                    this.resourceConsumers.processedMaterials.add(key);
                }
                
                // Residential zones consume goods
                if (cell.attribute === 'residential' || cell.class === 'residential') {
                    this.resourceConsumers.commercialGoods.add(key);
                }
            }
        }
        
        this.calculateConsumptionRates();
    }
    
    // Check if an attribute is a building
    isBuilding(attribute) {
        const buildings = ['residential', 'commercial', 'industrial', 'powerPlant', 'mixed', 'lumberYard', 'miningOutpost'];
        return buildings.includes(attribute);
    }
    
    // Check if industrial zones have power and update road operability
    updateRoadOperabilityBasedOnIndustrialPower() {
        if (!this.mapSystem.roadSystem) return;
        
        console.log('Checking industrial power and updating road operability...');
        
        // Check if we have enough power for all industrial zones
        // Roads become inoperable ONLY when power amount hits 0 (not when there's a power deficit)
        const playerResources = this.getCurrentPlayerResources();
        const hasEnoughPower = playerResources.power > 0;
        
        console.log(`Power status: ${playerResources.power} power, generation: ${this.generationRates.power}/s, consumption: ${this.consumptionRates.power}/s, net: ${this.generationRates.power - this.consumptionRates.power}/s`);
        console.log(`Power check: power > 0 = ${playerResources.power > 0}, hasEnoughPower = ${hasEnoughPower}`);
        
        // If we have enough power, clear any power-inoperable road markings
        if (hasEnoughPower) {
            console.log('Power is sufficient - clearing power-inoperable road markings');
            this.clearPowerInoperableRoads();
        }
        
        // If we don't have enough power, mark all roads connected to industrial zones as inoperable
        if (!hasEnoughPower) {
            console.log('Not enough power for zones - marking all industrial-connected roads as inoperable');
            
            for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
                for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                    const cell = this.mapSystem.cells[row][col];
                    
                    // Check if this zone needs power (industrial, residential, commercial)
                    if (cell.attribute === 'industrial' || cell.class === 'industrial' ||
                        cell.attribute === 'residential' || cell.class === 'residential' ||
                        cell.attribute === 'commercial' || cell.class === 'commercial') {
                        console.log(`${cell.attribute} zone at ${row},${col} has no power - marking connected roads as inoperable`);
                        // Mark all roads connected to this zone as inoperable
                        this.markConnectedRoadsAsInoperable(row, col);
                    }
                }
            }
        }
        
        // Don't call updateRoadConnections here as it will override our power-based inoperable styling
        // The road system will handle its own connection logic separately
    }
    
    // Clear power-inoperable road markings when power is restored
    clearPowerInoperableRoads() {
        if (!this.mapSystem.roadSystem) return;
        
        console.log('Clearing power-inoperable road markings...');
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'road' || cell.class === 'road' ||
                    cell.attribute === 'bridge' || cell.class === 'bridge') {
                    const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    if (cellElement && cellElement.getAttribute('data-power-inoperable') === 'true') {
                        cellElement.removeAttribute('data-power-inoperable');
                        console.log(`Cleared power-inoperable marking from road at ${row},${col}`);
                    }
                }
            }
        }
        
        // Now let the road system update connections normally
        this.mapSystem.roadSystem.updateRoadConnections();
    }
    
    // Mark all roads connected to a specific zone as inoperable
    markConnectedRoadsAsInoperable(zoneRow, zoneCol) {
        if (!this.mapSystem.roadSystem) return;
        
        // Use flood fill to find all connected roads
        const visited = new Set();
        const queue = [{row: zoneRow, col: zoneCol}];
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check all 8 directions for roads and bridges
            for (let dir of directions) {
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                
                if (newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                    newCol >= 0 && newCol < this.mapSystem.mapSize.cols) {
                    
                    const cell = this.mapSystem.cells[newRow][newCol];
                    if (cell.attribute === 'road' || cell.attribute === 'bridge' ||
                        cell.class === 'road' || cell.class === 'bridge') {
                        
                        // Mark this road as inoperable
                        const cellElement = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
                        if (cellElement) {
                            cellElement.classList.add('disconnected-road');
                            cellElement.setAttribute('data-power-inoperable', 'true');
                            // Set visual styling for inoperable roads
                            if (cell.attribute === 'road' || cell.class === 'road') {
                                cellElement.style.setProperty('background-color', '#ff6b6b', 'important');
                                cellElement.style.setProperty('border', '2px solid #ff4444', 'important');
                            } else if (cell.attribute === 'bridge' || cell.class === 'bridge') {
                                cellElement.style.setProperty('background-color', '#ff8c8c', 'important');
                                cellElement.style.setProperty('border', '2px solid #ff4444', 'important');
                            }
                        }
                        
                        // Add to queue to continue flood fill
                        queue.push({row: newRow, col: newCol});
                    }
                }
            }
        }
    }
    
    // Calculate generation rates based on sources
    calculateGenerationRates() {
        // Wood generation: 0.5 per lumber yard per second
        this.generationRates.wood = this.resourceSources.wood.size * 0.5;
        
        // Ore generation: 0.5 per mining outpost per second
        this.generationRates.ore = this.resourceSources.ore.size * 0.5;
        
        // Processed materials generation: 1 per industrial zone per second + 0.5 per mixed use zone
        const industrialZones = Array.from(this.resourceSources.processedMaterials).filter(key => !key.includes('_mixed')).length;
        const mixedZones = Array.from(this.resourceSources.processedMaterials).filter(key => key.includes('_mixed')).length;
        this.generationRates.processedMaterials = (industrialZones * 1) + (mixedZones * 0.5);
        
        // Commercial goods generation: 0.5 per commercial zone per second + 0.5 per mixed use zone
        // Only count zones connected to operable roads
        const commercialZones = Array.from(this.resourceSources.commercialGoods).filter(key => {
            if (key.includes('_mixed')) return false; // Handle mixed zones separately
            const [row, col] = key.split(',').map(Number);
            return this.isConnectedToOperableRoad(row, col);
        }).length;
        
        const mixedCommercialZones = Array.from(this.resourceSources.commercialGoods).filter(key => {
            if (!key.includes('_mixed')) return false;
            const [row, col] = key.split(',').map(Number);
            return this.isConnectedToOperableRoad(row, col);
        }).length;
        
        this.generationRates.commercialGoods = (commercialZones * 0.5) + (mixedCommercialZones * 0.5);
        
        // Power generation: 1.0 per power plant per second (can power 2 industrial zones at 0.5 each)
        this.generationRates.power = this.resourceSources.power.size * 1.0;
    }
    
    // Check if a zone is connected to operable roads
    isConnectedToOperableRoad(row, col) {
        if (!this.mapSystem.roadSystem) return false;
        
        // Check if the zone is adjacent to any operable road
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
                if (cell.attribute === 'road' || cell.attribute === 'bridge' ||
                    cell.class === 'road' || cell.class === 'bridge') {
                    
                    // Check if this road is operable (not disconnected)
                    const cellElement = document.querySelector(`[data-row="${checkRow}"][data-col="${checkCol}"]`);
                    if (cellElement && !cellElement.classList.contains('disconnected-road')) {
                        return true; // Found an operable road
                    }
                }
            }
        }
        
        return false; // No operable roads found
    }
    
    // Calculate consumption rates based on consumers
    calculateConsumptionRates() {
        // Power consumption: 0.5 per industrial/residential/commercial zone, 0.1 per other building per second
        let highPowerBuildings = 0; // Industrial, residential, commercial zones
        let otherBuildings = 0;     // Mixed use zones (power plants, lumber yards, mining outposts don't consume power)
        
        for (let key of this.resourceConsumers.power) {
            const [row, col] = key.split(',').map(Number);
            const cell = this.mapSystem.cells[row][col];
            if (cell.attribute === 'industrial' || cell.class === 'industrial' ||
                cell.attribute === 'residential' || cell.class === 'residential' ||
                cell.attribute === 'commercial' || cell.class === 'commercial') {
                highPowerBuildings++;
            } else {
                // Only mixed use zones consume power among the "other" buildings
                if (cell.attribute === 'mixed' || cell.class === 'mixed') {
                    otherBuildings++;
                }
            }
        }
        
        this.consumptionRates.power = (highPowerBuildings * 0.5) + (otherBuildings * 0.1);
        
        // Wood consumption: 0.3 per industrial zone per second
        this.consumptionRates.wood = this.resourceConsumers.wood.size * 0.3;
        
        // Ore consumption: 0.3 per industrial zone per second
        this.consumptionRates.ore = this.resourceConsumers.ore.size * 0.3;
        
        // Processed materials consumption: 0.3 per commercial zone per second
        this.consumptionRates.processedMaterials = this.resourceConsumers.processedMaterials.size * 0.3;
        
        // Commercial goods consumption: 1 per residential zone per second
        // Only count residential zones connected to operable roads
        const operableResidentialZones = Array.from(this.resourceConsumers.commercialGoods).filter(key => {
            const [row, col] = key.split(',').map(Number);
            return this.isConnectedToOperableRoad(row, col);
        }).length;
        
        this.consumptionRates.commercialGoods = operableResidentialZones * 1;
    }
    
    // Add resources (for testing or special events)
    addResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            const playerResources = this.getCurrentPlayerResources();
            playerResources[type] = Math.max(0, Math.min(this.maxResources[type], playerResources[type] + amount));
            this.updateCurrentPlayerResources(playerResources);
            this.updateResourceDisplay();
            console.log(`Added ${amount} ${type}. Total: ${Math.floor(playerResources[type])}`);
        }
    }
    
    // Remove resources (for building costs)
    removeResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            const playerResources = this.getCurrentPlayerResources();
            const newAmount = Math.max(0, playerResources[type] - amount);
            const actualRemoved = playerResources[type] - newAmount;
            playerResources[type] = newAmount;
            this.updateCurrentPlayerResources(playerResources);
            this.updateResourceDisplay();
            console.log(`Removed ${actualRemoved} ${type}. Total: ${Math.floor(playerResources[type])}`);
            return actualRemoved;
        }
        return 0;
    }
    
    // Check if enough resources are available
    hasEnoughResources(costs) {
        const playerResources = this.getCurrentPlayerResources();
        for (const [resource, amount] of Object.entries(costs)) {
            if (playerResources[resource] < amount) {
                return false;
            }
        }
        return true;
    }
    
    // Get resource information
    getResourceInfo(type) {
        const playerResources = this.getCurrentPlayerResources();
        return {
            current: playerResources[type],
            max: this.maxResources[type],
            generation: this.generationRates[type],
            consumption: this.consumptionRates[type],
            net: this.generationRates[type] - this.consumptionRates[type]
        };
    }
    
    // Update resource display in UI
    updateResourceDisplay() {
        const resourceDisplay = document.getElementById('resourceDisplay');
        if (!resourceDisplay) return;
        
        const playerResources = this.getCurrentPlayerResources();
        
        resourceDisplay.innerHTML = `
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">🪵</span>
                    <span class="resource-name">Wood: </span>
                    <span class="resource-amount"> ${Math.floor(playerResources.wood)}</span>
                </div>
                <span class="resource-rate">(${this.generationRates.wood - this.consumptionRates.wood > 0 ? '+' : ''}${Math.round((this.generationRates.wood - this.consumptionRates.wood) * 10) / 10}/s)</span>
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">⛏️</span>
                    <span class="resource-name">Ore: </span>
                    <span class="resource-amount"> ${Math.floor(playerResources.ore)}</span>
                </div>
                <span class="resource-rate">(${this.generationRates.ore - this.consumptionRates.ore > 0 ? '+' : ''}${Math.round((this.generationRates.ore - this.consumptionRates.ore) * 10) / 10}/s)</span>
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">🔧</span>
                    <span class="resource-name">Materials: </span>
                    <span class="resource-amount"> ${Math.floor(playerResources.processedMaterials)}</span>
                </div>
                ${this.getProcessedMaterialsProductionStatus()}
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">📦</span>
                    <span class="resource-name">Goods: </span>
                    <span class="resource-amount"> ${Math.floor(playerResources.commercialGoods)}</span>
                </div>
                ${this.getGoodsProductionStatus()}
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">⚡</span>
                    <span class="resource-name">Power:</span>
                    <span class="resource-amount"> ${Math.floor(playerResources.power)}</span>
                </div>
                <span class="resource-rate">(${this.generationRates.power - this.consumptionRates.power > 0 ? '+' : ''}${Math.round((this.generationRates.power - this.consumptionRates.power) * 10) / 10}/s)</span>
            </div>
        `;
        
        // Update button states based on available resources
        this.updateButtonStates();
    }
    
    // Update button visual states based on available resources
    updateButtonStates() {
        const buttonCosts = {
            'buildRoad': { wood: 4 },
            'buildHighway': { wood: 10, ore: 4 },
            'buildBridge': { wood: 16, ore: 6 },
            'buildTunnel': { ore: 10 },
            'buildPowerPlant': { wood: 25, ore: 15 },
            'buildPowerLines': { wood: 3, ore: 1 },
            'buildLumberYard': { wood: 10 },
            'buildMiningOutpost': { wood: 20, ore: 10 },
            'zoneResidential': { wood: 20, ore: 4 },
            'zoneCommercial': { wood: 30, ore: 10 },
            'zoneIndustrial': { wood: 40, ore: 20 },
            'zoneMixed': { wood: 44, ore: 24 }
        };
        
        Object.entries(buttonCosts).forEach(([buttonId, costs]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                const container = button.closest('.player-btn-container');
                if (container) {
                    if (this.hasEnoughResources(costs)) {
                        container.classList.remove('insufficient-resources');
                    } else {
                        container.classList.add('insufficient-resources');
                    }
                }
            }
        });
    }
    
    // Recalculate everything (call when map changes)
    recalculate() {
        this.calculateResourceSources();
        this.calculateResourceConsumers();
        this.calculateGenerationRates();
        this.calculateConsumptionRates();
        this.updateRoadOperabilityBasedOnIndustrialPower();
        this.updateResourceDisplay();
        this.updateIndustrialZoneIndicators();
    }
    
    // Set current player ID for multiplayer resource tracking
    setCurrentPlayerId(playerId) {
        this.currentPlayerId = playerId;
        console.log('Resource management player ID set to:', playerId);
        
        // Initialize player resources if not exists
        if (playerId && !this.playerResources.has(playerId)) {
            this.playerResources.set(playerId, {
                wood: 30,
                ore: 10,
                processedMaterials: 0,
                commercialGoods: 0,
                power: 0
            });
        }
        
        // Update current resources to match player's resources
        if (playerId && this.playerResources.has(playerId)) {
            this.resources = { ...this.playerResources.get(playerId) };
        }
    }
    
    // Get current player's resources
    getCurrentPlayerResources() {
        if (this.currentPlayerId && this.playerResources.has(this.currentPlayerId)) {
            return this.playerResources.get(this.currentPlayerId);
        }
        return this.resources; // Fallback to global resources
    }
    
    // Update current player's resources
    updateCurrentPlayerResources(newResources) {
        if (this.currentPlayerId) {
            this.playerResources.set(this.currentPlayerId, { ...newResources });
            this.resources = { ...newResources };
        } else {
            this.resources = { ...newResources };
        }
    }
    
    // Initialize player resources for a new player
    initializePlayerResources(playerId) {
        if (!this.playerResources.has(playerId)) {
            this.playerResources.set(playerId, {
                wood: 30,
                ore: 10,
                processedMaterials: 0,
                commercialGoods: 0,
                power: 0
            });
        }
    }
    
    // Get all player resources (for debugging)
    getAllPlayerResources() {
        const result = {};
        for (const [playerId, resources] of this.playerResources) {
            result[playerId] = { ...resources };
        }
        return result;
    }
    
    // Get processed materials production status with power requirement feedback
    getProcessedMaterialsProductionStatus() {
        const netMaterials = this.generationRates.processedMaterials - this.consumptionRates.processedMaterials;
        const playerResources = this.getCurrentPlayerResources();
        const hasPower = playerResources.power > 0;
        const hasWood = playerResources.wood >= this.consumptionRates.wood;
        const hasOre = playerResources.ore >= this.consumptionRates.ore;
        
        // Check if production is blocked
        if (!hasPower) {
            return `<span class="resource-rate" style="color: #ff4444;">⚠️ No power</span>`;
        } else if (!hasWood) {
            return `<span class="resource-rate" style="color: #ff9800;">⚠️ No wood</span>`;
        } else if (!hasOre) {
            return `<span class="resource-rate" style="color: #ff9800;">⚠️ No ore</span>`;
        } else {
            // Normal production
            return `<span class="resource-rate">(${netMaterials > 0 ? '+' : ''}${Math.round(netMaterials * 10) / 10}/s)</span>`;
        }
    }
    
    // Get goods production status with power requirement feedback
    getGoodsProductionStatus() {
        const netGoods = this.generationRates.commercialGoods - this.consumptionRates.commercialGoods;
        const playerResources = this.getCurrentPlayerResources();
        const hasPower = playerResources.power > 0;
        const hasProcessedMaterials = playerResources.processedMaterials >= this.consumptionRates.processedMaterials;
        
        // Check if production is blocked
        if (!hasPower) {
            return `<span class="resource-rate" style="color: #ff4444;">⚠️ No power</span>`;
        } else if (!hasProcessedMaterials) {
            return `<span class="resource-rate" style="color: #ff9800;">⚠️ No materials</span>`;
        } else {
            // Normal production
            return `<span class="resource-rate">(${netGoods > 0 ? '+' : ''}${Math.round(netGoods * 10) / 10}/s)</span>`;
        }
    }
    
    // Check if industrial zones should show no-power indicator
    shouldShowNoPowerIndicator() {
        const playerResources = this.getCurrentPlayerResources();
        return playerResources.power <= 0 && this.resourceSources.processedMaterials.size > 0;
    }
    
    // Update industrial zone visual indicators
    updateIndustrialZoneIndicators() {
        const playerResources = this.getCurrentPlayerResources();
        const hasPower = playerResources.power > 0;
        const hasWood = playerResources.wood >= this.consumptionRates.wood;
        const hasOre = playerResources.ore >= this.consumptionRates.ore;
        const canProduce = hasPower && hasWood && hasOre;
        
        // Update all industrial zones
        for (const key of this.resourceSources.processedMaterials) {
            const [row, col] = key.split(',').map(Number);
            const cellElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cellElement) {
                if (!canProduce) {
                    cellElement.classList.add('no-power-indicator');
                    if (!hasPower) {
                        cellElement.title = 'Industrial zone: No power';
                    } else if (!hasWood) {
                        cellElement.title = 'Industrial zone: No wood';
                    } else if (!hasOre) {
                        cellElement.title = 'Industrial zone: No ore';
                    }
                } else {
                    cellElement.classList.remove('no-power-indicator');
                    cellElement.title = 'Industrial zone: Producing processed materials';
                }
            }
        }
    }

    // Reset resources to starting values (for new world generation)
    resetToStartingResources() {
        console.log('=== COMPLETE RESOURCE RESET ===');
        
        // Stop any ongoing resource generation
        this.stopResourceGeneration();
        console.log('Resource generation stopped');
        
        // Reset global resources to starting values
        this.resources = {
            wood: 30, // Reset to starting values
            ore: 10,
            processedMaterials: 0,
            commercialGoods: 0,
            power: 0
        };
        
        // Reset all player resources to starting values
        for (const [playerId, playerResources] of this.playerResources) {
            this.playerResources.set(playerId, {
                wood: 30,
                ore: 10,
                processedMaterials: 0,
                commercialGoods: 0,
                power: 0
            });
        }
        console.log('Resources reset to:', this.resources);
        
        // Clear all resource sources (this stops passive generation)
        this.resourceSources.wood.clear();
        this.resourceSources.ore.clear();
        this.resourceSources.commercialGoods.clear();
        this.resourceSources.power.clear();
        console.log('Resource sources cleared');
        
        // Clear all resource consumers
        this.resourceConsumers.wood.clear();
        this.resourceConsumers.ore.clear();
        this.resourceConsumers.commercialGoods.clear();
        this.resourceConsumers.power.clear();
        console.log('Resource consumers cleared');
        
        // Reset generation and consumption rates to 0
        this.generationRates = {
            wood: 0,
            ore: 0,
            commercialGoods: 0,
            power: 0
        };
        
        this.consumptionRates = {
            wood: 0,
            ore: 0,
            commercialGoods: 0,
            power: 0
        };
        console.log('Generation/consumption rates reset to 0');
        
        // Force recalculation to ensure everything is clean
        this.calculateResourceSources();
        this.calculateResourceConsumers();
        this.calculateGenerationRates();
        this.calculateConsumptionRates();
        console.log('Resource calculations forced');
        
        // Update road operability based on industrial power
        this.updateRoadOperabilityBasedOnIndustrialPower();
        console.log('Road operability updated based on industrial power');
        
        // Update display
        this.updateResourceDisplay();
        console.log('Display updated');
        
        // Restart resource generation (will be 0 since no sources exist)
        this.startResourceGeneration();
        console.log('Resource generation restarted (with 0 rates)');
        
        console.log('=== RESOURCE RESET COMPLETE ===');
    }
    
    // Get all resource data for debugging
    getDebugInfo() {
        return {
            resources: this.resources,
            generationRates: this.generationRates,
            consumptionRates: this.consumptionRates,
            sources: {
                wood: this.resourceSources.wood.size,
                ore: this.resourceSources.ore.size,
                processedMaterials: this.resourceSources.processedMaterials.size,
                commercialGoods: this.resourceSources.commercialGoods.size,
                power: this.resourceSources.power.size
            },
            consumers: {
                wood: this.resourceConsumers.wood.size,
                ore: this.resourceConsumers.ore.size,
                processedMaterials: this.resourceConsumers.processedMaterials.size,
                commercialGoods: this.resourceConsumers.commercialGoods.size,
                power: this.resourceConsumers.power.size
            }
        };
    }
}
