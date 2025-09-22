// Road System - Road classification and management
class RoadSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    classifyRoadRegions() {
        this.resetRoadTiles();
        const regions = this.findConnectedRoadRegions();
        
        regions.forEach(region => {
            this.classifyRoadRegion(region);
        });
    }
    
    resetRoadTiles() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute)) {
                    cell.class = cell.attribute;
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }
    }
    
    findConnectedRoadRegions() {
        const visited = new Set();
        const regions = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute) && 
                    !visited.has(`${row},${col}`)) {
                    const region = [];
                    this.floodFillRoad(row, col, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        }
        
        return regions;
    }
    
    floodFillRoad(startRow, startCol, visited, region) {
        const stack = [{ row: startRow, col: startCol }];
        
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            if (row < 0 || row >= this.mapSystem.mapSize.rows || 
                col < 0 || col >= this.mapSystem.mapSize.cols) continue;
            
            const cell = this.mapSystem.cells[row][col];
            if (!['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute)) continue;
            
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
    
    classifyRoadRegion(region) {
        if (region.length === 0) return;
        
        // Count different road types
        const counts = { road: 0, highway: 0, bridge: 0, tunnel: 0 };
        region.forEach(cell => {
            counts[cell.attribute]++;
        });
        
        // Determine the dominant road type
        let dominantType = 'road';
        let maxCount = 0;
        
        Object.keys(counts).forEach(type => {
            if (counts[type] > maxCount) {
                maxCount = counts[type];
                dominantType = type;
            }
        });
        
        // Apply classification based on size and type
        if (region.length >= 20) {
            // Large region - likely highway
            dominantType = 'highway';
        } else if (region.length >= 5) {
            // Medium region - likely road
            dominantType = 'road';
        }
        
        // Update all cells in the region
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = dominantType;
            this.mapSystem.cells[cell.row][cell.col].class = dominantType;
            this.mapSystem.updateCellVisual(cell.row, cell.col);
        });
        
        // Propagate road classes for better connectivity
        this.propagateRoadClasses(region);
    }
    
    propagateRoadClasses(region) {
        // This method can be expanded to improve road connectivity
        // For now, it's a placeholder for future road network optimization
    }
    
    reclassifyRoadAfterRemoval(removedRow, removedCol) {
        const nearbyRegions = this.findRoadRegionsNearRemoval(removedRow, removedCol);
        
        nearbyRegions.forEach(region => {
            this.reclassifyRoadRegion(region);
        });
    }
    
    findRoadRegionsNearRemoval(removedRow, removedCol) {
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
                if (['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute) &&
                    !visited.has(`${checkRow},${checkCol}`)) {
                    
                    const region = [];
                    this.floodFillRoad(checkRow, checkCol, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        });
        
        return regions;
    }
    
    reclassifyRoadRegion(region) {
        if (region.length === 0) return;
        
        // Determine new classification based on size
        let newType = 'road';
        
        if (region.length >= 20) {
            newType = 'highway';
        }
        
        // Update all cells in the region
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = newType;
            this.mapSystem.cells[cell.row][cell.col].class = newType;
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
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToCommercialRoad(row, col) {
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
                if (['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToIndustrialSupplyRoads(row, col) {
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
                if (['road', 'highway', 'bridge', 'tunnel'].includes(cell.attribute)) {
                    // Check if this road connects to industrial areas
                    if (this.hasWoodAndOreSupplyLineAccess(checkRow, checkCol)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    hasWoodAndOreSupplyLineAccess(row, col) {
        // Check if this location has access to wood (forests) and ore (mountains)
        const hasWood = this.isAdjacentToForest(row, col);
        const hasOre = this.isAdjacentToMountain(row, col);
        
        return hasWood && hasOre;
    }
    
    isAdjacentToForest(row, col) {
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
                if (cell.attribute === 'forest') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToMountain(row, col) {
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
                if (cell.attribute === 'mountain') {
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
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'industrial') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToCommercial(row, col) {
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
                if (cell.attribute === 'commercial') {
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
            
            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                
                const cell = this.mapSystem.cells[checkRow][checkCol];
                if (cell.attribute === 'residential') {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    hasExistingResidential() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'residential') {
                    return true;
                }
            }
        }
        return false;
    }
}
