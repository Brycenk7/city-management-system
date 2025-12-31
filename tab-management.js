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
        
        // Calculate available space for builder mode
        // Account for both sidebars (tools and info panels), padding, and margins
        const sidebarWidth = 280; // Tools panel width
        const infoPanelWidth = 280; // Info panel width
        const headerHeight = 80; // Approximate header height
        const padding = 60; // Total padding/margins (both sides)
        
        const availableWidth = window.innerWidth - sidebarWidth - infoPanelWidth - padding;
        const availableHeight = window.innerHeight - headerHeight - padding;
        
        // Make map container a perfect square based on available space
        const containerSize = Math.min(availableWidth, availableHeight);
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '8px';
        mapContainer.style.padding = '15px';
        mapContainer.style.margin = 'auto';
        mapContainer.style.aspectRatio = '1'; // Ensure container is square
        
        // Ensure map grid maintains aspect ratio
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = 'auto';
            mapGrid.style.aspectRatio = '1';
            mapGrid.style.maxWidth = '100%';
            mapGrid.style.maxHeight = '100%';
            mapGrid.style.transform = '';
            mapGrid.style.transformOrigin = '';
        }
        
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
        
        // Calculate available space more accurately
        // Account for sidebars, padding, and margins
        const sidebarWidth = 280; // Tools panel width
        const headerHeight = 80; // Approximate header height
        const padding = 30; // Total padding/margins
        
        const availableWidth = window.innerWidth - sidebarWidth - padding;
        const availableHeight = window.innerHeight - headerHeight - padding;
        
        // Make map container a perfect square based on available space
        const containerSize = Math.min(availableWidth, availableHeight);
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '0';
        mapContainer.style.padding = '0';
        mapContainer.style.aspectRatio = '1'; // Ensure container is square
        
        // Ensure map grid maintains aspect ratio
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = 'auto';
            mapGrid.style.aspectRatio = '1';
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

        // Ensure map grid is visible
        if (mapGrid) {
            mapGrid.style.display = 'grid';
            mapGrid.style.visibility = 'visible';
            mapGrid.style.opacity = '1';
        }

        // Calculate available space more accurately
        // Account for player panel, padding, and margins
        const sidebarWidth = 280; // Player panel width
        const headerHeight = 80; // Approximate header height
        const padding = 30; // Total padding/margins
        
        const availableWidth = window.innerWidth - sidebarWidth - padding;
        const availableHeight = window.innerHeight - headerHeight - padding;
        
        // Make map container a perfect square based on available space
        const containerSize = Math.min(availableWidth, availableHeight);
        mapContainer.style.width = `${containerSize}px`;
        mapContainer.style.height = `${containerSize}px`;
        mapContainer.style.borderRadius = '0';
        mapContainer.style.padding = '0';
        mapContainer.style.margin = 'auto';
        mapContainer.style.aspectRatio = '1'; // Ensure container is square
        
        // Ensure map grid maintains aspect ratio
        if (mapGrid) {
            mapGrid.style.width = '100%';
            mapGrid.style.height = 'auto';
            mapGrid.style.aspectRatio = '1';
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
            
            playerStatsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-label">Population:</span>
                    <span class="stat-value">${residential * 100}</span>
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
