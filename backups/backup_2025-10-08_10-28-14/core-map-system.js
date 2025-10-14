// Core Map System - Basic map creation, cell management, and core functionality
class MapSystem {
    constructor() {
        this.mapSize = { rows: 60, cols: 60 };
        this.selectedAttribute = 'grassland';
        this.selectedClass = 'grassland';
        this.cells = [];
        this.classInfo = new ClassInfo();
        this.waterProperties = new WaterProperties();
        
        // Drag painting state
        this.isDragging = false;
        this.dragStartCell = null;
        this.lastPaintedCell = null;
        
        // Tab system
        this.currentTab = 'builder';
        this.viewerArtMode = 'pixel'; // 'pixel' or 'testing'
        this.playerMode = 'road'; // Current player mode
        this.wavePosition = 0; // Current wave position
        
        // Original terrain tracking for erase functionality
        this.originalTerrain = new Map(); // Store original terrain before player modifications
        this.waveInterval = null; // Wave animation interval
        
        // Viewer zoom and pan
        this.viewerZoom = 1;
        this.viewerPanX = 0;
        this.viewerPanY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        
        this.init();
    }
    
    init() {
        console.log('Initializing MapSystem...');
        this.createMap();
        console.log('Map created');
        // Don't set up event listeners here - they'll be set up by main.js after modules are connected
        this.updateStats();
        console.log('Stats updated');
        console.log('MapSystem initialized');
    }
    
    createMap() {
        console.log('Creating map...');
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found!');
            return;
        }
        mapContainer.innerHTML = '';
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            this.cells[row] = [];
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.attribute = 'grassland';
                
                // Remove existing listener to prevent duplicates
                cell.removeEventListener('click', this.handleCellClick);
                cell.addEventListener('click', (e) => this.handleCellClick(e));
                cell.addEventListener('mousedown', (e) => this.handleCellMouseDown(e));
                cell.addEventListener('mouseenter', (e) => this.handleCellHover(e));
                cell.addEventListener('mouseleave', (e) => this.handleCellLeave(e));
                
