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
        
        console.log('Creating ProceduralGeneration...');
        this.proceduralGeneration = new ProceduralGeneration(this.mapSystem);
        console.log('ProceduralGeneration created:', this.proceduralGeneration);
        
        console.log('Creating UtilityFunctions...');
        this.utilityFunctions = new UtilityFunctions(this.mapSystem);
        console.log('UtilityFunctions created:', this.utilityFunctions);
        
        console.log('Creating ResourceManagement...');
        this.resourceManagement = new ResourceManagement(this.mapSystem);
        console.log('ResourceManagement created:', this.resourceManagement);
        
        // Tool system removed
        
        // Connect modules to map system
        this.mapSystem.tabManagement = this.tabManagement;
        this.mapSystem.waveAnimation = this.waveAnimation;
        this.mapSystem.viewerSystem = this.viewerSystem;
        this.mapSystem.cellInteraction = this.cellInteraction;
        this.mapSystem.waterSystem = this.waterSystem;
        this.mapSystem.roadSystem = this.roadSystem;
        this.mapSystem.proceduralGeneration = this.proceduralGeneration;
        this.mapSystem.utilityFunctions = this.utilityFunctions;
        this.mapSystem.resourceManagement = this.resourceManagement;
        // Tool system removed
        
        console.log('Modules connected to map system:');
        console.log('  - tabManagement:', !!this.mapSystem.tabManagement);
        console.log('  - waveAnimation:', !!this.mapSystem.waveAnimation);
        console.log('  - viewerSystem:', !!this.mapSystem.viewerSystem);
        console.log('  - cellInteraction:', !!this.mapSystem.cellInteraction);
        console.log('  - waterSystem:', !!this.mapSystem.waterSystem);
        console.log('  - roadSystem:', !!this.mapSystem.roadSystem);
        console.log('  - proceduralGeneration:', !!this.mapSystem.proceduralGeneration);
        console.log('  - utilityFunctions:', !!this.mapSystem.utilityFunctions);
        
        console.log('Setting up event listeners...');
        this.setupGlobalEventListeners();
        this.mapSystem.setupEventListeners();
        console.log('Event listeners set up');
        
        console.log('Initializing resource management...');
        this.resourceManagement.init();
        console.log('Resource management initialized');
        
        // Tool system removed
    }
    
    setupGlobalEventListeners() {
        // Note: Keyboard shortcuts are now handled by MapSystem.setupEventListeners()
        
        // Note: File loading is now handled by MapSystem.setupEventListeners()
        
        // Note: Map controls are now handled by MapSystem.setupEventListeners()
        
        // Note: Viewer controls are now handled by MapSystem.setupEventListeners()
        
        // Note: Art mode toggles are now handled by MapSystem.setupEventListeners()
        
        // Note: Player mode buttons are now handled by MapSystem.setupEventListeners()
        
        // Note: Tab switching is now handled by MapSystem.setupEventListeners()
        
        // Note: Tool selection, global mouse events, and window resize are now handled by MapSystem.setupEventListeners()
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
        try {
            multiplayerIntegration = new SimpleMultiplayerIntegration(window.app.mapSystem);
            window.multiplayerIntegration = multiplayerIntegration; // Make it globally accessible
            console.log('MultiplayerIntegration created');
            await multiplayerIntegration.initializeMultiplayer();
            console.log('Multiplayer initialized');
            multiplayerIntegration.showMultiplayerUI();
            console.log('Multiplayer UI shown');
        } catch (error) {
            console.error('Multiplayer initialization failed:', error);
        }
    } catch (error) {
        console.error('Error initializing application:', error);
        console.error('Stack trace:', error.stack);
    }
});
