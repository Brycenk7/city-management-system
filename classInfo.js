// Class Information System
// Defines different classes and their properties for map attributes

class ClassInfo {
    constructor() {
        this.classes = {
            // Water Classes
            water: {
                basic: { name: 'Basic Water', color: '#4A90E2', description: 'Standard water tile' },
                lake: { name: 'Lake', color: '#2E86AB', description: '10-39 connected water tiles' },
                ocean: { name: 'Ocean', color: '#1B4F72', description: '40+ connected water tiles' },
                river: { name: 'River', color: '#5DADE2', description: 'Connects lakes/oceans' }
            },
            
            // River Start Attribute
            riverStart: {
                riverStart: { name: 'River Start', color: '#85C1E9', description: 'Beginning of a river' }
            },
            
            // River End Attribute
            riverEnd: {
                riverEnd: { name: 'River End', color: '#AED6F1', description: 'End of a river' }
            },
            
            // Terrain Classes
            terrain: {
                grassland: { name: 'Grassland', color: '#7ED321', description: 'Open grassy areas' },
                forest: { name: 'Forest', color: '#417505', description: 'Dense tree coverage' },
                mountain: { name: 'Mountain', color: '#D3D3D3', description: 'High elevation areas' },
                desert: { name: 'Desert', color: '#F5A623', description: 'Arid sandy regions' }
            },
            
            // City Classes
            city: {
                residential: { name: 'Residential', color: '#D0021B', description: 'Housing areas - Cost: 60 wood, 8 ore' },
                commercial: { name: 'Commercial', color: '#9013FE', description: 'Business districts - Cost: 30 wood, 20 ore' },
                powerPlant: { name: 'Power Plant', color: '#FFD700', description: 'Energy generation facilities - Cost: 25 wood, 15 ore' },
                industrial: { name: 'Industrial', color: '#808080', description: 'Manufacturing zones - Cost: 40 wood, 20 ore, produces 1 commercial good/s (requires power)' },
                powerLines: { name: 'Power Lines', color: '#FFFF99', description: 'Electrical transmission lines - Cost: 3 wood, 1 ore' },
                lumberYard: { name: 'Lumber Yard', color: '#D2B48C', description: 'Wood production facility - Cost: 10 wood, produces 0.5 wood/s (works without power)' },
                miningOutpost: { name: 'Mining Outpost', color: '#2C2C2C', description: 'Ore production facility - Cost: 20 wood, 10 ore, produces 0.5 ore/s, must be within 1 tile of mountain (works without power)' },
                road: { name: 'Road', color: '#4A4A4A', description: 'Transportation routes - Cost: 2 wood' },
                bridge: { name: 'Bridge', color: '#8B4513', description: 'Water crossing - Cost: 8 wood, 3 ore' },
                woodSupplyLines: { name: 'Wood Supply Lines', color: '#8B4513', description: 'Roads connected to forest for wood transport' },
                oreSupplyLines: { name: 'Ore Supply Lines', color: '#696969', description: 'Roads connected to mountain for ore transport' },
                industrialSupply: { name: 'Industrial Supply', color: '#5A5A5A', description: 'Roads connected to industrial zones for supply transport' },
                commercialRoad: { name: 'Commercial Road', color: '#B19CD9', description: 'Roads connected to commercial zones for business access' },
                erase: { name: 'Erase', color: '#F39C12', description: 'Remove player-placed infrastructure and zoning', rules: 'Click to erase only infrastructure and zoning, reverts to original terrain' }
            }
        };
        
        this.classRules = {
            water: {
                lake: { minSize: 10, maxSize: 39, requiresConnection: true },
                ocean: { minSize: 40, maxSize: Infinity, requiresConnection: true },
                river: { requiresConnection: true, connectsTo: ['lake', 'ocean'] }
            },
            riverStart: {
                riverStart: { requiresConnection: true, connectsTo: ['lake', 'ocean'] }
            },
            riverEnd: {
                riverEnd: { requiresConnection: true, connectsTo: ['lake', 'ocean'] }
            }
        };
    }
    
    // Get class information for a specific attribute and class
    getClassInfo(attribute, className) {
        if (this.classes[attribute] && this.classes[attribute][className]) {
            return this.classes[attribute][className];
        }
        return null;
    }
    
    // Get all classes for a specific attribute
    getClassesForAttribute(attribute) {
        return this.classes[attribute] || {};
    }
    
    // Get class rules for a specific attribute and class
    getClassRules(attribute, className) {
        if (this.classRules[attribute] && this.classRules[attribute][className]) {
            return this.classRules[attribute][className];
        }
        return null;
    }
    
    // Get the color for a specific attribute and class
    getClassColor(attribute, className) {
        const classInfo = this.getClassInfo(attribute, className);
        return classInfo ? classInfo.color : '#CCCCCC';
    }
    
    // Get the name for a specific attribute and class
    getClassName(attribute, className) {
        const classInfo = this.getClassInfo(attribute, className);
        return classInfo ? classInfo.name : 'Unknown';
    }
    
    // Check if a class exists for an attribute
    hasClass(attribute, className) {
        return this.classes[attribute] && this.classes[attribute][className];
    }
    
    // Get all available attributes
    getAvailableAttributes() {
        return Object.keys(this.classes);
    }
    
    // Get all available classes for an attribute
    getAvailableClasses(attribute) {
        return Object.keys(this.classes[attribute] || {});
    }
    
    // Get class data for a specific attribute
    getClassData(attribute) {
        const classData = this.classes[attribute];
        if (classData) {
            // Return the first class data if multiple classes exist
            const firstClass = Object.values(classData)[0];
            return {
                name: firstClass.name,
                color: firstClass.color,
                description: firstClass.description,
                rules: firstClass.rules || 'No specific rules'
            };
        }
        
        // Default fallback
        return {
            name: attribute,
            color: '#CCCCCC',
            description: 'Unknown attribute',
            rules: 'No specific rules'
        };
    }
}
