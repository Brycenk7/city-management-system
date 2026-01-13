// Main Script - Ties all modules together
class MainApplication {
    constructor() {
        console.log('Creating MapSystem...');
        this.mapSystem = new MapSystem();
        console.log('MapSystem created:', this.mapSystem);
        
        console.log('Creating TabManagement...');
        this.tabManagement = new TabManagement(this.mapSystem);
        console.log('TabManagement created:', this.tabManagement);
        
        console.log('Creating WaveAnimation...');
        this.waveAnimation = new WaveAnimation(this.mapSystem);
        console.log('WaveAnimation created:', this.waveAnimation);
        
        console.log('Creating ViewerSystem...');
        this.viewerSystem = new ViewerSystem(this.mapSystem);
        console.log('ViewerSystem created:', this.viewerSystem);
        
        console.log('Creating CellInteraction...');
        this.cellInteraction = new CellInteraction(this.mapSystem);
        console.log('CellInteraction created:', this.cellInteraction);
        
        console.log('Creating WaterSystem...');
        this.waterSystem = new WaterSystem(this.mapSystem);
        console.log('WaterSystem created:', this.waterSystem);
        
        console.log('Creating RoadSystem...');
        this.roadSystem = new RoadSystem(this.mapSystem);
        console.log('RoadSystem created:', this.roadSystem);
        
        console.log('Creating PowerLineSystem...');
        this.powerLineSystem = new PowerLineSystem(this.mapSystem);
        console.log('PowerLineSystem created:', this.powerLineSystem);
        
        console.log('Creating ProceduralGeneration...');
        this.proceduralGeneration = new ProceduralGeneration(this.mapSystem);
        console.log('ProceduralGeneration created:', this.proceduralGeneration);
        
        console.log('Creating UtilityFunctions...');
        this.utilityFunctions = new UtilityFunctions(this.mapSystem);
        console.log('UtilityFunctions created:', this.utilityFunctions);
        
        console.log('Creating ResourceManagement...');
        this.resourceManagement = new ResourceManagement(this.mapSystem);
        console.log('ResourceManagement created:', this.resourceManagement);
        
        console.log('Creating DevMode...');
        this.devMode = new DevMode(this.mapSystem);
        console.log('DevMode created:', this.devMode);
        
        // Connect modules to map system
        this.mapSystem.tabManagement = this.tabManagement;
        this.mapSystem.waveAnimation = this.waveAnimation;
        this.mapSystem.viewerSystem = this.viewerSystem;
        this.mapSystem.cellInteraction = this.cellInteraction;
        this.mapSystem.waterSystem = this.waterSystem;
        this.mapSystem.roadSystem = this.roadSystem;
        this.mapSystem.powerLineSystem = this.powerLineSystem;
        this.mapSystem.proceduralGeneration = this.proceduralGeneration;
        this.mapSystem.utilityFunctions = this.utilityFunctions;
        this.mapSystem.resourceManagement = this.resourceManagement;
        this.mapSystem.devMode = this.devMode;
        
        console.log('Modules connected to map system:');
        console.log('  - tabManagement:', !!this.mapSystem.tabManagement);
        console.log('  - waveAnimation:', !!this.mapSystem.waveAnimation);
        console.log('  - viewerSystem:', !!this.mapSystem.viewerSystem);
        console.log('  - cellInteraction:', !!this.mapSystem.cellInteraction);
        console.log('  - waterSystem:', !!this.mapSystem.waterSystem);
        console.log('  - roadSystem:', !!this.mapSystem.roadSystem);
        console.log('  - powerLineSystem:', !!this.mapSystem.powerLineSystem);
        console.log('  - proceduralGeneration:', !!this.mapSystem.proceduralGeneration);
        console.log('  - utilityFunctions:', !!this.mapSystem.utilityFunctions);
        
        console.log('Setting up event listeners...');
        this.mapSystem.setupEventListeners();
        console.log('Event listeners set up');
        
        // Apply initial builder styling to ensure aspect ratio is maintained
        if (this.mapSystem.currentTab === 'builder' && this.tabManagement) {
            // Use setTimeout to ensure DOM is ready
            setTimeout(() => {
                this.tabManagement.applyBuilderStyling();
            }, 100);
        }
        
        // Initialize power line overlay on page load
        if (this.mapSystem.powerLineSystem) {
            setTimeout(() => {
                if (this.mapSystem.powerLineSystem && this.mapSystem.powerLineSystem.initPowerLineOverlay) {
                    this.mapSystem.powerLineSystem.initPowerLineOverlay();
                    // Rebuild connections if there are any power lines on the map
                    if (this.mapSystem.powerLineSystem.rebuildAllPowerLineConnections) {
                        this.mapSystem.powerLineSystem.rebuildAllPowerLineConnections();
                    }
                }
            }, 1500); // Wait for map to be fully rendered
        }
        
        console.log('Initializing resource management...');
        this.resourceManagement.init();
        console.log('Resource management initialized');
        
        console.log('Setting up rules modal...');
        this.setupRulesModal();
        console.log('Rules modal set up');
        
        console.log('Setting up tutorial modal...');
        this.setupTutorialModal();
        console.log('Tutorial modal set up');
        
        console.log('Initializing version system...');
        this.initializeVersionSystem();
        console.log('Version system initialized');
    }
    
