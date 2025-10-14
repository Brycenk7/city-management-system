// Water Properties System
// Defines properties and behaviors specific to water tiles

class WaterProperties {
    constructor() {
        this.properties = {
            // Basic water properties
            basic: {
                size: 1,
                flowRate: 0,
                depth: 'shallow',
                temperature: 'moderate',
                salinity: 'fresh',
                canConnect: true,
                connectionType: 'any'
            },
            
            // Lake properties
            lake: {
                size: 'medium',
                flowRate: 'low',
                depth: 'medium',
                temperature: 'moderate',
                salinity: 'fresh',
                canConnect: true,
                connectionType: 'lake',
                minSize: 30,
                maxSize: 39,
                ecosystem: 'freshwater',
                supportsLife: true
            },
            
            // Ocean properties
            ocean: {
                size: 'large',
                flowRate: 'high',
                depth: 'deep',
                temperature: 'variable',
                salinity: 'salt',
                canConnect: true,
                connectionType: 'ocean',
                minSize: 750,
                maxSize: Infinity,
                ecosystem: 'marine',
                supportsLife: true,
                hasTides: true
            },
            
            // River properties
            river: {
                size: 'small',
                flowRate: 'high',
                depth: 'shallow',
                temperature: 'moderate',
                salinity: 'fresh',
                canConnect: true,
                connectionType: 'river',
                ecosystem: 'freshwater',
                supportsLife: true,
                hasCurrent: true,
                flowsTo: 'lake_or_ocean'
            },
            
            // River start properties
            riverStart: {
                size: 'small',
                flowRate: 'medium',
                depth: 'shallow',
                temperature: 'moderate',
                salinity: 'fresh',
                canConnect: true,
                connectionType: 'river_start',
                ecosystem: 'freshwater',
                supportsLife: true,
                isSource: true
            },
            
            // River end properties
            riverEnd: {
                size: 'small',
                flowRate: 'high',
                depth: 'medium',
                temperature: 'moderate',
                salinity: 'fresh',
                canConnect: true,
                connectionType: 'river_end',
                ecosystem: 'freshwater',
                supportsLife: true,
                isDestination: true
            }
        };
        
        this.connectionRules = {
            // What can connect to what
            lake: ['lake', 'ocean', 'river', 'riverStart', 'riverEnd'],
            ocean: ['lake', 'ocean', 'river', 'riverStart', 'riverEnd'],
            river: ['lake', 'ocean', 'river', 'riverStart', 'riverEnd'],
            riverStart: ['lake', 'ocean', 'river'],
            riverEnd: ['lake', 'ocean', 'river'],
            basic: ['lake', 'ocean', 'river', 'riverStart', 'riverEnd', 'basic']
        };
        
        // Connection rules for river attributes
        this.riverConnectionRules = {
            riverStart: ['lake', 'ocean', 'river'],
            riverEnd: ['lake', 'ocean', 'river']
        };
        
        this.sizeThresholds = {
            lake: { min: 30, max: 39 },
            ocean: { min: 750, max: Infinity },
            river: { min: 1, max: Infinity },
            riverStart: { min: 1, max: 1 },
            riverEnd: { min: 1, max: 1 }
        };
    }
    
    // Get properties for a specific water class
    getProperties(waterClass) {
        return this.properties[waterClass] || this.properties.basic;
    }
    
    // Get connection rules for a specific water class
    getConnectionRules(waterClass) {
        return this.connectionRules[waterClass] || this.connectionRules.basic;
    }
    
    // Get connection rules for river attributes
    getRiverConnectionRules(riverAttribute) {
        return this.riverConnectionRules[riverAttribute] || [];
    }
    
    // Check if two water classes can connect
    canConnect(fromClass, toClass) {
        const rules = this.getConnectionRules(fromClass);
        return rules.includes(toClass);
    }
    
    // Get size thresholds for a water class
    getSizeThresholds(waterClass) {
        return this.sizeThresholds[waterClass] || { min: 1, max: Infinity };
    }
    
    // Check if a size qualifies for a specific water class
    qualifiesForClass(waterClass, size) {
        const thresholds = this.getSizeThresholds(waterClass);
        return size >= thresholds.min && size <= thresholds.max;
    }
    
    // Get all water classes that can connect to a given class
    getConnectableClasses(waterClass) {
        return this.getConnectionRules(waterClass);
    }
    
    // Get flow direction for river connections
    getFlowDirection(fromClass, toClass) {
        if (fromClass === 'riverStart' && toClass === 'river') {
            return 'downstream';
        } else if (fromClass === 'river' && toClass === 'riverEnd') {
            return 'downstream';
        } else if (fromClass === 'river' && (toClass === 'lake' || toClass === 'ocean')) {
            return 'downstream';
        } else if ((fromClass === 'lake' || fromClass === 'ocean') && toClass === 'riverStart') {
            return 'upstream';
        }
        return 'bidirectional';
    }
    
    // Get ecosystem type for a water class
    getEcosystem(waterClass) {
        const props = this.getProperties(waterClass);
        return props.ecosystem || 'unknown';
    }
    
    // Check if water class supports life
    supportsLife(waterClass) {
        const props = this.getProperties(waterClass);
        return props.supportsLife || false;
    }
}
