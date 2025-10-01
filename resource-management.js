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
        
        this.maxResources = {
            wood: 1000,
            ore: 1000,
            processedMaterials: 500,
            commercialGoods: 500,
            power: 1000
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
        // Calculate net generation for wood and ore (generation - consumption)
        // Lumber yards and mining outposts work even without power
        const netWood = this.generationRates.wood - this.consumptionRates.wood;
        const netOre = this.generationRates.ore - this.consumptionRates.ore;
        const netPower = this.generationRates.power - this.consumptionRates.power;
        
        // Update wood and ore first (these work without power)
        this.resources.wood = Math.max(0, Math.min(this.maxResources.wood, this.resources.wood + netWood));
        this.resources.ore = Math.max(0, Math.min(this.maxResources.ore, this.resources.ore + netOre));
        this.resources.power = Math.max(0, Math.min(this.maxResources.power, this.resources.power + netPower));
        
        // Calculate processed materials production (industrial zones)
        let netProcessedMaterials = -this.consumptionRates.processedMaterials; // Start with consumption
        
        // Only produce processed materials if we have enough wood, ore, AND power
        if (this.resources.wood >= this.consumptionRates.wood && 
            this.resources.ore >= this.consumptionRates.ore &&
            this.resources.power > 0) {
            // We have enough resources and power, so industrial zones can produce
            netProcessedMaterials += this.generationRates.processedMaterials;
        }
        
        // Update processed materials
        this.resources.processedMaterials = Math.max(0, Math.min(this.maxResources.processedMaterials, this.resources.processedMaterials + netProcessedMaterials));
        
        // Calculate commercial goods production (commercial zones)
        let netCommercialGoods = -this.consumptionRates.commercialGoods; // Start with consumption
        
        // Only produce commercial goods if we have enough processed materials AND power
        if (this.resources.processedMaterials >= this.consumptionRates.processedMaterials &&
            this.resources.power > 0) {
            // We have enough processed materials and power, so commercial zones can produce
            netCommercialGoods += this.generationRates.commercialGoods;
        }
        
        // Update commercial goods
        this.resources.commercialGoods = Math.max(0, Math.min(this.maxResources.commercialGoods, this.resources.commercialGoods + netCommercialGoods));
        
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
                
                // Most buildings consume power (except resource production buildings)
                if (this.isBuilding(cell.attribute)) {
                    // Lumber yards and mining outposts don't need power (they're starting infrastructure)
                    if (cell.attribute !== 'lumberYard' && cell.attribute !== 'miningOutpost') {
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
            }
        }
        
        this.calculateConsumptionRates();
    }
    
    // Check if an attribute is a building
    isBuilding(attribute) {
        const buildings = ['residential', 'commercial', 'industrial', 'powerPlant', 'mixed', 'lumberYard', 'miningOutpost'];
        return buildings.includes(attribute);
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
        
        // Commercial goods generation: 1 per commercial zone per second + 0.5 per mixed use zone
        const commercialZones = Array.from(this.resourceSources.commercialGoods).filter(key => !key.includes('_mixed')).length;
        const mixedCommercialZones = Array.from(this.resourceSources.commercialGoods).filter(key => key.includes('_mixed')).length;
        this.generationRates.commercialGoods = (commercialZones * 1) + (mixedCommercialZones * 0.5);
        
        // Power generation: 0.7 per power plant per second
        this.generationRates.power = this.resourceSources.power.size * 0.7;
    }
    
    // Calculate consumption rates based on consumers
    calculateConsumptionRates() {
        // Power consumption: 0.1 per building per second
        this.consumptionRates.power = this.resourceConsumers.power.size * 0.1;
        
        // Wood consumption: 0.3 per industrial zone per second
        this.consumptionRates.wood = this.resourceConsumers.wood.size * 0.3;
        
        // Ore consumption: 0.3 per industrial zone per second
        this.consumptionRates.ore = this.resourceConsumers.ore.size * 0.3;
        
        // Processed materials consumption: 0.3 per commercial zone per second
        this.consumptionRates.processedMaterials = this.resourceConsumers.processedMaterials.size * 0.3;
    }
    
    // Add resources (for testing or special events)
    addResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            this.resources[type] = Math.max(0, Math.min(this.maxResources[type], this.resources[type] + amount));
            this.updateResourceDisplay();
            console.log(`Added ${amount} ${type}. Total: ${Math.floor(this.resources[type])}`);
        }
    }
    
    // Remove resources (for building costs)
    removeResource(type, amount) {
        if (this.resources.hasOwnProperty(type)) {
            const newAmount = Math.max(0, this.resources[type] - amount);
            const actualRemoved = this.resources[type] - newAmount;
            this.resources[type] = newAmount;
            this.updateResourceDisplay();
            console.log(`Removed ${actualRemoved} ${type}. Total: ${Math.floor(this.resources[type])}`);
            return actualRemoved;
        }
        return 0;
    }
    
    // Check if enough resources are available
    hasEnoughResources(costs) {
        for (const [resource, amount] of Object.entries(costs)) {
            if (this.resources[resource] < amount) {
                return false;
            }
        }
        return true;
    }
    
    // Get resource information
    getResourceInfo(type) {
        return {
            current: this.resources[type],
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
        
        resourceDisplay.innerHTML = `
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">🪵</span>
                    <span class="resource-name">Wood: </span>
                    <span class="resource-amount"> ${Math.floor(this.resources.wood)}</span>
                </div>
                <span class="resource-rate">(${this.generationRates.wood - this.consumptionRates.wood > 0 ? '+' : ''}${Math.round((this.generationRates.wood - this.consumptionRates.wood) * 10) / 10}/s)</span>
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">⛏️</span>
                    <span class="resource-name">Ore: </span>
                    <span class="resource-amount"> ${Math.floor(this.resources.ore)}</span>
                </div>
                <span class="resource-rate">(${this.generationRates.ore - this.consumptionRates.ore > 0 ? '+' : ''}${Math.round((this.generationRates.ore - this.consumptionRates.ore) * 10) / 10}/s)</span>
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">🔧</span>
                    <span class="resource-name">Materials: </span>
                    <span class="resource-amount"> ${Math.floor(this.resources.processedMaterials)}</span>
                </div>
                ${this.getProcessedMaterialsProductionStatus()}
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">📦</span>
                    <span class="resource-name">Goods: </span>
                    <span class="resource-amount"> ${Math.floor(this.resources.commercialGoods)}</span>
                </div>
                ${this.getGoodsProductionStatus()}
            </div>
            <div class="resource-item">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span class="resource-icon">⚡</span>
                    <span class="resource-name">Power:</span>
                    <span class="resource-amount"> ${Math.floor(this.resources.power)}</span>
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
        this.updateResourceDisplay();
        this.updateIndustrialZoneIndicators();
    }
    
    // Set current player ID for multiplayer resource tracking
    setCurrentPlayerId(playerId) {
        this.currentPlayerId = playerId;
        console.log('Resource management player ID set to:', playerId);
    }
    
    // Get processed materials production status with power requirement feedback
    getProcessedMaterialsProductionStatus() {
        const netMaterials = this.generationRates.processedMaterials - this.consumptionRates.processedMaterials;
        const hasPower = this.resources.power > 0;
        const hasWood = this.resources.wood >= this.consumptionRates.wood;
        const hasOre = this.resources.ore >= this.consumptionRates.ore;
        
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
        const hasPower = this.resources.power > 0;
        const hasProcessedMaterials = this.resources.processedMaterials >= this.consumptionRates.processedMaterials;
        
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
        return this.resources.power <= 0 && this.resourceSources.processedMaterials.size > 0;
    }
    
    // Update industrial zone visual indicators
    updateIndustrialZoneIndicators() {
        const hasPower = this.resources.power > 0;
        const hasWood = this.resources.wood >= this.consumptionRates.wood;
        const hasOre = this.resources.ore >= this.consumptionRates.ore;
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
        
        // Reset resources to starting values
        this.resources = {
            wood: 30, // Reset to starting values
            ore: 10,
            commercialGoods: 0,
            power: 0
        };
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
