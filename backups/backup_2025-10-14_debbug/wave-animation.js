// Wave Animation System - Ocean wave animation functionality
class WaveAnimation {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    startWaveAnimation() {
        if (this.mapSystem.waveInterval) {
            clearInterval(this.mapSystem.waveInterval);
        }
        
        this.mapSystem.wavePosition = 0;
        this.mapSystem.waveInterval = setInterval(() => {
            this.updateWavePattern();
        }, 100); // Update every 100ms
    }
    
    stopWaveAnimation() {
        if (this.mapSystem.waveInterval) {
            clearInterval(this.mapSystem.waveInterval);
            this.mapSystem.waveInterval = null;
        }
        
        // Clear all wave tiles
        document.querySelectorAll('.wave-tile').forEach(tile => {
            tile.classList.remove('wave-tile');
        });
    }
    
    findOceanCorner() {
        const waterCells = [];
        
        // Find all ocean cells
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'ocean') {
                    waterCells.push({ row, col });
                }
            }
        }
        
        if (waterCells.length === 0) return null;
        
        // Find the corner with the most ocean tiles
        const corners = [
            { corner: 0, row: 0, col: 0 }, // Top-left
            { corner: 1, row: 0, col: this.mapSystem.mapSize.cols - 1 }, // Top-right
            { corner: 2, row: this.mapSystem.mapSize.rows - 1, col: 0 }, // Bottom-left
            { corner: 3, row: this.mapSystem.mapSize.rows - 1, col: this.mapSystem.mapSize.cols - 1 } // Bottom-right
        ];
        
        let bestCorner = 0;
        let maxOceanTiles = 0;
        
        corners.forEach(({ corner, row, col }) => {
            const oceanTiles = waterCells.filter(cell => 
                Math.abs(cell.row - row) + Math.abs(cell.col - col) < 10
            ).length;
            
            if (oceanTiles > maxOceanTiles) {
                maxOceanTiles = oceanTiles;
                bestCorner = corner;
            }
        });
        
        return bestCorner;
    }
    
    calculateOceanBounds(waterCells) {
        if (waterCells.length === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
        
        const rows = waterCells.map(cell => cell.row);
        const cols = waterCells.map(cell => cell.col);
        
        return {
            minRow: Math.min(...rows),
            maxRow: Math.max(...rows),
            minCol: Math.min(...cols),
            maxCol: Math.max(...cols)
        };
    }
    
    updateWavePattern() {
        // Clear existing wave tiles
        document.querySelectorAll('.wave-tile').forEach(tile => {
            tile.classList.remove('wave-tile');
        });
        
        // Find ocean cells
        const waterCells = [];
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'ocean') {
                    waterCells.push({ row, col });
                }
            }
        }
        
        if (waterCells.length === 0) return;
        
        // Get wave tiles
        const waveTiles = this.getWaveTiles(waterCells);
        
        // Apply wave-tile class to wave tiles
        waveTiles.forEach(({ row, col }) => {
            const cell = this.mapSystem.cells[row][col];
            if (cell && cell.element) {
                cell.element.classList.add('wave-tile');
            }
        });
        
        // Update wave position
        this.mapSystem.wavePosition++;
    }
    
    getWaveTiles(waterCells) {
        const waveTiles = [];
        const oceanCorner = this.findOceanCorner();
        
        if (oceanCorner !== null) {
            this.createCornerWave(waveTiles, waterCells, oceanCorner);
        }
        
        return waveTiles;
    }
    
    createCornerWave(waveTiles, waterCells, oceanCorner) {
        const waveSpeed = 2;
        const waveDensity = 0.25;
        const offScreenOffset = 10;
        const totalDistance = this.mapSystem.mapSize.cols + this.mapSystem.mapSize.rows;
        const wavePhase = (this.mapSystem.wavePosition * waveSpeed - offScreenOffset) % totalDistance;
        
        // Determine starting position based on corner
        let startRow, startCol, targetRow, targetCol;
        
        switch (oceanCorner) {
            case 0: // Top-left
                startRow = 1;
                startCol = 1;
                targetRow = Math.floor(this.mapSystem.mapSize.rows * 0.5);
                targetCol = Math.floor(this.mapSystem.mapSize.cols * 0.5);
                break;
            case 1: // Top-right
                startRow = 1;
                startCol = this.mapSystem.mapSize.cols - 1;
                targetRow = Math.floor(this.mapSystem.mapSize.rows * 0.8);
                targetCol = Math.floor(this.mapSystem.mapSize.cols * 0.8);
                break;
            case 2: // Bottom-left
                startRow = this.mapSystem.mapSize.rows - 1;
                startCol = 1;
                targetRow = Math.floor(this.mapSystem.mapSize.rows * 0.7);
                targetCol = Math.floor(this.mapSystem.mapSize.cols * 0.3);
                break;
            case 3: // Bottom-right
                startRow = this.mapSystem.mapSize.rows - 1;
                startCol = this.mapSystem.mapSize.cols - 1;
                targetRow = Math.floor(this.mapSystem.mapSize.rows * 0.5);
                targetCol = Math.floor(this.mapSystem.mapSize.cols * 0.5);
                break;
        }
        
        // Calculate ocean bounds
        const oceanBounds = this.calculateOceanBounds(waterCells);
        const oceanWidth = oceanBounds.maxCol - oceanBounds.minCol;
        const oceanHeight = oceanBounds.maxRow - oceanBounds.minRow;
        const maxDistance = Math.max(oceanWidth, oceanHeight);
        
        // Calculate wave progress
        const waveProgress = wavePhase / totalDistance;
        const waveLength = Math.floor(waveProgress * totalDistance * 1.2);
        
        // Generate wave tiles
        for (let i = 0; i < waveLength; i++) {
            const currentProgress = i / waveLength;
            const waveRow = Math.floor(startRow + (targetRow - startRow) * currentProgress);
            const waveCol = Math.floor(startCol + (targetCol - startCol) * currentProgress);
            
            // Add oscillation for wave effect
            const oscillation = Math.sin(currentProgress * Math.PI * 4) * (oceanWidth * 0.1);
            const thicknessRange = Math.floor(this.mapSystem.mapSize.cols * 0.5);
            
            // Create wave thickness
            for (let thickness = -thicknessRange; thickness <= thicknessRange; thickness++) {
                const checkRow = waveRow;
                const checkCol = waveCol + thickness;
                
                // Check bounds
                if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                    checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                    
                    // Add density variation
                    if (Math.random() < waveDensity) {
                        waveTiles.push({ row: checkRow, col: checkCol });
                    }
                }
            }
        }
    }
}
