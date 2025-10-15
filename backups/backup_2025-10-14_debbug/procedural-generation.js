// Procedural Generation - Map generation algorithms
class ProceduralGeneration {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    generateProceduralMap() {
        console.log('ProceduralGeneration generateProceduralMap called');
        // Clear existing map
        this.mapSystem.clearMap();
        
        // Generate base terrain
        this.createGrasslandBase();
        
        // Generate water features first (ocean, lake)
        const oceanInfo = this.generateWaterFeatures();
        
        // Generate mountains second (avoiding water areas)
        this.generateMountains(oceanInfo);
        
        // Generate forests third (avoiding mountains and water)
        this.generateForests();
        
        // Update all cell visuals
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                this.mapSystem.updateCellVisual(row, col);
            }
        }
        
        // Note: Art mode is not applied during generation to avoid wave animation interference
        
        // Update stats
        this.mapSystem.updateStats();
        console.log('Procedural map generation completed');
    }
    
    createGrasslandBase() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                this.mapSystem.cells[row][col].attribute = 'grassland';
                this.mapSystem.cells[row][col].class = 'grassland';
            }
        }
    }
    
    generateForests() {
        console.log('Starting forest generation...');
        
        
        const totalTiles = this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols;
        const targetForestTiles = Math.floor(totalTiles * 0.06); // 6% of map
        
        console.log(`Target: ${targetForestTiles} forest tiles in connected groupings`);
        
        let placedForestTiles = 0;
        let attempts = 0;
        const maxAttempts = targetForestTiles * 5; // Prevent infinite loops
        
        while (placedForestTiles < targetForestTiles && attempts < maxAttempts) {
            attempts++;
            
            // Find a random starting location
            const row = Math.floor(Math.random() * this.mapSystem.mapSize.rows);
            const col = Math.floor(Math.random() * this.mapSystem.mapSize.cols);
            
            // Check if this location is available (grassland) and not too close to mountains/water
            if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                !this.isWithinMountainRadius(row, col, 3) && 
                !this.isWithinLakeRadius(row, col, 2) && // 2 tiles from lakes
                !this.isWithinRiverRadius(row, col, 3) &&
                !this.isWithinOceanRadius(row, col, 4)) { // 4 tiles from ocean, 2 from lakes
                const groupingSize = this.createConnectedForestGrouping(row, col, targetForestTiles - placedForestTiles);
                if (groupingSize > 0) {
                    placedForestTiles += groupingSize;
                    console.log(`Placed forest grouping of ${groupingSize} tiles at (${row}, ${col}). Total: ${placedForestTiles}/${targetForestTiles}`);
                }
            }
        }
        
        console.log(`Forest generation complete. Placed ${placedForestTiles} forest tiles.`);
    }
    
    isWithinMountainRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                if (this.mapSystem.cells[r][c].attribute === 'mountain') {
                    return true;
                }
            }
        }
        return false;
    }
    
    isWithinWaterRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'water' || cell.attribute === 'ocean' || cell.attribute === 'lake' || cell.attribute === 'river') {
                    return true;
                }
            }
        }
        return false;
    }
    
    isWithinLakeRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'water' && cell.class === 'lake') {
                    return true;
                }
            }
        }
        return false;
    }
    
    isWithinOceanRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'water' && cell.class === 'ocean') {
                    return true;
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
                    return true;
                }
            }
        }
        return false;
    }
    
    isWithinRiverRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'water' && cell.class === 'river') {
                    return true;
                }
            }
        }
        return false;
    }
    
    createConnectedForestGrouping(startRow, startCol, remainingTiles) {
        const maxGroupingSize = Math.min(8, remainingTiles); // Increased back to 8 tiles for better clumps
        const targetSize = 3 + Math.floor(Math.random() * (maxGroupingSize - 2)); // 3-8 tiles (minimum 3 for circular shape)
        
        const forestTiles = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        
        // Use flood-fill to create a connected forest grouping
        while (forestTiles.length < targetSize && queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check bounds
            if (current.row < 0 || current.row >= this.mapSystem.mapSize.rows ||
                current.col < 0 || current.col >= this.mapSystem.mapSize.cols) {
                continue;
            }
            
            // Check if this cell is grassland and not too close to mountains or water
            if (this.mapSystem.cells[current.row][current.col].attribute !== 'grassland' || 
                this.isWithinMountainRadius(current.row, current.col, 3) ||
                this.isWithinLakeRadius(current.row, current.col, 2) || // 2 tiles from lakes
                this.isWithinRiverRadius(current.row, current.col, 3) ||
                this.isWithinOceanRadius(current.row, current.col, 4)) { // 4 tiles from ocean, 2 from lakes
                continue;
            }
            
            // Add this tile to forest grouping
            forestTiles.push(current);
            
            // Add adjacent cells to queue for expansion
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            directions.forEach(dir => {
                queue.push({ row: current.row + dir.dr, col: current.col + dir.dc });
            });
        }
        
        // Apply forest to tiles
        forestTiles.forEach(tile => {
            this.mapSystem.cells[tile.row][tile.col].attribute = 'forest';
            this.mapSystem.cells[tile.row][tile.col].class = 'forest';
        });
        
        return forestTiles.length;
    }
    
    generateMountains(oceanInfo) {
        console.log('Starting mountain generation...');
        
        // Generate 2-3 linear mountain ranges
        const numRanges = 2 + Math.floor(Math.random() * 2); // 2-3 ranges
        console.log(`Creating ${numRanges} linear mountain ranges`);
        
        let placedMountainTiles = 0;
        
        for (let i = 0; i < numRanges; i++) {
            // Find a starting location on edges/corners, avoiding ocean side
            const location = this.findEdgeMountainLocation(oceanInfo);
            
            if (location) {
                const rangeSize = this.createMountainRange(location.row, location.col, location.type);
                placedMountainTiles += rangeSize;
                console.log(`Created mountain range ${i + 1}/${numRanges} with ${rangeSize} tiles at (${location.row}, ${location.col}) - ${location.type}`);
            } else {
                // If no edge location found, try random location
                const row = Math.floor(Math.random() * this.mapSystem.mapSize.rows);
                const col = Math.floor(Math.random() * this.mapSystem.mapSize.cols);
                
                if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                    !this.isWithinWaterRadius(row, col, 4)) { // Avoid water within 4 tiles
                    const rangeSize = this.createMountainRange(row, col, 'random');
                    placedMountainTiles += rangeSize;
                    console.log(`Created mountain range ${i + 1}/${numRanges} with ${rangeSize} tiles at (${row}, ${col}) - random fallback`);
                } else {
                    // If location is not available, try again
                    i--; // Decrement to retry this range
                }
            }
        }
        
        console.log(`Mountain generation complete. Placed ${placedMountainTiles} mountain tiles in ${numRanges} linear ranges.`);
    }
    
    findEdgeMountainLocation(oceanInfo) {
        const edgeLocations = [];
        
        // Define edge positions (avoiding ocean side)
        const oceanCorner = oceanInfo ? (oceanInfo.corner !== undefined ? oceanInfo.corner : oceanInfo.edge) : -1;
        
        // Top edge (avoid top corners if ocean is there)
        if (oceanCorner !== 0 && oceanCorner !== 1) {
            for (let col = 5; col < this.mapSystem.mapSize.cols - 5; col += 10) {
                edgeLocations.push({ row: 2, col, type: 'top' });
            }
        }
        
        // Bottom edge (avoid bottom corners if ocean is there)
        if (oceanCorner !== 2 && oceanCorner !== 3) {
            for (let col = 5; col < this.mapSystem.mapSize.cols - 5; col += 10) {
                edgeLocations.push({ row: this.mapSystem.mapSize.rows - 3, col, type: 'bottom' });
            }
        }
        
        // Left edge (avoid left corners if ocean is there)
        if (oceanCorner !== 0 && oceanCorner !== 3) {
            for (let row = 5; row < this.mapSystem.mapSize.rows - 5; row += 10) {
                edgeLocations.push({ row, col: 2, type: 'left' });
            }
        }
        
        // Right edge (avoid right corners if ocean is there)
        if (oceanCorner !== 1 && oceanCorner !== 2) {
            for (let row = 5; row < this.mapSystem.mapSize.rows - 5; row += 10) {
                edgeLocations.push({ row, col: this.mapSystem.mapSize.cols - 3, type: 'right' });
            }
        }
        
        // Shuffle and find first suitable location
        const shuffled = edgeLocations.sort(() => Math.random() - 0.5);
        
        for (const location of shuffled) {
            if (this.mapSystem.cells[location.row][location.col].attribute === 'grassland' &&
                !this.isWithinWaterRadius(location.row, location.col, 4)) {
                return location;
            }
        }
        
        return null;
    }
    
    createMountainRange(startRow, startCol, rangeType) {
        const targetSize = 70 + Math.floor(Math.random() * 21); // 70-90 tiles total
        console.log(`Creating clumpy mountain range of ${targetSize} tiles at (${startRow}, ${startCol}) - ${rangeType}`);
        
        const mountainTiles = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        
        // Calculate center of map for directional growth
        const centerRow = Math.floor(this.mapSystem.mapSize.rows / 2);
        const centerCol = Math.floor(this.mapSystem.mapSize.cols / 2);
        
        // Use flood-fill to create a clumpy mountain range
        while (mountainTiles.length < targetSize && queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check bounds
            if (current.row < 0 || current.row >= this.mapSystem.mapSize.rows ||
                current.col < 0 || current.col >= this.mapSystem.mapSize.cols) {
                continue;
            }
            
            // Check if this cell is grassland and not near water
            if (this.mapSystem.cells[current.row][current.col].attribute !== 'grassland' ||
                this.isWithinWaterRadius(current.row, current.col, 4)) { // Avoid water within 4 tiles
                continue;
            }
            
            // Add this tile to mountain range
            mountainTiles.push(current);
            this.mapSystem.cells[current.row][current.col].attribute = 'mountain';
            this.mapSystem.cells[current.row][current.col].class = 'mountain';
            
            // Add adjacent tiles to queue with clumpy growth pattern
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
            ];
            
            // Shuffle directions for more jagged growth
            const shuffledDirections = directions.sort(() => Math.random() - 0.5);
            
            for (const dir of shuffledDirections) {
                // 20% chance to skip this direction entirely for jaggedness
                if (Math.random() < 0.2) continue;
                
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                const newKey = `${newRow},${newCol}`;
                
                if (!visited.has(newKey)) {
                    // Calculate distance from edge to center for this direction
                    const distanceFromEdge = this.calculateDistanceFromEdge(newRow, newCol);
                    const distanceFromCenter = Math.abs(newRow - centerRow) + Math.abs(newCol - centerCol);
                    
                    // Higher probability to grow toward center (away from edges) for clumpy effect
                    let expansionProbability = 0.6; // Base probability (reduced for more jaggedness)
                    
                    // Increase probability if moving toward center
                    if (distanceFromCenter < (Math.abs(current.row - centerRow) + Math.abs(current.col - centerCol))) {
                        expansionProbability = 0.8; // Higher probability for inward growth
                    }
                    
                    // Decrease probability if moving further from edge (to prevent too much inward growth)
                    if (distanceFromEdge > 2) {
                        expansionProbability *= 0.7; // More aggressive reduction for jaggedness
                    }
                    
                    // Add jaggedness factors
                    const jaggednessFactor = Math.sin((newRow + newCol) * 0.5) * 0.2; // Sine wave jaggedness
                    const randomJaggedness = (Math.random() - 0.5) * 0.3; // Random jaggedness
                    const directionJaggedness = Math.random() < 0.3 ? 0.4 : 0; // Occasional high probability
                    
                    expansionProbability += jaggednessFactor + randomJaggedness + directionJaggedness;
                    expansionProbability = Math.max(0.1, Math.min(0.9, expansionProbability)); // Clamp between 0.1 and 0.9
                    
                    // Add some randomness to make it less linear
                    if (Math.random() < expansionProbability) {
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        return mountainTiles.length;
    }
    
    calculateDistanceFromEdge(row, col) {
        const topDistance = row;
        const bottomDistance = this.mapSystem.mapSize.rows - 1 - row;
        const leftDistance = col;
        const rightDistance = this.mapSystem.mapSize.cols - 1 - col;
        
        return Math.min(topDistance, bottomDistance, leftDistance, rightDistance);
    }
    
    generateWaterFeatures() {
        console.log('Starting water feature generation...');
        
        // Step 1: Generate large ocean along map edge (750+ tiles)
        const oceanInfo = this.generateLargeOcean();
        if (!oceanInfo) {
            console.log('Could not generate ocean');
            return null;
        }
        
        console.log('Large ocean generated:', oceanInfo);
        
        // Step 2: Generate lakes on opposite side of ocean
        this.generateLakesOppositeOcean(oceanInfo);
        console.log('Lakes generated opposite to ocean');
        
        // Step 3: Classify all water regions
        this.classifyWaterRegions();
        console.log('Water regions classified');
        
        console.log('Water feature generation complete');
        return oceanInfo;
    }
    
    classifyWaterRegions() {
        // First, reset all water tiles to basic 'water' type
        this.resetWaterTiles();
        
        // Find all connected water regions
        const waterRegions = this.findConnectedWaterRegions();
        
        // Classify each region
        waterRegions.forEach(region => {
            this.classifyWaterRegion(region);
        });
        
        // Find and classify rivers using parenthesis logic
        this.classifyRiversWithParenthesis();
    }
    
    resetWaterTiles() {
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                if (this.mapSystem.cells[row][col].attribute === 'water' && 
                    (this.mapSystem.cells[row][col].class === 'ocean' || 
                     this.mapSystem.cells[row][col].class === 'river')) {
                    this.mapSystem.cells[row][col].class = 'water';
                }
                // Keep lake class intact - don't reset it
            }
        }
    }
    
    findConnectedWaterRegions() {
        const visited = new Set();
        const regions = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                if (this.mapSystem.cells[row][col].attribute === 'water' && !visited.has(`${row},${col}`)) {
                    const region = this.floodFillWaterRegion(row, col, visited);
                    if (region.length > 0) {
                        regions.push(region);
                    }
                }
            }
        }
        
        return regions;
    }
    
    floodFillWaterRegion(startRow, startCol, visited) {
        const region = [];
        const stack = [{ row: startRow, col: startCol }];
        
        while (stack.length > 0) {
            const { row, col } = stack.pop();
            const key = `${row},${col}`;
            
            if (visited.has(key)) continue;
            if (row < 0 || row >= this.mapSystem.mapSize.rows || 
                col < 0 || col >= this.mapSystem.mapSize.cols) continue;
            
            if (this.mapSystem.cells[row][col].attribute !== 'water') continue;
            
            visited.add(key);
            region.push({ row, col });
            
            // Add adjacent cells
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            directions.forEach(dir => {
                stack.push({ row: row + dir.dr, col: col + dir.dc });
            });
        }
        
        return region;
    }
    
    classifyWaterRegion(region) {
        if (region.length === 0) return;
        
        // Check if any tile in the region is already classified as a lake
        const hasExistingLake = region.some(tile => 
            this.mapSystem.cells[tile.row][tile.col].class === 'lake'
        );
        
        // If it's already a lake, keep it as a lake
        if (hasExistingLake) {
            region.forEach(tile => {
                this.mapSystem.cells[tile.row][tile.col].class = 'lake';
            });
            return;
        }
        
        // Determine if this is an ocean or lake based on size and position
        const isLarge = region.length > 100;
        const isNearEdge = region.some(tile => 
            tile.row === 0 || tile.row === this.mapSystem.mapSize.rows - 1 ||
            tile.col === 0 || tile.col === this.mapSystem.mapSize.cols - 1
        );
        
        let waterType = 'water';
        if (isLarge && isNearEdge) {
            waterType = 'ocean';
        } else if (isLarge) {
            waterType = 'lake';
        }
        
        // Apply the classification to all tiles in the region
        region.forEach(tile => {
            this.mapSystem.cells[tile.row][tile.col].class = waterType;
        });
    }
    
    classifyRiversWithParenthesis() {
        // This is a simplified version - in the original it was more complex
        // For now, we'll just ensure river start/end points are properly classified
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'riverStart') {
                    cell.class = 'riverStart';
                } else if (cell.attribute === 'riverEnd') {
                    cell.class = 'riverEnd';
                }
            }
        }
    }
    
    generateLargeOcean() {
        console.log('Generating ocean building outward from corner...');
        
        // Choose a random corner (0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left)
        const corner = Math.floor(Math.random() * 4);
        console.log(`Generating ocean from corner ${corner} (0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left)`);
        
        let oceanTiles = [];
        const targetSize = 800 + Math.floor(Math.random() * 500); // 800-1300 tiles
        
        // Start with a small area in the corner and build outward
        if (corner === 0) { // Top-left corner
            // Create a small initial area in the corner
            for (let row = 0; row < 12; row++) {
                for (let col = 0; col < 12; col++) {
                    if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                        !this.isWithinMountainRadius(row, col, 3)) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        } else if (corner === 1) { // Top-right corner
            // Create a small initial area in the corner
            for (let row = 0; row < 12; row++) {
                for (let col = this.mapSystem.mapSize.cols - 12; col < this.mapSystem.mapSize.cols; col++) {
                    if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                        !this.isWithinMountainRadius(row, col, 3)) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        } else if (corner === 2) { // Bottom-right corner
            // Create a small initial area in the corner
            for (let row = this.mapSystem.mapSize.rows - 12; row < this.mapSystem.mapSize.rows; row++) {
                for (let col = this.mapSystem.mapSize.cols - 12; col < this.mapSystem.mapSize.cols; col++) {
                    if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                        !this.isWithinMountainRadius(row, col, 3)) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        } else if (corner === 3) { // Bottom-left corner
            // Create a small initial area in the corner
            for (let row = this.mapSystem.mapSize.rows - 12; row < this.mapSystem.mapSize.rows; row++) {
                for (let col = 0; col < 12; col++) {
                    if (this.mapSystem.cells[row][col].attribute === 'grassland' && 
                        !this.isWithinMountainRadius(row, col, 3)) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        }
        
        // Expand the ocean outward from the corner to reach target size
        this.expandOceanFromCorner(oceanTiles, targetSize, corner);
        
        console.log(`Ocean generation complete. Created ${oceanTiles.length} ocean tiles.`);
        
        return {
            corner,
            edge: corner, // Add edge property for compatibility
            tiles: oceanTiles,
            size: oceanTiles.length
        };
    }
    
    expandOceanFromCorner(oceanTiles, targetSize, corner) {
        console.log(`Expanding ocean from corner ${corner} to target ${targetSize} tiles...`);
        
        const visited = new Set();
        const queue = [...oceanTiles];
        
        // Mark initial ocean tiles as visited
        oceanTiles.forEach(tile => {
            visited.add(`${tile.row},${tile.col}`);
        });
        
        // Use flood-fill to expand ocean outward from corner with directional bias
        while (oceanTiles.length < targetSize && queue.length > 0) {
            const current = queue.shift();
            
            // Add adjacent tiles to queue with directional bias based on corner
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
            ];
            
            for (const dir of directions) {
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                const newKey = `${newRow},${newCol}`;
                
                if (!visited.has(newKey) && 
                    newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                    newCol >= 0 && newCol < this.mapSystem.mapSize.cols &&
                    this.mapSystem.cells[newRow][newCol].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(newRow, newCol, 3)) {
                    
                    // Add directional bias based on corner with more randomness for jagged edges
                    let expansionProbability = 0.4; // Even lower base probability for more jagged shape
                    
                    // Add more randomness to make edges more irregular and jagged
                    const randomFactor = 0.2 + Math.random() * 0.4; // 0.2 to 0.6 random factor (increased)
                    expansionProbability += randomFactor;
                    
                    // Add additional jaggedness based on position
                    const jaggednessFactor = Math.sin((newRow + newCol) * 0.3) * 0.1; // Sine wave for jaggedness
                    expansionProbability += jaggednessFactor;
                    
                    if (corner === 0) { // Top-left corner
                        if (dir.dr >= 0 && dir.dc >= 0) expansionProbability = 0.6 + randomFactor + jaggednessFactor; // Prefer down and right
                    } else if (corner === 1) { // Top-right corner
                        if (dir.dr >= 0 && dir.dc <= 0) expansionProbability = 0.6 + randomFactor + jaggednessFactor; // Prefer down and left
                    } else if (corner === 2) { // Bottom-right corner
                        if (dir.dr <= 0 && dir.dc <= 0) expansionProbability = 0.6 + randomFactor + jaggednessFactor; // Prefer up and left
                    } else if (corner === 3) { // Bottom-left corner
                        if (dir.dr <= 0 && dir.dc >= 0) expansionProbability = 0.6 + randomFactor + jaggednessFactor; // Prefer up and right
                    }
                    
                    // Add distance-based probability variation for more natural edges
                    const distanceFromCorner = Math.abs(newRow - (corner === 0 || corner === 3 ? 0 : this.mapSystem.mapSize.rows - 1)) + 
                                             Math.abs(newCol - (corner === 0 || corner === 1 ? 0 : this.mapSystem.mapSize.cols - 1));
                    
                    // More complex distance-based variation for jaggedness
                    if (distanceFromCorner > 15) {
                        expansionProbability *= 0.7; // Reduce probability far from corner
                    }
                    if (distanceFromCorner > 30) {
                        expansionProbability *= 0.5; // Further reduce very far from corner
                    }
                    
                    // Add some noise for extra jaggedness
                    const noiseFactor = (Math.random() - 0.5) * 0.2; // -0.1 to 0.1
                    expansionProbability += noiseFactor;
                    
                    if (Math.random() < expansionProbability) {
                        this.mapSystem.cells[newRow][newCol].attribute = 'water';
                        this.mapSystem.cells[newRow][newCol].class = 'ocean';
                        oceanTiles.push({ row: newRow, col: newCol });
                        visited.add(newKey);
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        // Fill any remaining grassland holes within the ocean area for solid water
        this.fillOceanHolesSelectively(oceanTiles, corner);
        
        console.log(`Ocean expansion complete. Total ocean tiles: ${oceanTiles.length}`);
    }
    
    fillOceanHoles(oceanTiles, corner) {
        console.log('Filling holes within ocean area...');
        
        // Find the bounding box of the ocean
        let minRow = Math.min(...oceanTiles.map(t => t.row));
        let maxRow = Math.max(...oceanTiles.map(t => t.row));
        let minCol = Math.min(...oceanTiles.map(t => t.col));
        let maxCol = Math.max(...oceanTiles.map(t => t.col));
        
        // Fill any grassland tiles within the ocean bounding box
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                if (this.mapSystem.cells[row][col].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(row, col, 3)) {
                    
                    // Check if this grassland is surrounded by ocean
                    let oceanNeighbors = 0;
                    const directions = [
                        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                        { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
                    ];
                    
                    for (const dir of directions) {
                        const checkRow = row + dir.dr;
                        const checkCol = col + dir.dc;
                        
                        if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                            checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols &&
                            this.mapSystem.cells[checkRow][checkCol].attribute === 'water' &&
                            this.mapSystem.cells[checkRow][checkCol].class === 'ocean') {
                            oceanNeighbors++;
                        }
                    }
                    
                    // If surrounded by at least 2 ocean tiles, fill it
                    if (oceanNeighbors >= 2) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        }
        
        console.log(`Ocean holes filled. New total: ${oceanTiles.length} tiles`);
    }
    
    fillOceanHolesSelectively(oceanTiles, corner) {
        console.log('Selectively filling ocean holes...');
        
        // Find the bounding box of the ocean
        let minRow = Math.min(...oceanTiles.map(t => t.row));
        let maxRow = Math.max(...oceanTiles.map(t => t.row));
        let minCol = Math.min(...oceanTiles.map(t => t.col));
        let maxCol = Math.max(...oceanTiles.map(t => t.col));
        
        // Multiple passes to catch all grassland patches within ocean
        let filledAny = true;
        let pass = 0;
        const maxPasses = 3;
        
        while (filledAny && pass < maxPasses) {
            filledAny = false;
            pass++;
            console.log(`Ocean hole filling pass ${pass}...`);
            
            // Fill holes that are surrounded by ocean (more aggressive)
            for (let row = minRow + 1; row <= maxRow - 1; row++) {
                for (let col = minCol + 1; col <= maxCol - 1; col++) {
                    if (this.mapSystem.cells[row][col].attribute === 'grassland' &&
                        !this.isWithinMountainRadius(row, col, 3)) {
                        
                        // Check if this grassland is surrounded by ocean
                        let oceanNeighbors = 0;
                        const directions = [
                            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                            { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                            { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
                        ];
                        
                        for (const dir of directions) {
                            const checkRow = row + dir.dr;
                            const checkCol = col + dir.dc;
                            
                            if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                                checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols &&
                                this.mapSystem.cells[checkRow][checkCol].attribute === 'water' &&
                                this.mapSystem.cells[checkRow][checkCol].class === 'ocean') {
                                oceanNeighbors++;
                            }
                        }
                        
                        // More aggressive filling - if surrounded by at least 5 ocean tiles, fill it
                        if (oceanNeighbors >= 5) {
                            this.mapSystem.cells[row][col].attribute = 'water';
                            this.mapSystem.cells[row][col].class = 'ocean';
                            oceanTiles.push({ row, col });
                            filledAny = true;
                        }
                    }
                }
            }
        }
        
        // Final pass: fill any remaining grassland that's completely surrounded
        console.log('Final ocean hole filling pass...');
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                if (this.mapSystem.cells[row][col].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(row, col, 3)) {
                    
                    // Check if this grassland is completely surrounded by ocean
                    let oceanNeighbors = 0;
                    const directions = [
                        { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                        { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                        { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
                    ];
                    
                    for (const dir of directions) {
                        const checkRow = row + dir.dr;
                        const checkCol = col + dir.dc;
                        
                        if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                            checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols &&
                            this.mapSystem.cells[checkRow][checkCol].attribute === 'water' &&
                            this.mapSystem.cells[checkRow][checkCol].class === 'ocean') {
                            oceanNeighbors++;
                        }
                    }
                    
                    // If surrounded by at least 6 ocean tiles, fill it
                    if (oceanNeighbors >= 6) {
                        this.mapSystem.cells[row][col].attribute = 'water';
                        this.mapSystem.cells[row][col].class = 'ocean';
                        oceanTiles.push({ row, col });
                    }
                }
            }
        }
        
        console.log(`Ocean hole filling complete after ${pass} passes. New total: ${oceanTiles.length} tiles`);
    }
    
    createOcean(startRow, startCol) {
        const oceanTiles = [{ row: startRow, col: startCol }];
        const visited = new Set();
        visited.add(`${startRow},${startCol}`);
        
        const targetSize = Math.floor(Math.random() * 200) + 100;
        
        while (oceanTiles.length < targetSize) {
            const randomIndex = Math.floor(Math.random() * oceanTiles.length);
            const currentTile = oceanTiles[randomIndex];
            
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            const validDirections = directions.filter(dir => {
                const newRow = currentTile.row + dir.dr;
                const newCol = currentTile.col + dir.dc;
                return newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                       newCol >= 0 && newCol < this.mapSystem.mapSize.cols &&
                       !visited.has(`${newRow},${newCol}`);
            });
            
            if (validDirections.length > 0) {
                const direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                const newRow = currentTile.row + direction.dr;
                const newCol = currentTile.col + direction.dc;
                
                oceanTiles.push({ row: newRow, col: newCol });
                visited.add(`${newRow},${newCol}`);
            } else {
                // Remove this tile if no valid directions
                oceanTiles.splice(randomIndex, 1);
            }
        }
        
        // Apply ocean to tiles
        oceanTiles.forEach(tile => {
            this.mapSystem.cells[tile.row][tile.col].attribute = 'ocean';
            this.mapSystem.cells[tile.row][tile.col].class = 'ocean';
        });
        
        return oceanTiles;
    }
    
    generateLakesOppositeOcean(oceanInfo) {
        console.log('Generating two lakes opposite to corner ocean...');
        
        // Determine which corner the ocean is in and place lakes in opposite area
        let lake1Direction, lake2Direction;
        let lake1StartRow, lake1StartCol, lake2StartRow, lake2StartCol;
        
        if (oceanInfo.corner === 0) { // Ocean in top-left corner
            // Place first lake in bottom-right corner
            lake1StartRow = this.mapSystem.mapSize.rows - 15; // 15 tiles from bottom edge
            lake1StartCol = this.mapSystem.mapSize.cols - 15; // 15 tiles from right edge
            lake1Direction = { dr: -1, dc: -1 }; // Grow upward and leftward
            
            // Place second lake in bottom-left area (well spaced from first)
            lake2StartRow = this.mapSystem.mapSize.rows - 20; // 20 tiles from bottom edge
            lake2StartCol = Math.floor(this.mapSystem.mapSize.cols * 0.3); // 30% from left edge
            lake2Direction = { dr: -1, dc: 0 }; // Grow upward
            
        } else if (oceanInfo.corner === 1) { // Ocean in top-right corner
            // Place first lake in bottom-left corner
            lake1StartRow = this.mapSystem.mapSize.rows - 15; // 15 tiles from bottom edge
            lake1StartCol = 15; // 15 tiles from left edge
            lake1Direction = { dr: -1, dc: 1 }; // Grow upward and rightward
            
            // Place second lake in bottom-right area (well spaced from first)
            lake2StartRow = this.mapSystem.mapSize.rows - 20; // 20 tiles from bottom edge
            lake2StartCol = Math.floor(this.mapSystem.mapSize.cols * 0.7); // 70% from left edge
            lake2Direction = { dr: -1, dc: 0 }; // Grow upward
            
        } else if (oceanInfo.corner === 2) { // Ocean in bottom-right corner
            // Place first lake in top-left corner
            lake1StartRow = 15; // 15 tiles from top edge
            lake1StartCol = 15; // 15 tiles from left edge
            lake1Direction = { dr: 1, dc: 1 }; // Grow downward and rightward
            
            // Place second lake in top-right area (well spaced from first)
            lake2StartRow = 20; // 20 tiles from top edge
            lake2StartCol = Math.floor(this.mapSystem.mapSize.cols * 0.7); // 70% from left edge
            lake2Direction = { dr: 1, dc: 0 }; // Grow downward
            
        } else if (oceanInfo.corner === 3) { // Ocean in bottom-left corner
            // Place first lake in top-right corner
            lake1StartRow = 15; // 15 tiles from top edge
            lake1StartCol = this.mapSystem.mapSize.cols - 15; // 15 tiles from right edge
            lake1Direction = { dr: 1, dc: -1 }; // Grow downward and leftward
            
            // Place second lake in top-left area (well spaced from first)
            lake2StartRow = 20; // 20 tiles from top edge
            lake2StartCol = Math.floor(this.mapSystem.mapSize.cols * 0.3); // 30% from left edge
            lake2Direction = { dr: 1, dc: 0 }; // Grow downward
        }
        
        // Generate first lake - try multiple locations if needed
        let firstLakePlaced = false;
        let lake1Size = 0;
        
        // Try primary location first
        if (lake1StartRow >= 5 && lake1StartRow < this.mapSystem.mapSize.rows - 5 &&
            lake1StartCol >= 5 && lake1StartCol < this.mapSystem.mapSize.cols - 5 &&
            this.mapSystem.cells[lake1StartRow][lake1StartCol].attribute === 'grassland' &&
            !this.isWithinMountainRadius(lake1StartRow, lake1StartCol, 2) &&
            !this.isWithinOceanRadius(lake1StartRow, lake1StartCol, 8)) { // 8 tiles from ocean
            
            lake1Size = this.createConstrainedLake(lake1StartRow, lake1StartCol, lake1Direction, lake1StartRow, lake1StartCol);
            if (lake1Size > 0) {
                console.log(`Generated first lake with ${lake1Size} tiles at (${lake1StartRow}, ${lake1StartCol})`);
                firstLakePlaced = true;
            }
        }
        
        // If primary location failed, try alternative locations
        if (!firstLakePlaced) {
            const alternativeLocations = [
                { row: lake1StartRow + 3, col: lake1StartCol },
                { row: lake1StartRow - 3, col: lake1StartCol },
                { row: lake1StartRow, col: lake1StartCol + 3 },
                { row: lake1StartRow, col: lake1StartCol - 3 },
                { row: lake1StartRow + 5, col: lake1StartCol + 5 },
                { row: lake1StartRow - 5, col: lake1StartCol - 5 }
            ];
            
            for (const loc of alternativeLocations) {
                if (loc.row >= 5 && loc.row < this.mapSystem.mapSize.rows - 5 &&
                    loc.col >= 5 && loc.col < this.mapSystem.mapSize.cols - 5 &&
                    this.mapSystem.cells[loc.row][loc.col].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(loc.row, loc.col, 2) &&
                    !this.isWithinOceanRadius(loc.row, loc.col, 8)) { // 8 tiles from ocean
                    
                    lake1Size = this.createConstrainedLake(loc.row, loc.col, lake1Direction, loc.row, loc.col);
                    if (lake1Size > 0) {
                        console.log(`Generated first lake with ${lake1Size} tiles at (${loc.row}, ${loc.col}) - alternative location`);
                        firstLakePlaced = true;
                        break;
                    }
                }
            }
        }
        
        if (!firstLakePlaced) {
            console.log('WARNING: Could not place first lake anywhere!');
        }
        
        // Generate second lake (with more flexible spacing)
        let secondLakePlaced = false;
        let lake2Size = 0;
        
        // Try primary location first
        if (lake2StartRow >= 5 && lake2StartRow < this.mapSystem.mapSize.rows - 5 &&
            lake2StartCol >= 5 && lake2StartCol < this.mapSystem.mapSize.cols - 5 &&
            this.mapSystem.cells[lake2StartRow][lake2StartCol].attribute === 'grassland' &&
            !this.isWithinMountainRadius(lake2StartRow, lake2StartCol, 2) &&
            !this.isWithinWaterRadius(lake2StartRow, lake2StartCol, 8) && // 8-tile spacing from other water
            !this.isWithinOceanRadius(lake2StartRow, lake2StartCol, 8)) { // 8 tiles from ocean
            
            lake2Size = this.createConstrainedLake(lake2StartRow, lake2StartCol, lake2Direction, lake2StartRow, lake2StartCol);
            if (lake2Size > 0) {
                console.log(`Generated second lake with ${lake2Size} tiles at (${lake2StartRow}, ${lake2StartCol})`);
                secondLakePlaced = true;
            }
        }
        
        // If primary location failed, try multiple alternative locations
        if (!secondLakePlaced) {
            const alternativeLocations = [
                { row: lake2StartRow + 5, col: lake2StartCol },
                { row: lake2StartRow - 5, col: lake2StartCol },
                { row: lake2StartRow, col: lake2StartCol + 5 },
                { row: lake2StartRow, col: lake2StartCol - 5 },
                { row: lake2StartRow + 8, col: lake2StartCol + 8 },
                { row: lake2StartRow - 8, col: lake2StartCol - 8 },
                { row: lake2StartRow + 10, col: lake2StartCol },
                { row: lake2StartRow - 10, col: lake2StartCol },
                { row: lake2StartRow, col: lake2StartCol + 10 },
                { row: lake2StartRow, col: lake2StartCol - 10 }
            ];
            
            for (const loc of alternativeLocations) {
                if (loc.row >= 5 && loc.row < this.mapSystem.mapSize.rows - 5 &&
                    loc.col >= 5 && loc.col < this.mapSystem.mapSize.cols - 5 &&
                    this.mapSystem.cells[loc.row][loc.col].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(loc.row, loc.col, 2) &&
                    !this.isWithinWaterRadius(loc.row, loc.col, 6) && // Further reduced spacing from other water
                    !this.isWithinOceanRadius(loc.row, loc.col, 8)) { // 8 tiles from ocean
                    
                    lake2Size = this.createConstrainedLake(loc.row, loc.col, lake2Direction, loc.row, loc.col);
                    if (lake2Size > 0) {
                        console.log(`Generated second lake with ${lake2Size} tiles at (${loc.row}, ${loc.col}) - alternative location`);
                        secondLakePlaced = true;
                        break;
                    }
                }
            }
        }
        
        if (!secondLakePlaced) {
            console.log('WARNING: Could not place second lake anywhere!');
        }
    }
    
    createConstrainedLake(startRow, startCol, direction, originalRow, originalCol) {
        const lakeTiles = [];
        const visited = new Set();
        const queue = [{ row: startRow, col: startCol }];
        
        const targetSize = 15 + Math.floor(Math.random() * 35); // 15-50 tiles (more variation)
        
        while (lakeTiles.length < targetSize && queue.length > 0) {
            const current = queue.shift();
            const key = `${current.row},${current.col}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Check bounds
            if (current.row < 0 || current.row >= this.mapSystem.mapSize.rows ||
                current.col < 0 || current.col >= this.mapSystem.mapSize.cols) {
                continue;
            }
            
            // Check if this cell is grassland and not too close to mountains, forests, or ocean
            if (this.mapSystem.cells[current.row][current.col].attribute !== 'grassland' ||
                this.isWithinMountainRadius(current.row, current.col, 2) ||
                this.isWithinForestRadius(current.row, current.col, 2) ||
                this.isWithinOceanRadius(current.row, current.col, 6)) { // 6 tiles from ocean during expansion
                continue;
            }
            
            // Add this tile to lake
            lakeTiles.push(current);
            this.mapSystem.cells[current.row][current.col].attribute = 'water';
            this.mapSystem.cells[current.row][current.col].class = 'lake';
            
            // Add adjacent tiles to queue with circular bias
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
            ];
            
            for (const dir of directions) {
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                const newKey = `${newRow},${newCol}`;
                
                if (!visited.has(newKey)) {
                    // Calculate distance from original position for circular growth
                    const distanceFromOriginal = Math.sqrt(
                        Math.pow(newRow - originalRow, 2) + Math.pow(newCol - originalCol, 2)
                    );
                    
                    // Base probability for natural lake growth (less perfectly circular)
                    let expansionProbability = 0.5; // Slightly lower base probability
                    
                    // More natural lake shape - not perfectly circular with random variation
                    const radiusVariation = 0.8 + Math.random() * 0.6; // 0.8 to 1.4 random factor
                    const maxRadius = Math.sqrt(targetSize / Math.PI) * radiusVariation; // Random radius variation
                    if (distanceFromOriginal < maxRadius) {
                        expansionProbability = 0.7; // High probability within core area
                    } else if (distanceFromOriginal < maxRadius * 1.5) {
                        expansionProbability = 0.4; // Medium probability in outer area
                    } else if (distanceFromOriginal < maxRadius * 2.0) {
                        expansionProbability = 0.2; // Low probability in far area
                    } else {
                        expansionProbability = 0.05; // Very low probability very far
                    }
                    
                    // Add much more randomness for natural variation
                    const randomFactor = 0.2 + Math.random() * 0.4; // 0.2 to 0.6 (increased significantly)
                    expansionProbability += randomFactor;
                    
                    // Add multiple irregularity patterns for more random shapes
                    const irregularityFactor1 = Math.sin((newRow - originalRow) * 0.3) * Math.cos((newCol - originalCol) * 0.3) * 0.15;
                    const irregularityFactor2 = Math.sin((newRow + newCol) * 0.4) * 0.1;
                    const irregularityFactor3 = Math.cos((newRow - newCol) * 0.6) * 0.08;
                    expansionProbability += irregularityFactor1 + irregularityFactor2 + irregularityFactor3;
                    
                    // Add position-based randomness
                    const positionRandomness = (Math.random() - 0.5) * 0.3; // -0.15 to 0.15
                    expansionProbability += positionRandomness;
                    
                    // Slight directional bias for natural variation
                    const matchesDirection = (dir.dr === direction.dr && dir.dc === direction.dc) ||
                                          (dir.dr === 0 && direction.dr === 0) ||
                                          (dir.dc === 0 && direction.dc === 0);
                    
                    if (matchesDirection) {
                        expansionProbability += 0.1; // Small bonus for preferred direction
                    }
                    
                    // Ensure probability doesn't exceed 1.0
                    expansionProbability = Math.min(expansionProbability, 0.95);
                    
                    if (Math.random() < expansionProbability) {
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        // If lake is too small, try to expand it more aggressively
        if (lakeTiles.length < 15) {
            console.log(`Lake too small (${lakeTiles.length} tiles), attempting aggressive expansion...`);
            this.expandLakeAggressively(lakeTiles, visited, direction, originalRow, originalCol);
        }
        
        console.log(`Created lake with ${lakeTiles.length} tiles at (${startRow}, ${startCol})`);
        return lakeTiles.length;
    }
    
    expandLakeAggressively(lakeTiles, visited, direction, originalRow, originalCol) {
        const queue = [...lakeTiles];
        let attempts = 0;
        const maxAttempts = 200; // More attempts for aggressive expansion
        
        while (lakeTiles.length < 20 && queue.length > 0 && attempts < maxAttempts) {
            attempts++;
            const current = queue.shift();
            
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
            ];
            
            for (const dir of directions) {
                const newRow = current.row + dir.dr;
                const newCol = current.col + dir.dc;
                const newKey = `${newRow},${newCol}`;
                
                if (!visited.has(newKey) && 
                    newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                    newCol >= 0 && newCol < this.mapSystem.mapSize.cols &&
                    this.mapSystem.cells[newRow][newCol].attribute === 'grassland' &&
                    !this.isWithinMountainRadius(newRow, newCol, 2) && // Reduced mountain spacing
                    !this.isWithinForestRadius(newRow, newCol, 1) && // Reduced forest spacing
                    !this.isWithinOceanRadius(newRow, newCol, 4)) { // 4 tiles from ocean during aggressive expansion
                    
                    // Calculate distance from original position for circular growth
                    const distanceFromOriginal = Math.sqrt(
                        Math.pow(newRow - originalRow, 2) + Math.pow(newCol - originalCol, 2)
                    );
                    
                    // High probability for aggressive expansion but still natural
                    let expansionProbability = 0.8; // High base probability
                    
                    // Prefer natural growth even in aggressive expansion
                    const maxRadius = Math.sqrt(25 / Math.PI) * 1.2; // Slightly smaller for more natural shape
                    if (distanceFromOriginal < maxRadius) {
                        expansionProbability = 0.9; // Very high probability within core area
                    } else if (distanceFromOriginal < maxRadius * 1.4) {
                        expansionProbability = 0.7; // High probability in outer area
                    } else if (distanceFromOriginal < maxRadius * 1.8) {
                        expansionProbability = 0.5; // Medium probability in far area
                    } else {
                        expansionProbability = 0.2; // Low probability very far
                    }
                    
                    // Add multiple irregularity patterns for more random shapes
                    const irregularityFactor1 = Math.sin((newRow - originalRow) * 0.4) * Math.cos((newCol - originalCol) * 0.4) * 0.1;
                    const irregularityFactor2 = Math.sin((newRow + newCol) * 0.5) * 0.08;
                    const irregularityFactor3 = Math.cos((newRow - newCol) * 0.7) * 0.06;
                    expansionProbability += irregularityFactor1 + irregularityFactor2 + irregularityFactor3;
                    
                    // Add more randomness for aggressive expansion
                    const randomFactor = 0.1 + Math.random() * 0.2; // 0.1 to 0.3
                    expansionProbability += randomFactor;
                    
                    // Slight directional bias for natural variation
                    const matchesDirection = (dir.dr === direction.dr && dir.dc === direction.dc) ||
                                          (dir.dr === 0 && direction.dr === 0) ||
                                          (dir.dc === 0 && direction.dc === 0);
                    
                    if (matchesDirection) {
                        expansionProbability += 0.05; // Small bonus for preferred direction
                    }
                    
                    // Ensure probability doesn't exceed 1.0
                    expansionProbability = Math.min(expansionProbability, 0.98);
                    
                    if (Math.random() < expansionProbability) {
                        this.mapSystem.cells[newRow][newCol].attribute = 'water';
                        this.mapSystem.cells[newRow][newCol].class = 'lake';
                        lakeTiles.push({ row: newRow, col: newCol });
                        visited.add(newKey);
                        queue.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        
        console.log(`Aggressive expansion complete. Lake now has ${lakeTiles.length} tiles`);
    }
    
    createLake(startRow, startCol) {
        const lakeTiles = [{ row: startRow, col: startCol }];
        const visited = new Set();
        visited.add(`${startRow},${startCol}`);
        
        const targetSize = Math.floor(Math.random() * 30) + 10;
        
        while (lakeTiles.length < targetSize) {
            const randomIndex = Math.floor(Math.random() * lakeTiles.length);
            const currentTile = lakeTiles[randomIndex];
            
            const directions = [
                { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
            ];
            
            const validDirections = directions.filter(dir => {
                const newRow = currentTile.row + dir.dr;
                const newCol = currentTile.col + dir.dc;
                return newRow >= 0 && newRow < this.mapSystem.mapSize.rows &&
                       newCol >= 0 && newCol < this.mapSystem.mapSize.cols &&
                       !visited.has(`${newRow},${newCol}`);
            });
            
            if (validDirections.length > 0) {
                const direction = validDirections[Math.floor(Math.random() * validDirections.length)];
                const newRow = currentTile.row + direction.dr;
                const newCol = currentTile.col + direction.dc;
                
                lakeTiles.push({ row: newRow, col: newCol });
                visited.add(`${newRow},${newCol}`);
            } else {
                lakeTiles.splice(randomIndex, 1);
            }
        }
        
        // Apply lake to tiles
        lakeTiles.forEach(tile => {
            this.mapSystem.cells[tile.row][tile.col].attribute = 'lake';
            this.mapSystem.cells[tile.row][tile.col].class = 'lake';
        });
        
        return lakeTiles;
    }
    
    placeRiverStartAndEnd() {
        // Place river start on edge
        const riverStart = this.placeRiverStartOnAxis();
        
        // Place river end near water
        const riverEnd = this.placeRiverEndOffOcean();
        
        // Generate river between start and end
        if (riverStart && riverEnd) {
            this.generateWaterBetweenRiverPoints(riverStart, riverEnd);
        }
    }
    
    placeRiverStartOnAxis() {
        const edge = Math.floor(Math.random() * 4);
        let startRow, startCol;
        
        switch (edge) {
            case 0: // Top edge
                startRow = 0;
                startCol = Math.floor(Math.random() * this.mapSystem.mapSize.cols);
                break;
            case 1: // Right edge
                startRow = Math.floor(Math.random() * this.mapSystem.mapSize.rows);
                startCol = this.mapSystem.mapSize.cols - 1;
                break;
            case 2: // Bottom edge
                startRow = this.mapSystem.mapSize.rows - 1;
                startCol = Math.floor(Math.random() * this.mapSystem.mapSize.cols);
                break;
            case 3: // Left edge
                startRow = Math.floor(Math.random() * this.mapSystem.mapSize.rows);
                startCol = 0;
                break;
        }
        
        this.mapSystem.cells[startRow][startCol].attribute = 'riverStart';
        this.mapSystem.cells[startRow][startCol].class = 'riverStart';
        
        return { row: startRow, col: startCol };
    }
    
    placeRiverEndOffOcean() {
        // Find a suitable location near water for river end
        for (let attempts = 0; attempts < 100; attempts++) {
            const row = Math.floor(Math.random() * this.mapSystem.mapSize.rows);
            const col = Math.floor(Math.random() * this.mapSystem.mapSize.cols);
            
            const cell = this.mapSystem.cells[row][col];
            if (cell.attribute === 'grassland' && this.isAdjacentToAnyWater(row, col)) {
                this.mapSystem.cells[row][col].attribute = 'riverEnd';
                this.mapSystem.cells[row][col].class = 'riverEnd';
                return { row, col };
            }
        }
        
        return null;
    }
    
    generateWaterBetweenRiverPoints(start, end) {
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
                const cell = this.mapSystem.cells[point.row][point.col];
                if (cell.attribute === 'grassland') {
                    cell.attribute = 'river';
                    cell.class = 'river';
                }
            }
        });
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
    
    isWithinMountainRadius(row, col, radius) {
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (cell.attribute === 'mountain') {
                    const distance = Math.abs(row - r) + Math.abs(col - c);
                    if (distance <= radius) {
                        return true;
                    }
                }
            }
        }
        return false;
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
}
