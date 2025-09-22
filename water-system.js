// Water System - Water classification, rivers, oceans, lakes
class WaterSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    classifyWaterRegions() {
        this.resetWaterTiles();
        const regions = this.findConnectedWaterRegions();
        
        regions.forEach(region => {
            this.classifyWaterRegion(region);
        });
        
        this.classifyRiversWithParenthesis();
    }
    
    resetWaterTiles() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    cell.class = cell.attribute;
                    this.mapSystem.updateCellVisual(row, col);
                }
            }
        }
    }
    
    findConnectedWaterRegions() {
        const visited = new Set();
        const regions = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute) && 
                    !visited.has(`${row},${col}`)) {
                    const region = [];
                    this.floodFillWater(row, col, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        }
        
        return regions;
    }
    
    floodFillWater(startRow, startCol, visited, region) {
        const stack = [{ row: startRow, col: startCol }];
        
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            if (row < 0 || row >= this.mapSystem.mapSize.rows || 
                col < 0 || col >= this.mapSystem.mapSize.cols) continue;
            
            const cell = this.mapSystem.cells[row][col];
            if (!['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) continue;
            
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
    
    classifyWaterRegion(region) {
        if (region.length === 0) return;
        
        // Count different water types
        const counts = { ocean: 0, lake: 0, river: 0, riverStart: 0, riverEnd: 0 };
        region.forEach(cell => {
            counts[cell.attribute]++;
        });
        
        // Determine the dominant water type
        let dominantType = 'ocean';
        let maxCount = 0;
        
        Object.keys(counts).forEach(type => {
            if (counts[type] > maxCount) {
                maxCount = counts[type];
                dominantType = type;
            }
        });
        
        // Apply classification based on size and type
        if (region.length >= 50) {
            // Large region - likely ocean
            dominantType = 'ocean';
        } else if (region.length >= 10) {
            // Medium region - likely lake
            dominantType = 'lake';
        } else {
            // Small region - keep as river
            dominantType = 'river';
        }
        
        // Update all cells in the region
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = dominantType;
            this.mapSystem.cells[cell.row][cell.col].class = dominantType;
            this.mapSystem.updateCellVisual(cell.row, cell.col);
        });
    }
    
    classifyRiversWithParenthesis() {
        // Find river start and end points
        const riverStarts = [];
        const riverEnds = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'riverStart') {
                    riverStarts.push({ row, col });
                } else if (cell.attribute === 'riverEnd') {
                    riverEnds.push({ row, col });
                }
            }
        }
        
        // Connect river starts to river ends
        riverStarts.forEach(start => {
            let closestEnd = null;
            let minDistance = Infinity;
            
            riverEnds.forEach(end => {
                const distance = Math.abs(start.row - end.row) + Math.abs(start.col - end.col);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnd = end;
                }
            });
            
            if (closestEnd) {
                this.findPathBetweenRiverPoints(start, closestEnd);
            }
        });
    }
    
    findPathBetweenRiverPoints(start, end) {
        const path = [];
        let currentRow = start.row;
        let currentCol = start.col;
        
        // Simple pathfinding - move towards target
        while (currentRow !== end.row || currentCol !== end.col) {
            path.push({ row: currentRow, col: currentCol });
            
            if (currentRow < end.row) {
                currentRow++;
            } else if (currentRow > end.row) {
                currentRow--;
            }
            
            if (currentCol < end.col) {
                currentCol++;
            } else if (currentCol > end.col) {
                currentCol--;
            }
        }
        
        path.push({ row: end.row, col: end.col });
        
        // Update path cells to river
        path.forEach(point => {
            if (point.row >= 0 && point.row < this.mapSystem.mapSize.rows &&
                point.col >= 0 && point.col < this.mapSystem.mapSize.cols) {
                this.mapSystem.cells[point.row][point.col].attribute = 'river';
                this.mapSystem.cells[point.row][point.col].class = 'river';
                this.mapSystem.updateCellVisual(point.row, point.col);
            }
        });
    }
    
    reclassifyWaterAfterRemoval(removedRow, removedCol) {
        const nearbyRegions = this.findWaterRegionsNearRemoval(removedRow, removedCol);
        
        nearbyRegions.forEach(region => {
            this.reclassifyWaterRegion(region);
        });
    }
    
    findWaterRegionsNearRemoval(removedRow, removedCol) {
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
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute) &&
                    !visited.has(`${checkRow},${checkCol}`)) {
                    
                    const region = [];
                    this.floodFillWater(checkRow, checkCol, visited, region);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        });
        
        return regions;
    }
    
    reclassifyWaterRegion(region) {
        if (region.length === 0) return;
        
        // Determine new classification based on size and connections
        let newType = 'river';
        
        if (region.length >= 50) {
            newType = 'ocean';
        } else if (region.length >= 10) {
            newType = 'lake';
        }
        
        // Update all cells in the region
        region.forEach(cell => {
            this.mapSystem.cells[cell.row][cell.col].attribute = newType;
            this.mapSystem.cells[cell.row][cell.col].class = newType;
            this.mapSystem.updateCellVisual(cell.row, cell.col);
        });
    }
    
    isAdjacentToWaterClass(row, col, waterClass) {
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
                if (cell.attribute === waterClass) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    isAdjacentToAnyWater(row, col) {
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
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    hasPowerPlantWaterAccess(row, col) {
        const visited = new Set();
        return this.checkPowerPlantWaterAccess(row, col, visited);
    }
    
    checkPowerPlantWaterAccess(row, col, visited) {
        if (row < 0 || row >= this.mapSystem.mapSize.rows || 
            col < 0 || col >= this.mapSystem.mapSize.cols) {
            return false;
        }
        
        const key = `${row},${col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        const cell = this.mapSystem.cells[row][col];
        
        // Check if this cell is water
        if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
            return true;
        }
        
        // Check adjacent cells within radius
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        
        for (let dir of directions) {
            if (this.checkPowerPlantWaterAccess(row + dir.dr, col + dir.dc, visited)) {
                return true;
            }
        }
        
        return false;
    }
    
    hasIndustrialWaterAccess(row, col) {
        const visited = new Set();
        return this.checkIndustrialWaterAccess(row, col, visited);
    }
    
    checkIndustrialWaterAccess(row, col, visited) {
        if (row < 0 || row >= this.mapSystem.mapSize.rows || 
            col < 0 || col >= this.mapSystem.mapSize.cols) {
            return false;
        }
        
        const key = `${row},${col}`;
        if (visited.has(key)) return false;
        visited.add(key);
        
        const cell = this.mapSystem.cells[row][col];
        
        // Check if this cell is water
        if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
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
}