                mapContainer.appendChild(cell);
                this.cells[row][col] = {
                    element: cell,
                    attribute: 'grassland',
                    class: 'grassland',
                    row: row,
                    col: col
                };
            }
        }
        
        // Initialize original terrain tracking
        this.initializeOriginalTerrain();
        
        console.log('Map created with', this.mapSize.rows * this.mapSize.cols, 'cells');
    }
    
    initializeOriginalTerrain() {
        // Save the initial state of all cells as original terrain
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                this.saveOriginalTerrain(row, col);
            }
        }
        console.log('Original terrain initialized for', this.mapSize.rows * this.mapSize.cols, 'cells');
    }
    
    setupEventListeners() {
        console.log('Setting up MapSystem event listeners...');
        // Tool selection
        const toolButtons = document.querySelectorAll('.tool-btn');
        console.log('Found tool buttons in MapSystem:', toolButtons.length);
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attribute = e.target.dataset.attribute;
                const className = e.target.dataset.class;
                console.log('Tool button clicked in MapSystem:', attribute, className);
                this.selectAttribute(attribute, className);
            });
        });
        
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        console.log('Found tabs in MapSystem:', tabs.length);
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabType = e.currentTarget.getAttribute('data-tab');
                console.log('Tab clicked in MapSystem:', tabType);
                this.switchTab(tabType);
            });
        });
        
        // Art style toggle buttons (viewer only)
        const toggleArtStyle = document.getElementById('toggleArtStyle');
        if (toggleArtStyle) {
            toggleArtStyle.addEventListener('click', () => {
                console.log('Toggle art style clicked in MapSystem');
                this.setArtMode('pixel');
            });
        } else {
            console.error('Toggle art style button not found in MapSystem');
        }
        
        const toggleTestingStyle = document.getElementById('toggleTestingStyle');
        if (toggleTestingStyle) {
            toggleTestingStyle.addEventListener('click', () => {
                console.log('Toggle testing style clicked in MapSystem');
                this.setArtMode('testing');
            });
        } else {
            console.error('Toggle testing style button not found in MapSystem');
        }
        
        // City Player Pro buttons
        const playerButtons = [
            'buildRoad', 'buildHighway', 'buildBridge', 'buildTunnel',
            'zoneResidential', 'zoneCommercial', 'zoneIndustrial', 'zoneMixed',
            'buildPowerPlant', 'buildPowerLines', 'buildLumberYard', 'buildMiningOutpost', 'buildErase'
        ];
        
        playerButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                // Convert button ID to match data-attribute format
                let mode = buttonId.replace('build', '').replace('zone', '');
                // Convert to camelCase for power buttons
                if (mode === 'PowerPlant') mode = 'powerPlant';
                if (mode === 'PowerLines') mode = 'powerLines';
                if (mode === 'LumberYard') mode = 'lumberYard';
                if (mode === 'MiningOutpost') mode = 'miningOutpost';
                if (mode === 'Residential') mode = 'residential';
                if (mode === 'Commercial') mode = 'commercial';
                if (mode === 'Industrial') mode = 'industrial';
                if (mode === 'Mixed') mode = 'mixed';
                if (mode === 'Road') mode = 'road';
                if (mode === 'Bridge') mode = 'bridge';
                if (mode === 'Erase') mode = 'erase';
                
                button.addEventListener('click', () => {
                    this.setPlayerMode(mode);
                });
            } else {
                console.error(`Player button ${buttonId} not found in MapSystem`);
            }
        });
        
        // Global mouse events for drag painting
        document.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));
        document.addEventListener('mouseleave', (e) => this.handleGlobalMouseLeave(e));
        console.log('Global mouse events added in MapSystem');
        
        // Map controls
        const clearMap = document.getElementById('clearMap');
        if (clearMap) {
            clearMap.addEventListener('click', () => {
                console.log('Clear map clicked in MapSystem');
                this.clearMap();
            });
            console.log('Clear map listener added');
        } else {
            console.error('Clear map element not found in MapSystem');
        }
        
        const saveMap = document.getElementById('saveMap');
        if (saveMap) {
            saveMap.addEventListener('click', () => {
                console.log('Save map clicked in MapSystem');
                if (this.utilityFunctions) {
                    this.utilityFunctions.saveMap();
                }
            });
            console.log('Save map listener added');
        } else {
            console.error('Save map element not found in MapSystem');
        }
        
        const loadMap = document.getElementById('loadMap');
        if (loadMap) {
            loadMap.addEventListener('click', () => {
                console.log('Load map clicked in MapSystem');
                if (this.utilityFunctions) {
                    this.utilityFunctions.loadMap();
                }
            });
            console.log('Load map listener added');
        } else {
            console.error('Load map element not found in MapSystem');
        }
        
        const generateMap = document.getElementById('generateRandomMap');
        if (generateMap) {
            generateMap.addEventListener('click', () => {
                console.log('Generate map clicked in MapSystem');
                if (this.proceduralGeneration) {
                    this.proceduralGeneration.generateProceduralMap();
                }
            });
            console.log('Generate map listener added');
        } else {
            console.error('Generate map element not found in MapSystem');
        }
        
        // Viewer controls
        const zoomIn = document.getElementById('zoomIn');
        if (zoomIn) {
            zoomIn.addEventListener('click', () => {
                console.log('Zoom in clicked in MapSystem');
                if (this.viewerSystem) {
                    this.viewerSystem.zoomIn();
                }
            });
        } else {
            console.error('Zoom in element not found in MapSystem');
        }
        
        const zoomOut = document.getElementById('zoomOut');
        if (zoomOut) {
            zoomOut.addEventListener('click', () => {
                console.log('Zoom out clicked in MapSystem');
                if (this.viewerSystem) {
                    this.viewerSystem.zoomOut();
                }
            });
        } else {
            console.error('Zoom out element not found in MapSystem');
        }
        
        // File loading
        const loadFile = document.getElementById('fileInput');
        if (loadFile) {
            loadFile.addEventListener('change', (e) => {
                console.log('Load file changed in MapSystem');
                if (this.utilityFunctions) {
                    this.utilityFunctions.handleFileLoad(e);
                }
            });
            console.log('File input listener added');
        } else {
            console.error('Load file element not found in MapSystem');
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.utilityFunctions) {
                this.utilityFunctions.handleKeyboard(e);
            }
        });
        
        // Window resize listener for viewer and player modes
        window.addEventListener('resize', () => {
            if (this.currentTab === 'viewer') {
                this.applyViewerStyling();
            } else if (this.currentTab === 'player') {
                this.applyPlayerStyling();
            }
        });
        console.log('Window resize listener added in MapSystem');
    }
    
    selectAttribute(attribute, className) {
        console.log('MapSystem selectAttribute called:', attribute, className);
        this.selectedAttribute = attribute;
        this.selectedClass = className;
        
        // Update visual feedback
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-attribute="${attribute}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            console.log('Active button updated:', activeBtn);
        } else {
            console.error('Active button not found for attribute:', attribute);
        }
        
        // Update info panel
        this.updateCellInfo();
    }
    
    updateCellInfo() {
        console.log('MapSystem updateCellInfo called for:', this.selectedAttribute);
        const cellInfo = document.getElementById('cellInfo');
        if (cellInfo) {
            const classData = this.classInfo.getClassData(this.selectedAttribute);
            console.log('Class data:', classData);
            cellInfo.innerHTML = `
                <div class="info-item">
                    <span class="info-label">Selected:</span>
                    <span class="info-value">${this.selectedAttribute}</span>
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
            console.log('Cell info updated');
        } else {
            console.error('Cell info element not found in MapSystem');
        }
    }
    
    updateStats() {
        const stats = this.calculateMapStats();
        
        // Update stats display
        document.getElementById('totalCells').textContent = stats.totalCells;
        document.getElementById('waterCells').textContent = stats.water;
        document.getElementById('landCells').textContent = stats.land;
        document.getElementById('mountainCells').textContent = stats.mountains;
        document.getElementById('forestCells').textContent = stats.forests;
        
        // Update percentages
        document.getElementById('waterPercentage').textContent = `${stats.waterPercentage}%`;
        document.getElementById('landPercentage').textContent = `${stats.landPercentage}%`;
        document.getElementById('mountainPercentage').textContent = `${stats.mountainPercentage}%`;
        document.getElementById('forestPercentage').textContent = `${stats.forestPercentage}%`;
    }
    
    calculateMapStats() {
        let water = 0, land = 0, mountains = 0, forests = 0;
        let residential = 0, commercial = 0, industrial = 0;
        let roads = 0;
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                const attribute = cell.attribute;
                
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(attribute)) {
                    water++;
                } else if (attribute === 'mountain') {
                    mountains++;
                } else if (attribute === 'forest') {
                    forests++;
                } else if (attribute === 'residential') {
                    residential++;
                } else if (attribute === 'commercial') {
                    commercial++;
                } else if (attribute === 'industrial') {
                    industrial++;
                } else if (attribute === 'road') {
                    roads++;
                } else {
                    land++;
                }
            }
        }
        
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        
        return {
            totalCells,
            water,
            land,
            mountains,
            forests,
            residential,
            commercial,
            industrial,
            roads,
            waterPercentage: Math.round((water / totalCells) * 100),
            landPercentage: Math.round((land / totalCells) * 100),
            mountainPercentage: Math.round((mountains / totalCells) * 100),
            forestPercentage: Math.round((forests / totalCells) * 100)
        };
    }
    
    clearMap() {
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                this.cells[row][col].attribute = 'grassland';
                this.cells[row][col].class = 'grassland';
                this.cells[row][col].element.className = 'cell';
                this.cells[row][col].element.dataset.attribute = 'grassland';
            }
        }
        
        this.updateStats();
        this.updateCellInfo();
    }
    
    updateCellVisual(row, col) {
        const cell = this.cells[row][col];
        const element = cell.element;
        
        // Reset classes
        element.className = 'cell';
        
        // Add the appropriate class based on attribute
        if (cell.attribute) {
            element.classList.add(cell.attribute);
        }
        
        // Add class if it's different from attribute
        if (cell.class && cell.class !== cell.attribute) {
            element.classList.add(cell.class);
        }
        
        // Update dataset
        element.dataset.attribute = cell.attribute;
        element.dataset.class = cell.class;
        
        // Apply art mode styling if in viewer tab
        if (this.currentTab === 'viewer') {
            this.applyArtMode();
        }
        
        // Ensure visibility in player mode (only if needed)
        if (this.currentTab === 'player' && (element.style.display !== 'block' || element.style.visibility !== 'visible')) {
            element.style.display = 'block';
            element.style.visibility = 'visible';
        }
    }
    
    isValidAttribute(attribute) {
        const validAttributes = [
            'grassland', 'desert', 'forest', 'mountain', 'ocean', 'lake', 'river',
            'riverStart', 'riverEnd', 'residential', 'commercial', 'industrial',
            'road', 'bridge', 'powerPlant', 'powerLines', 'mixed'
        ];
        return validAttributes.includes(attribute);
    }
    
    // Delegate methods to other systems
    switchTab(tabType) {
        console.log('MapSystem switchTab called:', tabType);
        console.log('Tab management available:', !!this.tabManagement);
        if (this.tabManagement) {
            this.tabManagement.switchTab(tabType);
        } else {
            console.error('Tab management not available for switchTab');
        }
    }
    
    applyViewerStyling() {
        console.log('MapSystem applyViewerStyling called');
        if (this.tabManagement) {
            this.tabManagement.applyViewerStyling();
        } else {
            console.error('Tab management not available for applyViewerStyling');
        }
    }
    
    applyPlayerStyling() {
        console.log('MapSystem applyPlayerStyling called');
        if (this.tabManagement) {
            this.tabManagement.applyPlayerStyling();
        } else {
            console.error('Tab management not available for applyPlayerStyling');
        }
    }
    
    applyArtMode() {
        console.log('MapSystem applyArtMode called');
        if (this.tabManagement) {
            this.tabManagement.applyArtMode();
        } else {
            console.error('Tab management not available for applyArtMode');
        }
    }
    
    startWaveAnimation() {
        console.log('MapSystem startWaveAnimation called');
        if (this.waveAnimation) {
            this.waveAnimation.startWaveAnimation();
        } else {
            console.error('Wave animation not available for startWaveAnimation');
        }
    }
    
    stopWaveAnimation() {
        console.log('MapSystem stopWaveAnimation called');
        if (this.waveAnimation) {
            this.waveAnimation.stopWaveAnimation();
        } else {
            console.error('Wave animation not available for stopWaveAnimation');
        }
    }
    
    classifyWaterRegions() {
        console.log('MapSystem classifyWaterRegions called');
        if (this.waterSystem) {
            this.waterSystem.classifyWaterRegions();
        } else {
            console.error('Water system not available for classifyWaterRegions');
        }
    }
    
    reclassifyWaterAfterRemoval(row, col) {
        console.log('MapSystem reclassifyWaterAfterRemoval called:', row, col);
        if (this.waterSystem) {
            this.waterSystem.reclassifyWaterAfterRemoval(row, col);
        } else {
            console.error('Water system not available for reclassifyWaterAfterRemoval');
        }
    }
    
    classifyRoadRegions() {
        console.log('MapSystem classifyRoadRegions called');
        if (this.roadSystem) {
            this.roadSystem.classifyRoadRegions();
        } else {
            console.error('Road system not available for classifyRoadRegions');
        }
    }
    
    reclassifyRoadAfterRemoval(row, col) {
        console.log('MapSystem reclassifyRoadAfterRemoval called:', row, col);
        if (this.roadSystem) {
            this.roadSystem.reclassifyRoadAfterRemoval(row, col);
        } else {
            console.error('Road system not available for reclassifyRoadAfterRemoval');
        }
    }
    
    // Power Line System Methods
    classifyPowerLineRegions() {
        console.log('MapSystem classifyPowerLineRegions called');
        if (this.powerLineSystem) {
            this.powerLineSystem.classifyPowerLineRegions();
        } else {
            console.error('Power line system not available for classifyPowerLineRegions');
        }
    }
    
    reclassifyPowerLineAfterRemoval(row, col) {
        console.log('MapSystem reclassifyPowerLineAfterRemoval called:', row, col);
        if (this.powerLineSystem) {
            this.powerLineSystem.reclassifyPowerLineAfterRemoval(row, col);
        } else {
            console.error('Power line system not available for reclassifyPowerLineAfterRemoval');
        }
    }
    
    generateProceduralMap() {
        console.log('MapSystem generateProceduralMap called');
        if (this.proceduralGeneration) {
            this.proceduralGeneration.generateProceduralMap();
            // Re-initialize original terrain after generation
            this.initializeOriginalTerrain();
        } else {
            console.error('Procedural generation not available for generateProceduralMap');
        }
    }
    
    // Delegate to cell interaction
    clearAllErrorStyling() {
        console.log('MapSystem clearAllErrorStyling called');
        if (this.cellInteraction) {
            this.cellInteraction.clearAllErrorStyling();
        } else {
            console.error('Cell interaction not available for clearAllErrorStyling');
        }
    }
    
    // Map management methods
    clearMap() {
        console.log('MapSystem clearMap called');
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                this.cells[row][col].attribute = 'grassland';
                this.cells[row][col].class = 'grassland';
                this.cells[row][col].element.dataset.attribute = 'grassland';
                this.cells[row][col].element.className = 'cell';
            }
        }
        this.updateStats();
        this.updateCellInfo();
        console.log('Map cleared successfully');
    }
    
    
    updateStats() {
        const stats = this.calculateMapStats();
        
        // Update stats display
        const statsElement = document.getElementById('stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Total Cells:</span>
                    <span class="stat-value">${this.mapSize.rows * this.mapSize.cols}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Grassland:</span>
                    <span class="stat-value">${stats.grassland}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Water:</span>
                    <span class="stat-value">${stats.water}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Forest:</span>
                    <span class="stat-value">${stats.forest}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mountain:</span>
                    <span class="stat-value">${stats.mountain}</span>
                </div>
            `;
        }
    }
    
    calculateMapStats() {
        const stats = {
            grassland: 0,
            water: 0,
            forest: 0,
            mountain: 0,
            residential: 0,
            commercial: 0,
            industrial: 0,
            mixed: 0,
            road: 0,
            bridge: 0,
            powerPlant: 0,
            powerLines: 0
        };
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const attribute = this.cells[row][col].attribute;
                if (stats.hasOwnProperty(attribute)) {
                    stats[attribute]++;
                }
            }
        }
        
        return stats;
    }
    
    countAttribute(attribute) {
        let count = 0;
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                if (this.cells[row][col].attribute === attribute) {
                    count++;
                }
            }
        }
        return count;
    }
    
    calculateWaterCoverage() {
        const waterCount = this.countAttribute('water') + this.countAttribute('ocean') + this.countAttribute('lake') + this.countAttribute('river');
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        return Math.round((waterCount / totalCells) * 100);
    }
    
    calculateForestCoverage() {
        const forestCount = this.countAttribute('forest');
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        return Math.round((forestCount / totalCells) * 100);
    }
    
    calculateMountainCoverage() {
        const mountainCount = this.countAttribute('mountain');
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        return Math.round((mountainCount / totalCells) * 100);
    }
    
    // Mouse event methods - delegate to cell interaction
    handleGlobalMouseMove(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleGlobalMouseMove(e);
        }
    }
    
    handleGlobalMouseUp(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleGlobalMouseUp(e);
        }
    }
    
    handleGlobalMouseLeave(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleGlobalMouseLeave(e);
        }
    }
    
    // Cell interaction methods - delegate to cell interaction
    handleCellClick(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleCellClick(e);
        }
    }
    
    handleCellMouseDown(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleCellMouseDown(e);
        }
    }
    
    handleCellHover(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleCellHover(e);
        }
    }
    
    handleCellLeave(e) {
        if (this.cellInteraction) {
            this.cellInteraction.handleCellLeave(e);
        }
    }
    
    // Delegate to viewer system
    setupViewerMouseEvents() {
        console.log('MapSystem setupViewerMouseEvents called');
        if (this.viewerSystem) {
            this.viewerSystem.setupViewerMouseEvents();
        } else {
            console.error('Viewer system not available for setupViewerMouseEvents');
        }
    }
    
    applyZoomAndPan() {
        console.log('MapSystem applyZoomAndPan called');
        if (this.viewerSystem) {
            this.viewerSystem.applyZoomAndPan();
        } else {
            console.error('Viewer system not available for applyZoomAndPan');
        }
    }
    
    zoomIn() {
        console.log('MapSystem zoomIn called');
        if (this.viewerSystem) {
            this.viewerSystem.zoomIn();
        } else {
            console.error('Viewer system not available for zoomIn');
        }
    }
    
    zoomOut() {
        console.log('MapSystem zoomOut called');
        if (this.viewerSystem) {
            this.viewerSystem.zoomOut();
        } else {
            console.error('Viewer system not available for zoomOut');
        }
    }
    
    // Player mode methods
    setPlayerMode(mode) {
        this.playerMode = mode;
        
        // Set the selected attribute and class for painting
        this.selectedAttribute = mode;
        this.selectedClass = mode;
        
        // Update active button styling
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-attribute="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        } else {
            console.error('Player button not found for mode:', mode);
        }
        
        // Update player stats
        this.updatePlayerStats();
    }
    
    // Art mode methods
    setArtMode(mode) {
        console.log('MapSystem setArtMode called:', mode);
        this.viewerArtMode = mode;
        this.applyArtMode();
    }
    
    applyArtMode() {
        console.log('MapSystem applyArtMode called for mode:', this.viewerArtMode);
        if (this.tabManagement) {
            this.tabManagement.applyArtMode();
        } else {
            console.error('Tab management not available for applyArtMode');
        }
    }
    
    updatePlayerStats() {
        console.log('MapSystem updatePlayerStats called');
        const playerStats = document.getElementById('playerStats');
        if (playerStats) {
            const stats = this.calculateMapStats();
            playerStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Population:</span>
                    <span class="stat-value">${stats.residential * 100}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Zoning:</span>
                    <span class="stat-value">${stats.commercial + stats.industrial + stats.mixed}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Infrastructure:</span>
                    <span class="stat-value">${stats.road + stats.bridge}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">City Score:</span>
                    <span class="stat-value">${Math.round((stats.residential * 100 + stats.commercial * 50 + stats.industrial * 30) / 10)}</span>
                </div>
            `;
            console.log('Player stats updated');
        } else {
            console.error('Player stats element not found');
        }
    }
    
    // Water system methods
    isAdjacentToAnyWater(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    hasPowerPlantWaterAccess(row, col) {
        // Power plant needs water within 1 tile (adjacent cells only)
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd', 'water'].includes(cell.attribute) ||
                    ['ocean', 'lake', 'river', 'riverStart', 'riverEnd', 'water'].includes(cell.class)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    hasPowerPlantAccess(row, col) {
        // Power plant can be placed if it has water access OR is adjacent to another power plant
        return this.hasPowerPlantWaterAccess(row, col) || this.isAdjacentToPowerPlant(row, col);
    }
    
    isAdjacentToPowerPlant(row, col) {
        // Check if adjacent to another power plant
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                if (cell.attribute === 'powerPlant') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    hasIndustrialWaterAccess(row, col) {
        const visited = new Set();
        const result = this.checkIndustrialWaterAccess(row, col, visited);
        console.log(`Industrial water access at (${row}, ${col}): ${result}`);
        return result;
    }
    
    checkIndustrialWaterAccess(row, col, visited) {
        if (row < 0 || row >= this.mapSize.rows || 
            col < 0 || col >= this.mapSize.cols) {
            return false;
        }
        
        const key = `${row},${col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        const cell = this.cells[row][col];
        
        // Check if this cell is water
        if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd', 'water'].includes(cell.attribute) ||
            ['ocean', 'lake', 'river', 'riverStart', 'riverEnd', 'water'].includes(cell.class)) {
            return true;
        }
        
        // Check adjacent cells within radius
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            if (this.checkIndustrialWaterAccess(row + dir.dr, col + dir.dc, visited)) {
                return true;
            }
        }
        
        return false;
    }
    
    isAdjacentToPowerPlantOrPowerLines(row, col) {
        // Power lines can be placed within 5 tiles of a power plant
        // or within 5 tiles of other power lines
        const maxRadius = 5;
        
        // Check for power plants and power lines within 5-tile radius
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dr = -radius; dr <= radius; dr++) {
                for (let dc = -radius; dc <= radius; dc++) {
                    // Skip if not on the perimeter of the current radius
                    if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) {
                        continue;
                    }
                    
                    const checkRow = row + dr;
                    const checkCol = col + dc;
                    
                    if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                        checkCol >= 0 && checkCol < this.mapSize.cols) {
                        
                        const cell = this.cells[checkRow][checkCol];
                        if (cell.attribute === 'powerPlant' || cell.attribute === 'powerLines') {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    isWithinPowerGrid(row, col) {
        // Check if location is within 5 tiles of a power plant or adjacent to power lines
        return this.isAdjacentToPowerPlantOrPowerLines(row, col);
    }
    
    // Check if lumber yard has forests within 3 tiles
    hasLumberYardForestAccess(row, col) {
        const maxDistance = 3;
        let forestCount = 0;
        
        // Check all cells within 3 tiles of the lumber yard position
        for (let r = Math.max(0, row - maxDistance); r <= Math.min(this.mapSize.rows - 1, row + maxDistance); r++) {
            for (let c = Math.max(0, col - maxDistance); c <= Math.min(this.mapSize.cols - 1, col + maxDistance); c++) {
                // Skip the lumber yard position itself
                if (r === row && c === col) continue;
                
                // Calculate distance from lumber yard
                const distance = Math.max(Math.abs(r - row), Math.abs(c - col));
                if (distance <= maxDistance) {
                    const cell = this.cells[r][c];
                    if (cell.attribute === 'forest' || cell.class === 'forest') {
                        forestCount++;
                        console.log(`Found forest at (${r}, ${c}), distance: ${distance}`);
                    }
                }
            }
        }
        
        console.log(`Lumber yard at (${row}, ${col}) has access to ${forestCount} forest tiles within 3 tiles`);
        return forestCount > 0;
    }
    
    // Count connected forests within 3 tiles of lumber yard
    countConnectedForests(row, col) {
        const maxDistance = 3;
        let forestCount = 0;
        
        // Check all cells within 3 tiles of the lumber yard position
        for (let r = Math.max(0, row - maxDistance); r <= Math.min(this.mapSize.rows - 1, row + maxDistance); r++) {
            for (let c = Math.max(0, col - maxDistance); c <= Math.min(this.mapSize.cols - 1, col + maxDistance); c++) {
                // Skip the lumber yard position itself
                if (r === row && c === col) continue;
                
                // Calculate distance from lumber yard
                const distance = Math.max(Math.abs(r - row), Math.abs(c - col));
                if (distance <= maxDistance) {
                    const cell = this.cells[r][c];
                    if (cell.attribute === 'forest' || cell.class === 'forest') {
                        forestCount++;
                    }
                }
            }
        }
        
        return forestCount;
    }
    
    // Original terrain tracking for erase functionality
    saveOriginalTerrain(row, col) {
        const key = `${row},${col}`;
        // Only save if not already saved (preserve original state)
        if (!this.originalTerrain.has(key)) {
            const cell = this.cells[row][col];
            this.originalTerrain.set(key, {
                attribute: cell.attribute,
                class: cell.class
            });
        }
    }
    
    erasePlayerModifications(row, col) {
        const key = `${row},${col}`;
        const originalState = this.originalTerrain.get(key);
        
        if (originalState) {
            this.cells[row][col].attribute = originalState.attribute;
            this.cells[row][col].class = originalState.class;
            this.updateCellVisual(row, col);
            this.updateStats();
        } else {
            // If no original terrain saved, revert to grassland
            this.cells[row][col].attribute = 'grassland';
            this.cells[row][col].class = 'grassland';
            this.updateCellVisual(row, col);
            this.updateStats();
        }
        
        // Update road connections after erasing (important for road highlighting)
        if (this.cellInteraction && this.cellInteraction.updateRoadConnections) {
            this.cellInteraction.updateRoadConnections();
        }
        
        return originalState ? true : false;
    }
    
    isPlayerPlaced(row, col) {
        const key = `${row},${col}`;
        const cell = this.cells[row][col];
        const originalState = this.originalTerrain.get(key);
        
        // If no original terrain saved, it's natural terrain
        if (!originalState) return false;
        
        // Check if current state differs from original (player modified)
        return cell.attribute !== originalState.attribute || cell.class !== originalState.class;
    }
    
    isAdjacentToCommercialRoad(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                if (['road', 'bridge', 'commercial'].includes(cell.attribute)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToIndustrial(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                if (cell.attribute === 'industrial') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToResidential(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSize.cols) {
                
                const cell = this.cells[checkRow][checkCol];
                if (cell.attribute === 'residential') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    countAttribute(attribute) {
        let count = 0;
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                if (cell.attribute === attribute) {
                    count++;
                }
            }
        }
        
        return count;
    }
    
    calculateWaterCoverage() {
        let waterCount = 0;
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    waterCount++;
                }
            }
        }
        
        return Math.round((waterCount / totalCells) * 100);
    }
    
    calculateForestCoverage() {
        let forestCount = 0;
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                if (cell.attribute === 'forest') {
                    forestCount++;
                }
            }
        }
        
        return Math.round((forestCount / totalCells) * 100);
    }
    
    calculateMountainCoverage() {
        let mountainCount = 0;
        const totalCells = this.mapSize.rows * this.mapSize.cols;
        
        for (let row = 0; row < this.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSize.cols; col++) {
                const cell = this.cells[row][col];
                if (cell.attribute === 'mountain') {
                    mountainCount++;
                }
            }
        }
        
        return Math.round((mountainCount / totalCells) * 100);
    }
}
