// Utility Functions - Helper functions, validation, and calculations
class UtilityFunctions {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    lightenColor(rgb, factor) {
        return {
            r: Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor)),
            g: Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor)),
            b: Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor))
        };
    }
    
    darkenColor(rgb, factor) {
        return {
            r: Math.max(0, Math.floor(rgb.r * (1 - factor))),
            g: Math.max(0, Math.floor(rgb.g * (1 - factor))),
            b: Math.max(0, Math.floor(rgb.b * (1 - factor)))
        };
    }
    
    isWithinWaterRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    isWithinForestRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'forest') {
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    isWithinDesertRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'desert') {
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    handleKeyboard(e) {
        // Handle keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.mapSystem.saveMap();
                    break;
                case 'o':
                    e.preventDefault();
                    document.getElementById('loadFile').click();
                    break;
                case 'n':
                    e.preventDefault();
                    this.mapSystem.clearMap();
                    break;
                case 'g':
                    e.preventDefault();
                    this.mapSystem.generateProceduralMap();
                    break;
            }
        }
        
        // Handle viewer mode shortcuts
        if (this.mapSystem.currentTab === 'viewer') {
            switch (e.key) {
                case '+':
                case '=':
                    e.preventDefault();
                    this.mapSystem.zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    this.mapSystem.zoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    this.mapSystem.viewerZoom = 1;
                    this.mapSystem.viewerPanX = 0;
                    this.mapSystem.viewerPanY = 0;
                    this.mapSystem.applyZoomAndPan();
                    break;
            }
        }
    }
    
    saveMap() {
        console.log('UtilityFunctions saveMap called');
        const mapData = {
            mapSize: this.mapSystem.mapSize,
            cells: this.mapSystem.cells.map(row => 
                row.map(cell => ({
                    attribute: cell.attribute,
                    class: cell.class
                }))
            ),
            timestamp: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(mapData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `city-map-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        console.log('Map saved successfully');
    }
    
    loadMap() {
        console.log('UtilityFunctions loadMap called');
        const input = document.getElementById('fileInput');
        if (input) {
            input.click();
            console.log('File input clicked');
        } else {
            console.error('Load file input not found');
        }
    }
    
    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const mapData = JSON.parse(event.target.result);
                this.loadMapData(mapData);
            } catch (error) {
                console.error('Error loading map:', error);
                alert('Error loading map file. Please check the file format.');
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        e.target.value = '';
    }
    
    loadMapData(mapData) {
        // Validate map data
        if (!mapData.mapSize || !mapData.cells) {
            throw new Error('Invalid map data format');
        }
        
        // Update map size if different
        if (mapData.mapSize.rows !== this.mapSystem.mapSize.rows || 
            mapData.mapSize.cols !== this.mapSystem.mapSize.cols) {
            this.mapSystem.mapSize = mapData.mapSize;
            this.mapSystem.createMap();
        }
        
        // Load cell data
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                if (mapData.cells[row] && mapData.cells[row][col]) {
                    const cellData = mapData.cells[row][col];
                    this.mapSystem.cells[row][col].attribute = cellData.attribute;
                    this.mapSystem.cells[row][col].class = cellData.class;
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }
        
        // Update stats
        this.mapSystem.updateStats();
        
        // Apply art mode if in viewer tab
        if (this.mapSystem.currentTab === 'viewer') {
            this.mapSystem.applyArtMode();
        }
    }
    
    updateRiverConnections() {
        // This method can be expanded for river connection logic
        // Currently handled by water system
    }
}
