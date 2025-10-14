// Viewer System - Zoom, pan, and viewer-specific functionality
class ViewerSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
    }
    
    zoomIn() {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        this.mapSystem.viewerZoom = Math.min(this.mapSystem.viewerZoom * 1.1, 3); // Max 3x zoom
        this.applyZoomAndPan();
    }
    
    zoomOut() {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        this.mapSystem.viewerZoom = Math.max(this.mapSystem.viewerZoom / 1.1, 0.3); // Min 0.3x zoom
        this.applyZoomAndPan();
    }
    
    applyZoomAndPan() {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        const mapGrid = document.getElementById('map');
        const mapContainer = document.querySelector('.map-container');
        
        // Apply zoom
        mapGrid.style.transform = `scale(${this.mapSystem.viewerZoom}) translate(${this.mapSystem.viewerPanX}px, ${this.mapSystem.viewerPanY}px)`;
        mapGrid.style.transformOrigin = 'center center';
        
        // Update viewer info
        this.updateViewerInfo();
    }
    
    setupViewerMouseEvents() {
        const mapContainer = document.querySelector('.map-container');
        
        // Remove existing listeners
        mapContainer.removeEventListener('mousedown', this.handleViewerMouseDown);
        mapContainer.removeEventListener('mousemove', this.handleViewerMouseMove);
        mapContainer.removeEventListener('mouseup', this.handleViewerMouseUp);
        mapContainer.removeEventListener('mouseleave', this.handleViewerMouseLeave);
        mapContainer.removeEventListener('wheel', this.handleViewerWheel);
        
        // Add new listeners
        mapContainer.addEventListener('mousedown', (e) => this.handleViewerMouseDown(e));
        mapContainer.addEventListener('mousemove', (e) => this.handleViewerMouseMove(e));
        mapContainer.addEventListener('mouseup', (e) => this.handleViewerMouseUp(e));
        mapContainer.addEventListener('mouseleave', (e) => this.handleViewerMouseLeave(e));
        mapContainer.addEventListener('wheel', (e) => this.handleViewerWheel(e));
    }
    
    handleViewerMouseDown(e) {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        e.preventDefault();
        this.mapSystem.isPanning = true;
        this.mapSystem.lastPanX = e.clientX;
        this.mapSystem.lastPanY = e.clientY;
    }
    
    handleViewerMouseMove(e) {
        if (this.mapSystem.currentTab !== 'viewer' || !this.mapSystem.isPanning) return;
        
        e.preventDefault();
        
        const deltaX = e.clientX - this.mapSystem.lastPanX;
        const deltaY = e.clientY - this.mapSystem.lastPanY;
        
        this.mapSystem.viewerPanX += deltaX / this.mapSystem.viewerZoom;
        this.mapSystem.viewerPanY += deltaY / this.mapSystem.viewerZoom;
        
        this.mapSystem.lastPanX = e.clientX;
        this.mapSystem.lastPanY = e.clientY;
        
        this.applyZoomAndPan();
    }
    
    handleViewerMouseUp(e) {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        this.mapSystem.isPanning = false;
    }
    
    handleViewerMouseLeave(e) {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        this.mapSystem.isPanning = false;
    }
    
    handleViewerWheel(e) {
        if (this.mapSystem.currentTab !== 'viewer') return;
        
        e.preventDefault();
        
        if (e.deltaY < 0) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }
    
    updateViewerInfo() {
        const infoElement = document.getElementById('viewerInfo');
        if (infoElement) {
            infoElement.innerHTML = `
                <div class="viewer-info-item">
                    <span class="viewer-info-label">🔍 Zoom:</span>
                    <span class="viewer-info-value">${Math.round(this.mapSystem.viewerZoom * 100)}%</span>
                </div>
                <div class="viewer-info-item">
                    <span class="viewer-info-label">📍 Pan X:</span>
                    <span class="viewer-info-value">${Math.round(this.mapSystem.viewerPanX)}px</span>
                </div>
                <div class="viewer-info-item">
                    <span class="viewer-info-label">📍 Pan Y:</span>
                    <span class="viewer-info-value">${Math.round(this.mapSystem.viewerPanY)}px</span>
                </div>
                <div class="viewer-info-item">
                    <span class="viewer-info-label">🎨 Mode:</span>
                    <span class="viewer-info-value">${this.mapSystem.viewerArtMode === 'pixel' ? 'Pixel Art' : 'Testing'}</span>
                </div>
            `;
        }
    }
    
    calculateWaterCoverage() {
        let waterCount = 0;
        const totalCells = this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (['ocean', 'lake', 'river', 'riverStart', 'riverEnd'].includes(cell.attribute)) {
                    waterCount++;
                }
            }
        }
        
        return Math.round((waterCount / totalCells) * 100);
    }
    
    calculateForestCoverage() {
        let forestCount = 0;
        const totalCells = this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'forest') {
                    forestCount++;
                }
            }
        }
        
        return Math.round((forestCount / totalCells) * 100);
    }
    
    calculateMountainCoverage() {
        let mountainCount = 0;
        const totalCells = this.mapSystem.mapSize.rows * this.mapSystem.mapSize.cols;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === 'mountain') {
                    mountainCount++;
                }
            }
        }
        
        return Math.round((mountainCount / totalCells) * 100);
    }
    
    countAttribute(attribute) {
        let count = 0;
        
        for (let row = 0; row < this.mapSystem.mapSize.rows; row++) {
            for (let col = 0; col < this.mapSystem.mapSize.cols; col++) {
                const cell = this.mapSystem.cells[row][col];
                if (cell.attribute === attribute) {
                    count++;
                }
            }
        }
        
        return count;
    }
    
    isCellVisible(row, col) {
        const mapGrid = document.getElementById('map');
        const mapRect = mapGrid.getBoundingClientRect();
        const cellSize = mapRect.width / this.mapSystem.mapSize.cols;
        
        const cellX = col * cellSize;
        const cellY = row * cellSize;
        
        const margin = cellSize * 2; // Add some margin for cells partially visible
        
        return (cellX >= -margin && cellX <= mapRect.width + margin && 
                cellY >= -margin && cellY <= mapRect.height + margin);
    }
}
