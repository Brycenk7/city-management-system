// Tab Management - Tab switching, viewer/player modes, and styling
class TabManagement {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    switchTab(tabType) {
        console.log('TabManagement switchTab called:', tabType);
        // Remove active class from all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        event.currentTarget.classList.add('active');
        
        // Update current tab
        this.mapSystem.currentTab = tabType;
        
        // Set data-tab attribute on body for CSS targeting
        document.body.setAttribute('data-tab', tabType);
        
        // Update UI based on tab
        this.updateTabContent(tabType);
        
        // Apply scaling based on current tab
        this.applyTabScaling();
        
        // Deselect tools when switching away from player tab
        if (tabType !== 'player' && this.mapSystem.toolSystem) {
            this.mapSystem.toolSystem.deselectAllTools();
        }
    }
    
    updateTabContent(tabType) {
        console.log('TabManagement updateTabContent called:', tabType);
        if (tabType === 'builder') {
            // Show builder tools and functionality
            document.querySelector('.tools-panel').style.display = 'block';
            document.querySelector('.info-panel').style.display = 'block';
            document.getElementById('playerControls').style.display = 'none';
            document.getElementById('viewerControls').style.display = 'none';
            // Show all control buttons for builder
            this.resetButtonVisibility();
            // Enable map interaction
            document.getElementById('map').style.pointerEvents = 'auto';
            // Apply builder styling to ensure aspect ratio
            this.applyBuilderStyling();
            console.log('Builder tab content updated');
        } else if (tabType === 'player') {
            // Hide tools panel and show player tools and functionality
            document.querySelector('.tools-panel').style.display = 'none';
            document.querySelector('.info-panel').style.display = 'none';
            document.getElementById('playerControls').style.display = 'block';
            document.getElementById('viewerControls').style.display = 'none';
            // Show only save and load buttons for player (hide clear and generate)
            this.updatePlayerButtons();
            // Enable map interaction
            document.getElementById('map').style.pointerEvents = 'auto';
            // Reset any viewer styling first
            this.resetViewerStyling();
            // Force grid visibility before applying styling
            this.forceGridVisibility();
            // Apply player styling
            this.applyPlayerStyling();
            this.updatePlayerStats();
            console.log('Player tab content updated');
        } else if (tabType === 'viewer') {
            // Show viewer tools and functionality
            document.querySelector('.tools-panel').style.display = 'none';
            document.querySelector('.info-panel').style.display = 'none';
            document.getElementById('playerControls').style.display = 'none';
            document.getElementById('viewerControls').style.display = 'block';
            // Hide all control buttons for viewer
            document.getElementById('mapControls').style.display = 'none';
            // Enable map interaction for zoom and pan
            document.getElementById('map').style.pointerEvents = 'auto';
            // Apply viewer styling
            this.applyViewerStyling();
            this.updateViewerStats();
            console.log('Viewer tab content updated');
        }
    }
    
    updatePlayerButtons() {
        // Show only save and load buttons for player tab
        document.getElementById('mapControls').style.display = 'block';
        document.getElementById('clearMap').style.display = 'none';
        document.getElementById('saveMap').style.display = 'inline-block';
        document.getElementById('loadMap').style.display = 'inline-block';
        document.getElementById('generateRandomMap').style.display = 'none';
    }
    
    resetButtonVisibility() {
        // Reset all buttons to visible for builder tab
        const mapControls = document.getElementById('mapControls');
        if (mapControls) {
            mapControls.style.display = 'flex';
            mapControls.style.flexWrap = 'nowrap';
            mapControls.style.alignItems = 'center';
        }
        
        document.getElementById('clearMap').style.display = 'inline-block';
        document.getElementById('saveMap').style.display = 'inline-block';
        document.getElementById('loadMap').style.display = 'inline-block';
        document.getElementById('generateRandomMap').style.display = 'inline-block';
    }
    
