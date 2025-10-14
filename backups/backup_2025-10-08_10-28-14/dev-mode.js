// Dev Mode System - Hidden developer features
class DevMode {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.isActivated = false;
        this.activationSequence = [];
        this.requiredSequence = ['powerPlant', 'powerPlant', 'powerPlant', 'road', 'road'];
        this.devButton = null;
        
        this.setupActivationListeners();
    }
    
    setupActivationListeners() {
        // Listen for button clicks to track activation sequence
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('player-btn')) {
                const attribute = e.target.getAttribute('data-attribute');
                if (attribute) {
                    this.trackButtonClick(attribute);
                }
            }
        });
    }
    
    trackButtonClick(attribute) {
        // Add to sequence
        this.activationSequence.push(attribute);
        
        // Keep only the last 5 clicks
        if (this.activationSequence.length > 5) {
            this.activationSequence.shift();
        }
        
        // Check if sequence matches
        if (this.checkActivationSequence()) {
            this.activateDevMode();
        }
    }
    
    checkActivationSequence() {
        if (this.activationSequence.length !== this.requiredSequence.length) {
            return false;
        }
        
        for (let i = 0; i < this.requiredSequence.length; i++) {
            if (this.activationSequence[i] !== this.requiredSequence[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    activateDevMode() {
        if (this.isActivated) return;
        
        this.isActivated = true;
        console.log('🔧 Dev Mode Activated!');
        
        // Create and show dev button
        this.createDevButton();
        
        // Show activation notification
        this.showNotification('🔧 Dev Mode Activated!', 'success');
    }
    
    createDevButton() {
        // Create dev button
        this.devButton = document.createElement('button');
        this.devButton.id = 'dev-mode-btn';
        this.devButton.className = 'dev-mode-btn';
        this.devButton.innerHTML = '🔧 DEV MODE';
        this.devButton.title = 'Click to get max resources';
        
        // Style the button to match other control buttons
        this.devButton.style.cssText = `
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
            transition: all 0.3s ease;
            font-family: 'Arial', sans-serif;
            margin-left: 8px;
        `;
        
        // Add hover effects
        this.devButton.addEventListener('mouseenter', () => {
            this.devButton.style.transform = 'translateY(-2px)';
            this.devButton.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)';
        });
        
        this.devButton.addEventListener('mouseleave', () => {
            this.devButton.style.transform = 'translateY(0)';
            this.devButton.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)';
        });
        
        // Add click handler
        this.devButton.addEventListener('click', () => {
            this.giveMaxResources();
        });
        
        // Add to map controls section (between save and City Viewer Pro)
        const mapControls = document.getElementById('mapControls');
        if (mapControls) {
            // Insert after the save button
            const saveButton = document.getElementById('saveMap');
            if (saveButton && saveButton.nextSibling) {
                mapControls.insertBefore(this.devButton, saveButton.nextSibling);
            } else {
                mapControls.appendChild(this.devButton);
            }
        } else {
            // Fallback to body if map controls not found
            document.body.appendChild(this.devButton);
        }
        
        // Animate in
        this.devButton.style.opacity = '0';
        this.devButton.style.transform = 'scale(0.8)';
        setTimeout(() => {
            this.devButton.style.transition = 'all 0.5s ease';
            this.devButton.style.opacity = '1';
            this.devButton.style.transform = 'scale(1)';
        }, 100);
    }
    
    giveMaxResources() {
        if (!this.mapSystem.resourceManagement) {
            console.error('Resource management not available');
            return;
        }
        
        // Set all resources to maximum
        const maxResources = {
            wood: 999999,
            ore: 999999,
            power: 999999,
            processedMaterials: 999999,
            commercialGoods: 999999
        };
        
        // Update resources
        Object.keys(maxResources).forEach(resource => {
            if (this.mapSystem.resourceManagement.resources.hasOwnProperty(resource)) {
                this.mapSystem.resourceManagement.resources[resource] = maxResources[resource];
            }
        });
        
        // Update display
        this.mapSystem.resourceManagement.updateResourceDisplay();
        
        // Show notification
        this.showNotification('💰 Max resources granted!', 'success');
        
        // Add visual effect
        this.devButton.style.animation = 'pulse 0.6s ease-in-out';
        setTimeout(() => {
            this.devButton.style.animation = '';
        }, 600);
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `dev-notification ${type}`;
        notification.textContent = message;
        
        // Style notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: ${type === 'success' ? '#2ecc71' : '#3498db'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Method to reset dev mode (for testing)
    reset() {
        this.isActivated = false;
        this.activationSequence = [];
        
        if (this.devButton && this.devButton.parentNode) {
            this.devButton.parentNode.removeChild(this.devButton);
            this.devButton = null;
        }
    }
}

// Add pulse animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
