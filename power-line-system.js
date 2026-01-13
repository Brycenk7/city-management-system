// Power Line System - Power line classification and management
class PowerLineSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.powerLineConnections = new Map(); // Store connection lines
        this.svgOverlay = null; // Initialize lazily when needed
    }
    
    initPowerLineOverlay() {
        // Only initialize if not already done
        if (this.svgOverlay) {
            console.log('Overlay already exists');
            return;
        }
        
        // The #map element IS the map-grid itself
        const mapGrid = document.getElementById('map');
        if (!mapGrid) {
            console.error('Map grid (#map) not found');
            return;
        }
        
        console.log('Map grid found, creating overlay...');
        
        // Remove existing overlay if present
        const existingOverlay = mapGrid.querySelector('.power-line-overlay');
        if (existingOverlay) {
            console.log('Removing existing overlay');
            existingOverlay.remove();
        }
        
        // Create SVG overlay
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.className = 'power-line-overlay';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '100'; // Much higher z-index to be above all cells
        svg.style.overflow = 'visible';
        svg.setAttribute('preserveAspectRatio', 'none');
        
        // Only set grid to relative if it's not already positioned
        const gridPosition = getComputedStyle(mapGrid).position;
        console.log('Grid position:', gridPosition);
        if (gridPosition === 'static') {
            mapGrid.style.position = 'relative';
            console.log('Set grid position to relative');
        }
        
        mapGrid.appendChild(svg);
        this.svgOverlay = svg;
        console.log('Power line overlay initialized and appended to map grid');
        console.log('SVG overlay element:', svg);
        console.log('SVG parent:', svg.parentElement);
        
        // Refresh connections on window resize (only add listener once)
        if (!this._resizeHandlerAdded) {
            let resizeTimeout;
            const resizeHandler = () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (this.svgOverlay) {
                        this.refreshPowerLineConnections();
                    }
                }, 250);
            };
            window.addEventListener('resize', resizeHandler);
            this._resizeHandlerAdded = true;
        }
    }
    
    // Draw power line connections when a power line or power plant is placed
    updatePowerLineConnections(placedRow, placedCol, playerId) {
        console.log(`updatePowerLineConnections called for (${placedRow},${placedCol}) playerId: ${playerId}`);
        
        if (!this.svgOverlay) {
            console.log('SVG overlay not found, initializing...');
            this.initPowerLineOverlay();
        }
        
        if (!this.svgOverlay) {
            console.error('Failed to initialize SVG overlay');
            return;
        }
        
        // Clear existing connections for this player
        this.clearPlayerConnections(playerId);
        
        // Find all power lines and power plants by this player within radius
        // Use radius 1 for adjacent connections (8 directions) to create visible network
        const radius = 1; // Connect to adjacent power lines for visible network
        const nearbyPowerSources = this.findNearbyPowerSources(placedRow, placedCol, radius, playerId);
        
        console.log(`Found ${nearbyPowerSources.length} nearby power sources within radius ${radius}`);
        
        // Draw connections to nearby power sources
        nearbyPowerSources.forEach(target => {
            console.log(`Drawing connection to nearby source at (${target.row},${target.col})`);
            this.drawPowerLineConnection(placedRow, placedCol, target.row, target.col, playerId);
        });
        
        // Also update connections for all other power sources by this player
        this.updateAllPlayerConnections(playerId);
    }
    
    findNearbyPowerSources(row, col, radius, playerId) {
        const sources = [];
        
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                // Skip if not within radius (use Chebyshev distance)
                const distance = Math.max(Math.abs(dr), Math.abs(dc));
                if (distance > radius || distance === 0) continue;
                
                const checkRow = row + dr;
                const checkCol = col + dc;
                
                if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                    checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                    
                    const cell = this.mapSystem.cells[checkRow][checkCol];
                    // In single-player mode, match all power sources regardless of playerId
                    const matchesPlayer = (playerId === 'single-player') ? true : (cell.playerId === playerId);
                    
                    if ((cell.attribute === 'powerPlant' || cell.attribute === 'powerLines') &&
                        matchesPlayer) {
                        sources.push({ row: checkRow, col: checkCol });
                        console.log(`Found nearby power source at (${checkRow},${checkCol}) - attribute: ${cell.attribute}, playerId: ${cell.playerId}`);
                    }
                }
            }
        }
        
        return sources;
    }
    
    drawPowerLineConnection(row1, col1, row2, col2, playerId) {
        if (!this.svgOverlay) {
            console.log('SVG overlay not initialized, attempting to create...');
            this.initPowerLineOverlay();
            if (!this.svgOverlay) {
                console.error('Failed to create SVG overlay');
                return;
            }
        }
        
        // Get cell positions
        const cell1 = this.mapSystem.cells[row1] && this.mapSystem.cells[row1][col1];
        const cell2 = this.mapSystem.cells[row2] && this.mapSystem.cells[row2][col2];
        
        if (!cell1 || !cell2 || !cell1.element || !cell2.element) {
            console.log('Cells or elements not found:', { cell1: !!cell1, cell2: !!cell2 });
            return;
        }
        
        // Use a function to get positions that can be called on resize
        const updateLinePosition = () => {
            // Get the grid container (parent of SVG)
            const gridContainer = this.svgOverlay.parentElement;
            if (!gridContainer) {
                console.error('Grid container not found');
                return { x1: 0, y1: 0, x2: 0, y2: 0 };
            }
            
            // Get cell positions relative to the grid container
            const cell1Rect = cell1.element.getBoundingClientRect();
            const cell2Rect = cell2.element.getBoundingClientRect();
            const gridRect = gridContainer.getBoundingClientRect();
            
            // Calculate center positions relative to the SVG overlay itself
            // The SVG should be positioned absolutely within the grid container
            const x1 = (cell1Rect.left - gridRect.left) + (cell1Rect.width / 2);
            const y1 = (cell1Rect.top - gridRect.top) + (cell1Rect.height / 2);
            const x2 = (cell2Rect.left - gridRect.left) + (cell2Rect.width / 2);
            const y2 = (cell2Rect.top - gridRect.top) + (cell2Rect.height / 2);
            
            console.log(`Power line connection: (${row1},${col1}) to (${row2},${col2})`);
            console.log(`Calculated positions: (${x1.toFixed(1)},${y1.toFixed(1)}) to (${x2.toFixed(1)},${y2.toFixed(1)})`);
            
            return { x1, y1, x2, y2 };
        };
        
        const positions = updateLinePosition();
        
        // Check if positions are valid
        if (isNaN(positions.x1) || isNaN(positions.y1) || isNaN(positions.x2) || isNaN(positions.y2)) {
            console.log('Invalid positions calculated:', positions, {
                rect1: cell1.element.getBoundingClientRect(),
                rect2: cell2.element.getBoundingClientRect(),
                gridRect: this.svgOverlay.getBoundingClientRect()
            });
            return;
        }
        
        console.log(`Drawing line from (${row1},${col1}) to (${row2},${col2}) at positions:`, positions);
        
        // Create line element
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', positions.x1);
        line.setAttribute('y1', positions.y1);
        line.setAttribute('x2', positions.x2);
        line.setAttribute('y2', positions.y2);
        line.setAttribute('stroke', '#FFD700'); // Gold color for power lines
        line.setAttribute('stroke-width', '6'); // Make it even thicker for better visibility
        line.setAttribute('stroke-opacity', '1.0'); // Fully opaque for maximum visibility
        line.setAttribute('stroke-linecap', 'round'); // Rounded line caps for smoother appearance
        // Also set via style for maximum compatibility
        line.style.stroke = '#FFD700';
        line.style.strokeWidth = '6px';
        line.style.strokeOpacity = '1';
        line.style.opacity = '1';
        line.setAttribute('data-player-id', playerId);
        line.setAttribute('data-row1', row1);
        line.setAttribute('data-col1', col1);
        line.setAttribute('data-row2', row2);
        line.setAttribute('data-col2', col2);
        
        // Store update function for resize
        line._updatePosition = updateLinePosition;
        
        this.svgOverlay.appendChild(line);
        console.log(`✅ Successfully drew power line connection from (${row1},${col1}) to (${row2},${col2})`);
        console.log(`Line element:`, line);
        console.log(`SVG overlay has ${this.svgOverlay.children.length} children`);
        console.log(`Line attributes: x1=${line.getAttribute('x1')}, y1=${line.getAttribute('y1')}, x2=${line.getAttribute('x2')}, y2=${line.getAttribute('y2')}`);
        
        // Store connection for cleanup
        const key = `${row1},${col1}-${row2},${col2}`;
        this.powerLineConnections.set(key, line);
        
        // Force a repaint by accessing the element
        line.offsetHeight; // Trigger reflow
    }
    
    clearPlayerConnections(playerId) {
        if (!this.svgOverlay) return;
        
        // Remove all lines for this player
        const linesToRemove = [];
        this.svgOverlay.querySelectorAll(`line[data-player-id="${playerId}"]`).forEach(line => {
            linesToRemove.push(line);
        });
        
        linesToRemove.forEach(line => {
            line.remove();
            // Remove from map
            for (const [key, storedLine] of this.powerLineConnections.entries()) {
                if (storedLine === line) {
                    this.powerLineConnections.delete(key);
                    break;
                }
            }
        });
    }
    
    updateAllPlayerConnections(playerId) {
        // Find all power lines and power plants by this player
        const powerSources = [];
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                // In single-player mode, connect all power sources regardless of playerId
                // In multiplayer, only connect same player's power sources
                const matchesPlayer = (playerId === 'single-player') ? true : (cell.playerId === playerId);
                if ((cell.attribute === 'powerPlant' || cell.attribute === 'powerLines') &&
                    matchesPlayer) {
                    powerSources.push({ row, col });
                }
            }
        }
        
        console.log(`Found ${powerSources.length} power sources for player ${playerId}`);
        
        // Draw connections between all adjacent power sources (8-directional)
        // Use a set to track already drawn connections to avoid duplicates
        const drawnConnections = new Set();
        
        // For each power source, check all 8 adjacent cells for other power sources
        for (const source of powerSources) {
            const directions = [
                { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
                { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
                { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
            ];
            
            for (const dir of directions) {
                const checkRow = source.row + dir.dr;
                const checkCol = source.col + dir.dc;
                
                if (checkRow >= 0 && checkRow < this.mapSystem.mapSize.rows &&
                    checkCol >= 0 && checkCol < this.mapSystem.mapSize.cols) {
                    
                    const cell = this.mapSystem.cells[checkRow][checkCol];
                    const matchesPlayer = (playerId === 'single-player') ? true : (cell.playerId === playerId);
                    
                    if ((cell.attribute === 'powerPlant' || cell.attribute === 'powerLines') &&
                        matchesPlayer) {
                        // Found adjacent power source - create connection
                        const key1 = `${source.row},${source.col}-${checkRow},${checkCol}`;
                        const key2 = `${checkRow},${checkCol}-${source.row},${source.col}`;
                        
                        // Only draw if we haven't drawn this connection yet
                        if (!drawnConnections.has(key1) && !drawnConnections.has(key2)) {
                            this.drawPowerLineConnection(
                                source.row, source.col,
                                checkRow, checkCol,
                                playerId
                            );
                            drawnConnections.add(key1);
                            drawnConnections.add(key2);
                        }
                    }
                }
            }
        }
    }
    
    // Remove connections when a power line or power plant is removed
    removePowerLineConnections(row, col, playerId) {
        if (!this.svgOverlay) return;
        
        // Remove all lines connected to this position
        const linesToRemove = [];
        this.svgOverlay.querySelectorAll(`line[data-player-id="${playerId}"]`).forEach(line => {
            const x1 = parseFloat(line.getAttribute('x1'));
            const y1 = parseFloat(line.getAttribute('y1'));
            const x2 = parseFloat(line.getAttribute('x2'));
            const y2 = parseFloat(line.getAttribute('y2'));
            
            // Check if line connects to this cell
            const cell = this.mapSystem.cells[row][col];
            if (cell && cell.element) {
                const rect = cell.element.getBoundingClientRect();
                const gridRect = this.svgOverlay.getBoundingClientRect();
                const cellCenterX = rect.left + rect.width / 2 - gridRect.left;
                const cellCenterY = rect.top + rect.height / 2 - gridRect.top;
                
                // Check if line endpoint is near this cell
                const threshold = 5; // pixels
                if ((Math.abs(x1 - cellCenterX) < threshold && Math.abs(y1 - cellCenterY) < threshold) ||
                    (Math.abs(x2 - cellCenterX) < threshold && Math.abs(y2 - cellCenterY) < threshold)) {
                    linesToRemove.push(line);
                }
            }
        });
        
        linesToRemove.forEach(line => {
            line.remove();
            // Remove from map
            for (const [key, storedLine] of this.powerLineConnections.entries()) {
                if (storedLine === line) {
                    this.powerLineConnections.delete(key);
                    break;
                }
            }
        });
        
        // Rebuild connections for remaining power sources
        this.updateAllPlayerConnections(playerId);
    }
    
    // Update line positions when map is resized
    refreshPowerLineConnections() {
        if (!this.svgOverlay) return;
        
        // Update positions of existing lines
        this.svgOverlay.querySelectorAll('line').forEach(line => {
            if (line._updatePosition) {
                const positions = line._updatePosition();
                line.setAttribute('x1', positions.x1);
                line.setAttribute('y1', positions.y1);
                line.setAttribute('x2', positions.x2);
                line.setAttribute('y2', positions.y2);
            }
        });
    }
    
    // Rebuild all connections from scratch
    rebuildAllPowerLineConnections() {
        // Initialize overlay if needed
        if (!this.svgOverlay) {
            this.initPowerLineOverlay();
        }
        
        if (!this.svgOverlay) {
            console.log('Could not initialize SVG overlay for power lines');
            return;
        }
        
        // Clear and redraw all connections
        this.svgOverlay.innerHTML = '';
        this.powerLineConnections.clear();
        
        // Get all unique player IDs with power sources, including single-player
        const playerIds = new Set();
        let hasPowerSources = false;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'powerPlant' || cell.attribute === 'powerLines') {
                    hasPowerSources = true;
                    const playerId = cell.playerId || 'single-player';
                    playerIds.add(playerId);
                }
            }
        }
        
        if (!hasPowerSources) {
            console.log('No power sources found to connect');
            return;
        }
        
        console.log(`Rebuilding power line connections for ${playerIds.size} player(s):`, Array.from(playerIds));
        
        // Update connections for each player
        playerIds.forEach(playerId => {
            console.log(`Updating connections for player: ${playerId}`);
            this.updateAllPlayerConnections(playerId);
        });
        
        // Log final state
        const totalLines = this.svgOverlay.querySelectorAll('line').length;
        console.log(`✅ Power line rebuild complete. Total lines drawn: ${totalLines}`);
        if (totalLines === 0) {
            console.warn('⚠️ No power line connections were drawn! Check if power lines are adjacent.');
        }
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
        console.log(`Checking power radius for mixed use at ${row},${col} with radius ${radius}`);
        let powerSourcesFound = 0;
        
        for (let r = Math.max(0, row - radius); r <= Math.min(this.mapSystem.mapSize.rows - 1, row + radius); r++) {
            for (let c = Math.max(0, col - radius); c <= Math.min(this.mapSystem.mapSize.cols - 1, col + radius); c++) {
                const cell = this.mapSystem.cells[r][c];
                if (['powerPlant', 'powerLines'].includes(cell.attribute)) {
                    powerSourcesFound++;
                    // Use proper radius calculation (max of row and col differences)
                    const distance = Math.max(Math.abs(row - r), Math.abs(col - c));
                    console.log(`Found power source at ${r},${c} (distance: ${distance}, radius: ${radius})`);
                    if (distance <= radius) {
                        console.log(`Mixed use at ${row},${col} is within power range!`);
                        return true;
                    }
                }
            }
        }
        
        console.log(`No power sources found within radius ${radius} for mixed use at ${row},${col} (checked ${powerSourcesFound} power sources)`);
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