    resetViewerStyling() {
        console.log('Resetting viewer styling for player mode');
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        const mapArea = document.querySelector('.map-area');
        
        // Reset any viewer-specific styling
        if (mapGrid) {
            mapGrid.style.transform = '';
            mapGrid.style.transformOrigin = '';
            mapGrid.style.display = 'grid';
            mapGrid.style.visibility = 'visible';
            mapGrid.style.opacity = '1';
        }
        
        // Reset map container
        if (mapContainer) {
            mapContainer.style.width = '';
            mapContainer.style.height = '';
            mapContainer.style.borderRadius = '';
            mapContainer.style.padding = '';
            mapContainer.style.margin = '';
        }
        
        // Reset map area
        if (mapArea) {
            mapArea.style.display = '';
            mapArea.style.justifyContent = '';
            mapArea.style.alignItems = '';
            mapArea.style.width = '';
            mapArea.style.height = '';
            mapArea.style.overflow = '';
            mapArea.style.position = '';
        }
        
        // Reset all cells
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.border = '';
            cell.style.borderRadius = '';
            cell.style.display = 'block';
            cell.style.visibility = 'visible';
            cell.style.opacity = '1';
            cell.style.transform = '';
        });
        
        console.log(`Reset viewer styling for ${cells.length} cells`);
    }
    
    forceGridVisibility() {
        console.log('Forcing grid visibility for player mode');
        const mapGrid = document.getElementById('map');
        if (mapGrid) {
            mapGrid.style.display = 'grid';
            mapGrid.style.visibility = 'visible';
            mapGrid.style.opacity = '1';
        }
        
        // Force all cells to be visible
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.display = 'block';
            cell.style.visibility = 'visible';
            cell.style.opacity = '1';
        });
        console.log(`Forced visibility for ${cells.length} cells`);
    }
    
    resetMapStyling() {
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        const mapArea = document.querySelector('.map-area');
        
        // Reset map area styling
        mapArea.style.display = '';
        mapArea.style.justifyContent = '';
        mapArea.style.alignItems = '';
        mapArea.style.width = '';
        mapArea.style.height = '';
        mapArea.style.overflow = '';
        mapArea.style.position = '';
        
        // Reset map container styling
        mapContainer.style.width = '';
        mapContainer.style.height = '';
        mapContainer.style.borderRadius = '';
        mapContainer.style.padding = '';
        mapContainer.style.margin = '';
        mapContainer.style.aspectRatio = '';
        
        // Reset map grid styling
        mapGrid.style.transform = '';
        mapGrid.style.transformOrigin = '';
        mapGrid.style.width = '';
        mapGrid.style.height = '';
        mapGrid.style.aspectRatio = '';
        mapGrid.style.maxWidth = '';
        mapGrid.style.maxHeight = '';
        
        // Reset all cells
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.border = '';
            cell.style.borderRadius = '';
            cell.style.display = 'block';
        });
        
    }
    
    applyBuilderStyling() {
        console.log('TabManagement applyBuilderStyling called');
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        const mapArea = document.querySelector('.map-area');
        const toolsPanel = document.querySelector('.tools-panel');
        const infoPanel = document.querySelector('.info-panel');
        
        // Get header height
        const header = document.querySelector('.app-header');
        const headerHeight = header ? header.offsetHeight : 70;
        
        // Calculate available space
        const mapAreaPadding = 30; // 15px on each side
        const mapContainerPadding = 30; // 15px padding in container
        const minSidebarWidth = 200; // Minimum usable sidebar width
        const maxSidebarWidth = 350; // Maximum sidebar width
        const minGridSize = 500; // Increased minimum grid size for better visibility
        
        // Calculate available dimensions
        const availableHeight = window.innerHeight - headerHeight - mapAreaPadding;
        const availableWidth = window.innerWidth - mapAreaPadding;
        
        // Calculate maximum square size based on available height
        const maxSquareSizeByHeight = availableHeight - mapContainerPadding;
        
        // Start with minimum sidebar width, then adjust based on available space
        let sidebarWidth = minSidebarWidth;
        
        // Calculate how much width we need for sidebars
        const sidebarsWidth = sidebarWidth * 2;
        const availableWidthForGrid = availableWidth - sidebarsWidth;
        
        // Calculate target square size - use the smaller dimension, but ensure minimum
        let targetSquareSize = Math.min(maxSquareSizeByHeight, availableWidthForGrid);
        
        // If target size is too small, shrink sidebars to give grid more room
        if (targetSquareSize < minGridSize) {
            // Calculate how much width we need for minimum grid size
            const minGridWidthNeeded = minGridSize + mapContainerPadding;
            const maxSidebarsWidth = availableWidth - minGridWidthNeeded;
            
            // Distribute available width to sidebars (with minimum constraint)
            sidebarWidth = Math.max(180, Math.min(maxSidebarWidth, maxSidebarsWidth / 2));
            
            // Recalculate with new sidebar width
            const newSidebarsWidth = sidebarWidth * 2;
            const newAvailableWidthForGrid = availableWidth - newSidebarsWidth;
            targetSquareSize = Math.min(maxSquareSizeByHeight, newAvailableWidthForGrid);
            targetSquareSize = Math.max(minGridSize, targetSquareSize);
        }
        
        // Apply calculated widths to sidebars
        if (toolsPanel) {
            toolsPanel.style.width = `${sidebarWidth}px`;
        }
        if (infoPanel) {
            infoPanel.style.width = `${sidebarWidth}px`;
        }
        
        // Ensure targetSquareSize is reasonable
        targetSquareSize = Math.max(minGridSize, targetSquareSize);
        
        // Set container to calculated square size (targetSquareSize is the inner grid size)
        const containerSize = targetSquareSize + mapContainerPadding;
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '8px';
        mapContainer.style.padding = '15px';
        mapContainer.style.margin = 'auto';
        mapContainer.style.aspectRatio = '1';
        mapContainer.style.flexShrink = '0';
        mapContainer.style.flexGrow = '0';
        mapContainer.style.minWidth = `${containerSize}px`;
        mapContainer.style.minHeight = `${containerSize}px`;
        
        // Let grid fill the container - cells will be square, so grid will be square
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = '100%';
            mapGrid.style.aspectRatio = '';
            mapGrid.style.maxWidth = '100%';
            mapGrid.style.maxHeight = '100%';
            mapGrid.style.minWidth = '0';
            mapGrid.style.minHeight = '0';
            mapGrid.style.transform = '';
            mapGrid.style.transformOrigin = '';
        }
        
        console.log('Builder styling - targetSquareSize:', targetSquareSize, 'containerSize:', containerSize, 'sidebarWidth:', sidebarWidth);
        
        // Center the map area
        mapArea.style.display = 'flex';
        mapArea.style.justifyContent = 'center';
        mapArea.style.alignItems = 'center';
        mapArea.style.width = '100%';
        mapArea.style.height = '100%';
        mapArea.style.overflow = 'hidden';
        mapArea.style.position = 'relative';
        
        console.log('Builder styling applied');
    }
    
    applyViewerStyling() {
        console.log('TabManagement applyViewerStyling called');
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        const mapArea = document.querySelector('.map-area');
        const viewerPanel = document.getElementById('viewerControls');
        
        // Get header height
        const header = document.querySelector('.app-header');
        const headerHeight = header ? header.offsetHeight : 70;
        
        // Calculate available space
        const mapAreaPadding = 30; // 15px on each side
        const mapContainerPadding = 0; // No padding in viewer mode
        const minSidebarWidth = 200; // Minimum usable sidebar width
        const maxSidebarWidth = 350; // Maximum sidebar width
        const minGridSize = 500; // Increased minimum grid size for better visibility
        
        // Calculate available dimensions
        const availableHeight = window.innerHeight - headerHeight - mapAreaPadding;
        const availableWidth = window.innerWidth - mapAreaPadding;
        
        // Calculate maximum square size based on available height
        const maxSquareSizeByHeight = availableHeight - mapContainerPadding;
        
        // Start with minimum sidebar width, then adjust based on available space
        let sidebarWidth = minSidebarWidth;
        
        // Calculate how much width we need for sidebar
        const availableWidthForGrid = availableWidth - sidebarWidth;
        
        // Calculate target square size - use the smaller dimension, but ensure minimum
        let targetSquareSize = Math.min(maxSquareSizeByHeight, availableWidthForGrid);
        
        // If target size is too small, shrink sidebar to give grid more room
        if (targetSquareSize < minGridSize) {
            // Calculate how much width we need for minimum grid size
            const minGridWidthNeeded = minGridSize + mapContainerPadding;
            const maxSidebarWidthAvailable = availableWidth - minGridWidthNeeded;
            
            // Set sidebar width (with minimum constraint)
            sidebarWidth = Math.max(180, Math.min(maxSidebarWidth, maxSidebarWidthAvailable));
            
            // Recalculate with new sidebar width
            const newAvailableWidthForGrid = availableWidth - sidebarWidth;
            targetSquareSize = Math.min(maxSquareSizeByHeight, newAvailableWidthForGrid);
            targetSquareSize = Math.max(minGridSize, targetSquareSize);
        }
        
        // Apply calculated width to viewer panel
        if (viewerPanel) {
            viewerPanel.style.width = `${sidebarWidth}px`;
        }
        
        // Set container to calculated square size
        const containerSize = targetSquareSize + mapContainerPadding;
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '0';
        mapContainer.style.padding = '0';
        mapContainer.style.aspectRatio = '1';
        mapContainer.style.flexShrink = '0';
        mapContainer.style.flexGrow = '0';
        
        // Let grid fill the container - cells will be square, so grid will be square
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = '100%';
            mapGrid.style.aspectRatio = '';
            mapGrid.style.maxWidth = '100%';
            mapGrid.style.maxHeight = '100%';
        }
        
        // Center the map area
        mapArea.style.display = 'flex';
        mapArea.style.justifyContent = 'center';
        mapArea.style.alignItems = 'center';
        mapArea.style.width = '100%';
        mapArea.style.height = '100%';
        mapArea.style.overflow = 'hidden';
        mapArea.style.position = 'relative';
        
        // Apply zoom and pan
        if (this.mapSystem.viewerSystem) {
            this.mapSystem.viewerSystem.applyZoomAndPan();
        }
        
        // Add mouse events for panning
        if (this.mapSystem.viewerSystem) {
            this.mapSystem.viewerSystem.setupViewerMouseEvents();
        }
        console.log('Viewer styling applied');
    }
    
    setArtMode(mode) {
        console.log('TabManagement setArtMode called:', mode);
        this.mapSystem.viewerArtMode = mode;
        
        // Update button states
        document.querySelectorAll('.viewer-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Update button states
        document.getElementById('toggleArtStyle').classList.remove('active');
        document.getElementById('toggleTestingStyle').classList.remove('active');
        
        if (mode === 'pixel') {
            document.getElementById('toggleArtStyle').classList.add('active');
        } else if (mode === 'testing') {
            document.getElementById('toggleTestingStyle').classList.add('active');
        }
        
        // Apply the new art mode
        this.applyArtMode();
        
        // Start/stop wave animation
        if (mode === 'testing') {
            if (this.mapSystem.waveAnimation) {
                this.mapSystem.waveAnimation.startWaveAnimation();
            }
        } else {
            if (this.mapSystem.waveAnimation) {
                this.mapSystem.waveAnimation.stopWaveAnimation();
            }
        }
        console.log('Art mode set to:', mode);
    }
    
    setPlayerMode(mode) {
        console.log('TabManagement setPlayerMode called:', mode);
        this.mapSystem.playerMode = mode;
        
        // Update button states
        document.querySelectorAll('.player-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set active button based on mode
        const buttonMap = {
            'road': 'buildRoad',
            'highway': 'buildHighway',
            'bridge': 'buildBridge',
            'tunnel': 'buildTunnel',
            'powerPlant': 'buildPowerPlant',
            'powerLines': 'buildPowerLines',
            'lumberYard': 'buildLumberYard',
            'miningOutpost': 'buildMiningOutpost',
            'residential': 'zoneResidential',
            'commercial': 'zoneCommercial',
            'industrial': 'zoneIndustrial',
            'mixed': 'zoneMixed'
        };
        
        const activeButton = buttonMap[mode];
        if (activeButton) {
            document.getElementById(activeButton).classList.add('active');
        }
        console.log('Player mode set to:', mode);
    }
    
    applyArtMode() {
        console.log('TabManagement applyArtMode called for mode:', this.mapSystem.viewerArtMode);
        // Only apply art mode if we're in viewer tab
        if (this.mapSystem.currentTab !== 'viewer') {
            console.log('Not in viewer tab, skipping art mode application');
            return;
        }
        
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            // Remove any existing art classes
            cell.classList.remove('testing-ocean', 'viewer-mountain');
            
            const attribute = cell.dataset.attribute;
            
            if (this.mapSystem.viewerArtMode === 'testing') {
                // Apply testing mode styling
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(attribute)) {
                    cell.classList.add('testing-ocean');
                }
            } else if (this.mapSystem.viewerArtMode === 'pixel') {
                // Apply pixel art mode styling
                if (attribute === 'mountain') {
                    cell.classList.add('viewer-mountain');
                }
            }
        });
        console.log('Art mode applied');
    }
    
    applyPlayerStyling() {
        console.log('TabManagement applyPlayerStyling called');
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        const mapArea = document.querySelector('.map-area');
        const playerPanel = document.getElementById('playerControls');
        const toolPanel = document.querySelector('.tool-panel');

        // Ensure map grid is visible
        if (mapGrid) {
            mapGrid.style.display = 'grid';
            mapGrid.style.visibility = 'visible';
            mapGrid.style.opacity = '1';
        }

        // Get header height
        const header = document.querySelector('.app-header');
        const headerHeight = header ? header.offsetHeight : 70;
        
        // Calculate available space
        const mapAreaPadding = 30; // 15px on each side
        const mapContainerPadding = 0; // No padding in player mode
        const minSidebarWidth = 200; // Minimum usable sidebar width
        const maxSidebarWidth = 350; // Maximum sidebar width
        const minGridSize = 500; // Increased minimum grid size for better visibility
        
        // Calculate available dimensions
        const availableHeight = window.innerHeight - headerHeight - mapAreaPadding;
        const availableWidth = window.innerWidth - mapAreaPadding;
        
        // Calculate maximum square size based on available height
        const maxSquareSizeByHeight = availableHeight - mapContainerPadding;
        
        // Start with minimum sidebar width, then adjust based on available space
        let sidebarWidth = minSidebarWidth;
        
        // Calculate how much width we need for sidebars (two sidebars in player mode)
        const sidebarsWidth = sidebarWidth * 2;
        const availableWidthForGrid = availableWidth - sidebarsWidth;
        
        // Calculate target square size - use the smaller dimension, but ensure minimum
        let targetSquareSize = Math.min(maxSquareSizeByHeight, availableWidthForGrid);
        
        // If target size is too small, shrink sidebars to give grid more room
        if (targetSquareSize < minGridSize) {
            // Calculate how much width we need for minimum grid size
            const minGridWidthNeeded = minGridSize + mapContainerPadding;
            const maxSidebarsWidth = availableWidth - minGridWidthNeeded;
            
            // Distribute available width to sidebars (with minimum constraint)
            sidebarWidth = Math.max(180, Math.min(maxSidebarWidth, maxSidebarsWidth / 2));
            
            // Recalculate with new sidebar width
            const newSidebarsWidth = sidebarWidth * 2;
            const newAvailableWidthForGrid = availableWidth - newSidebarsWidth;
            targetSquareSize = Math.min(maxSquareSizeByHeight, newAvailableWidthForGrid);
            targetSquareSize = Math.max(minGridSize, targetSquareSize);
        }
        
        // Apply calculated width to player panel and tool panel
        if (playerPanel) {
            playerPanel.style.width = `${sidebarWidth}px`;
        }
        if (toolPanel) {
            toolPanel.style.width = `${sidebarWidth}px`;
        }
        
        // Set container to calculated square size
        const containerSize = targetSquareSize + mapContainerPadding;
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '0';
        mapContainer.style.padding = '0';
        mapContainer.style.margin = 'auto';
        mapContainer.style.aspectRatio = '1';
        mapContainer.style.flexShrink = '0';
        mapContainer.style.flexGrow = '0';
        
        // Let grid fill the container - cells will be square, so grid will be square
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = '100%';
            mapGrid.style.aspectRatio = '';
            mapGrid.style.maxWidth = '100%';
            mapGrid.style.maxHeight = '100%';
        }

        // Center the map area
        mapArea.style.display = 'flex';
        mapArea.style.justifyContent = 'center';
        mapArea.style.alignItems = 'center';
        mapArea.style.width = '100%';
        mapArea.style.height = '100%';
        mapArea.style.overflow = 'hidden';
        mapArea.style.position = 'relative';

        // Apply player-specific styling to the map
        const cells = document.querySelectorAll('.cell');
        console.log(`Applying player styling to ${cells.length} cells`);
        cells.forEach(cell => {
            // Remove any existing art classes
            cell.classList.remove('testing-ocean', 'viewer-mountain');

            // Ensure no borders in player mode
            cell.style.setProperty('border', 'none', 'important');
            cell.style.setProperty('border-radius', '0px', 'important');
            cell.style.display = 'block';
            cell.style.visibility = 'visible';
            cell.style.opacity = '1';
        });
        console.log('Player styling applied');
    }
    
    updatePlayerStats() {
        console.log('TabManagement updatePlayerStats called');
        const playerStatsElement = document.getElementById('playerStats');
        if (playerStatsElement) {
            const residential = this.mapSystem.countAttribute('residential');
            const commercial = this.mapSystem.countAttribute('commercial');
            const industrial = this.mapSystem.countAttribute('industrial');
            const roads = this.mapSystem.countAttribute('road');
            const highways = this.mapSystem.countAttribute('highway');
            
            // Calculate total population from individual residential cells
            const totalPopulation = this.mapSystem.calculateTotalPopulation ? this.mapSystem.calculateTotalPopulation() : residential * 100;
            
            playerStatsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Population:</span>
                    <span class="stat-value">${totalPopulation}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Commercial:</span>
                    <span class="stat-value">${commercial} zones</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Industrial:</span>
                    <span class="stat-value">${industrial} zones</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Infrastructure:</span>
                    <span class="stat-value">${roads + highways} roads</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">City Score:</span>
                    <span class="stat-value">${this.calculateCityScore()}</span>
                </div>
            `;
            console.log('Player stats updated');
        } else {
            console.error('Player stats element not found');
        }
    }
    
    calculateCityScore() {
        console.log('TabManagement calculateCityScore called');
        const residential = this.mapSystem.countAttribute('residential');
        const commercial = this.mapSystem.countAttribute('commercial');
        const industrial = this.mapSystem.countAttribute('industrial');
        const roads = this.mapSystem.countAttribute('road');
        const highways = this.mapSystem.countAttribute('highway');
        
        let score = 0;
        
        // Base score from infrastructure
        score += (roads + highways) * 10;
        
        // Score from zoning balance
        const totalZoned = residential + commercial + industrial;
        if (totalZoned > 0) {
            const residentialRatio = residential / totalZoned;
            const commercialRatio = commercial / totalZoned;
            const industrialRatio = industrial / totalZoned;
            
            // Ideal ratios: 60% residential, 25% commercial, 15% industrial
            const residentialScore = Math.max(0, 100 - Math.abs(residentialRatio - 0.6) * 200);
            const commercialScore = Math.max(0, 100 - Math.abs(commercialRatio - 0.25) * 200);
            const industrialScore = Math.max(0, 100 - Math.abs(industrialRatio - 0.15) * 200);
            
            score += (residentialScore + commercialScore + industrialScore) / 3;
        }
        
        const finalScore = Math.round(score);
        console.log('City score calculated:', finalScore);
        return finalScore;
    }
    
    updateViewerStats() {
        console.log('TabManagement updateViewerStats called');
        const statsElement = document.getElementById('viewerStats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">📊 Total Cells</span>
                    <span class="viewer-stat-value">${this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols}</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">🌊 Water Coverage</span>
                    <span class="viewer-stat-value">${this.mapSystem.calculateWaterCoverage()}%</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">🌲 Forest Coverage</span>
                    <span class="viewer-stat-value">${this.mapSystem.calculateForestCoverage()}%</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">⛰️ Mountain Coverage</span>
                    <span class="viewer-stat-value">${this.mapSystem.calculateMountainCoverage()}%</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">🏠 Residential</span>
                    <span class="viewer-stat-value">${this.mapSystem.countAttribute('residential')}</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">🏢 Commercial</span>
                    <span class="viewer-stat-value">${this.mapSystem.countAttribute('commercial')}</span>
                </div>
                <div class="viewer-stat-item">
                    <span class="viewer-stat-label">🏭 Industrial</span>
                    <span class="viewer-stat-value">${this.mapSystem.countAttribute('industrial')}</span>
                </div>
            `;
            console.log('Viewer stats updated');
        } else {
            console.error('Viewer stats element not found');
        }
    }
    
    applyTabScaling() {
        // This method can be expanded for tab-specific scaling if needed
        // Currently handled by individual styling methods
    }
}