    setupRulesModal() {
        const showRulesBtn = document.getElementById('showRulesBtn');
        const rulesModal = document.getElementById('rulesModal');
        const closeRulesBtn = document.getElementById('closeRulesBtn');
        
        console.log('Rules button elements:', { showRulesBtn, rulesModal, closeRulesBtn });
        console.log('Current tab:', document.body.getAttribute('data-tab'));
        console.log('Player controls display:', document.getElementById('playerControls')?.style.display);
        
        if (showRulesBtn && rulesModal && closeRulesBtn) {
            // Show modal when button is clicked
            showRulesBtn.addEventListener('click', () => {
                rulesModal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            });
            
            // Close modal when X button is clicked
            closeRulesBtn.addEventListener('click', () => {
                rulesModal.style.display = 'none';
                document.body.style.overflow = ''; // Restore scrolling
            });
            
            // Close modal when clicking outside the modal content
            rulesModal.addEventListener('click', (e) => {
                if (e.target === rulesModal) {
                    rulesModal.style.display = 'none';
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && rulesModal.style.display === 'flex') {
                    rulesModal.style.display = 'none';
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
        }
    }
    
    setupTutorialModal() {
        const showTutorialBtn = document.getElementById('showTutorialBtn');
        const tutorialModal = document.getElementById('tutorialModal');
        const closeTutorialBtn = document.getElementById('closeTutorialBtn');
        
        console.log('Tutorial button elements:', { showTutorialBtn, tutorialModal, closeTutorialBtn });
        console.log('Current tab:', document.body.getAttribute('data-tab'));
        console.log('Player controls display:', document.getElementById('playerControls')?.style.display);
        
        if (showTutorialBtn && tutorialModal && closeTutorialBtn) {
            // Show modal when button is clicked
            showTutorialBtn.addEventListener('click', () => {
                tutorialModal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            });
            
            // Close modal when X button is clicked
            closeTutorialBtn.addEventListener('click', () => {
                tutorialModal.style.display = 'none';
                document.body.style.overflow = ''; // Restore scrolling
            });
            
            // Close modal when clicking outside the modal content
            tutorialModal.addEventListener('click', (e) => {
                if (e.target === tutorialModal) {
                    tutorialModal.style.display = 'none';
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
            
            // Close modal with Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && tutorialModal.style.display === 'flex') {
                    tutorialModal.style.display = 'none';
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
        }
    }
    
    initializeVersionSystem() {
        // Initialize version tracking
        this.currentVersion = this.getCurrentVersion();
        this.updateVersionDisplay();
        
        // Make version system globally accessible
        window.versionManager = this;
        
        console.log('Version system initialized with version:', this.currentVersion);
    }
    
    getCurrentVersion() {
        // Try to get version from localStorage, default to 1.0.1
        const storedVersion = localStorage.getItem('cityBuilderVersion');
        if (storedVersion) {
            return storedVersion;
        }
        
        // Default version
        const defaultVersion = '1.0.1';
        localStorage.setItem('cityBuilderVersion', defaultVersion);
        return defaultVersion;
    }
    
    updateVersionDisplay() {
        const versionDisplay = document.getElementById('version-display');
        if (versionDisplay) {
            versionDisplay.textContent = `v${this.currentVersion}`;
        }
    }
    
    incrementVersion(incrementType = 'minor') {
        const versionParts = this.currentVersion.split('.').map(Number);
        let [major, minor, patch] = versionParts;
        
        if (incrementType === 'major') {
            major += 1;
            minor = 0;
            patch = 0;
        } else if (incrementType === 'minor') {
            minor += 1;
            patch = 0;
        } else if (incrementType === 'patch') {
            patch += 1;
        }
        
        this.currentVersion = `${major}.${minor}.${patch}`;
        localStorage.setItem('cityBuilderVersion', this.currentVersion);
        this.updateVersionDisplay();
        
        console.log(`Version incremented to: v${this.currentVersion}`);
        return this.currentVersion;
    }
    
    // Public methods for external version management
    incrementMinor() {
        return this.incrementVersion('minor');
    }
    
    incrementMajor() {
        return this.incrementVersion('major');
    }
    
    incrementPatch() {
        return this.incrementVersion('patch');
    }
    
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing application...');
    try {
        window.app = new MainApplication();
        console.log('Application initialized successfully');
        console.log('Map system:', window.app.mapSystem);
        console.log('Tab management:', window.app.tabManagement);
        
        // Initialize multiplayer
        console.log('Initializing multiplayer...');
        console.log('MapSystem available:', !!window.app.mapSystem);
        try {
            multiplayerIntegration = new SimpleMultiplayerIntegration(window.app.mapSystem);
            window.multiplayerIntegration = multiplayerIntegration; // Make it globally accessible
            console.log('MultiplayerIntegration created:', !!multiplayerIntegration);
            await multiplayerIntegration.initializeMultiplayer();
            console.log('Multiplayer initialized');
            
            // Force show the UI
            console.log('Calling showMultiplayerUI...');
            multiplayerIntegration.showMultiplayerUI();
            console.log('Multiplayer UI shown');
            
            // Multiplayer integration initialized successfully
            console.log('Multiplayer integration initialized successfully');
        } catch (error) {
            console.error('Multiplayer initialization failed:', error);
            console.error('Error stack:', error.stack);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        console.error('Stack trace:', error.stack);
    }
});
