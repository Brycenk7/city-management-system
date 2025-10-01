// Power Line System - Power line classification and management
class PowerLineSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    classifyPowerLineRegions() {
        this.resetPowerLineTiles();
        const regions = this.findConnectedPowerLineRegions();
        
        regions.forEach(region => {
            this.classifyPowerLineRegion(region);
        });
    }
    
    resetPowerLineTiles() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['powerLines'].includes(cell.attribute)) {
                    cell.class = cell.attribute;
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }
    }
    
    findConnectedPowerLineRegions() {
        const visited = new Set();
        const regions = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['powerLines'].includes(cell.attribute) && 
                    !visited.has(`${row},${col}`)) {
                    const region = [];
                    this.floodFillPowerLines(row, col, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        }
        
        return regions;
    }
    
    floodFillPowerLines(startRow, startCol, visited, region) {
        const stack = [{ row: startRow, col: startCol }];
        
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            if (row < 0 || row >= this.mapSystem.mapSize.rows || 
                col < 0 || col >= this.mapSystem.mapSize.cols) continue;
            
            const cell = this.mapSystem.cells[row][col];
            if (!['powerLines'].includes(cell.attribute)) continue;
            
            visited.add(key);
            region.push({ row, col, attribute: cell.attribute });
            
            // Add adjacent cells to stack
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            directions.forEach(dir => {
                stack.push({ row: row + dir.dr, col: col + dir.dc });
            });
        }
    }
    
    classifyPowerLineRegion(region) {
        if (region.length === 0) return;
        
        // Power lines maintain their classification
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = 'powerLines';
            this.mapSystem.cells[cell.row][cell.col].class = 'powerLines';
            this.mapSystem.updateCellVisual(cell.row, cell.col);
        });
    }
    
    reclassifyPowerLineAfterRemoval(removedRow, removedCol) {
        const nearbyRegions = this.findPowerLineRegionsNearRemoval(removedRow, removedCol);
        
        nearbyRegions.forEach(region => {
            this.reclassifyPowerLineRegion(region);
        });
    }
    
    findPowerLineRegionsNearRemoval(removedRow, removedCol) {
        const regions = [];
        const visited = new Set();
        
        // Check 8 surrounding cells
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        
        directions.forEach(dir => {
            const checkRow = removedRow + dir.dr;
            const checkCol = removedCol + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (['powerLines'].includes(cell.attribute) &&
                    !visited.has(`${checkRow},${checkCol}`)) {
                    
                    const region = [];
                    this.floodFillPowerLines(checkRow, checkCol, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        });
        
        return regions;
    }
    
    reclassifyPowerLineRegion(region) {
        if (region.length === 0) return;
        
        // Power lines maintain their classification
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = 'powerLines';
            this.mapSystem.cells[cell.row][cell.col].class = 'powerLines';
            this.mapSystem.updateCellVisual(cell.row, cell.col);
        });
    }
    
    isAdjacentToPowerPlantOrPowerLines(row, col) {
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            const checkRow = row + dir.dr;
            const checkCol = col + dir.dc;
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (['powerPlant', 'powerLines'].includes(cell.attribute)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isWithinPowerPlantOrPowerLinesRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (['powerPlant', 'powerLines'].includes(cell.attribute)) {
                    // Use proper radius calculation (max of row and col differences)
                    const distance = Math.max(Math.abs(row - r), Math.abs(col - c));
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    // Power line specific validation methods
    isValidPowerLinePlacement(row, col) {
        // Power lines must be adjacent to power plants or other power lines
        return this.isAdjacentToPowerPlantOrPowerLines(row, col);
    }
    
    // Check if a building is within power range
    isWithinPowerRange(row, col, maxDistance = 3) {
        return this.isWithinPowerPlantOrPowerLinesRadius(row, col, maxDistance);
    }
    
    // Get power line network coverage
    getPowerLineCoverage() {
        const coverage = {
            totalCells: this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols,
            poweredCells: 0,
            powerPlants: 0,
            powerLines: 0
        };
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                
                if (cell.attribute === 'powerPlant') {
                    coverage.powerPlants++;
                } else if (cell.attribute === 'powerLines') {
                    coverage.powerLines++;
                }
                
                // Check if this cell is within power range
                if (this.isWithinPowerRange(row, col)) {
                    coverage.poweredCells++;
                }
            }
        }
        
        return coverage;
    }
}
