# Modular Script Architecture

The original `script.js` file has been split into multiple, more manageable modules for better organization and maintainability.

## File Structure

### Core Files
- **`main.js`** - Main application entry point that ties all modules together
- **`core-map-system.js`** - Basic map creation, cell management, and core functionality

### Feature Modules
- **`tab-management.js`** - Tab switching, viewer/player modes, and styling
- **`wave-animation.js`** - Ocean wave animation system
- **`viewer-system.js`** - Zoom, pan, and viewer-specific functionality
- **`cell-interaction.js`** - Click handling, painting, and validation
- **`water-system.js`** - Water classification, rivers, oceans, lakes
- **`road-system.js`** - Road classification and management
- **`procedural-generation.js`** - Map generation algorithms
- **`utility-functions.js`** - Helper functions, validation, and calculations

### External Dependencies
- **`classInfo.js`** - Class information and data
- **`waterProperties.js`** - Water properties and behavior

## Module Responsibilities

### Core Map System (`core-map-system.js`)
- Map creation and initialization
- Cell management and data structures
- Basic statistics calculation
- Core event listeners
- Attribute validation

### Tab Management (`tab-management.js`)
- Tab switching logic
- Viewer/Player mode styling
- Art mode management
- Player mode management
- Statistics display for different tabs

### Wave Animation (`wave-animation.js`)
- Ocean wave animation system
- Wave pattern generation
- Animation timing and control
- Ocean corner detection

### Viewer System (`viewer-system.js`)
- Zoom and pan functionality
- Viewer-specific mouse events
- Viewer statistics
- Coverage calculations

### Cell Interaction (`cell-interaction.js`)
- Cell click handling
- Drag painting
- Placement validation
- Error feedback
- Cell hover effects

### Water System (`water-system.js`)
- Water region classification
- River generation and management
- Ocean and lake creation
- Water access validation

### Road System (`road-system.js`)
- Road region classification
- Road connectivity
- Infrastructure validation
- Supply line management

### Procedural Generation (`procedural-generation.js`)
- Map generation algorithms
- Terrain placement
- Natural feature generation
- Procedural water features

### Utility Functions (`utility-functions.js`)
- Color manipulation
- File I/O operations
- Keyboard shortcuts
- General helper functions

## Benefits of Modular Structure

1. **Maintainability** - Each module has a clear, focused responsibility
2. **Readability** - Smaller files are easier to understand and navigate
3. **Debugging** - Issues can be isolated to specific modules
4. **Collaboration** - Multiple developers can work on different modules
5. **Testing** - Individual modules can be tested in isolation
6. **Reusability** - Modules can be reused in other projects
7. **Performance** - Only necessary modules can be loaded

## Usage

The application is initialized through `main.js`, which creates instances of all modules and sets up the global event listeners. Each module receives a reference to the core map system for data access.

## Migration Notes

- All original functionality has been preserved
- Event listeners are now managed centrally in `main.js`
- Module communication is handled through the core map system
- The original `script.js` file can be safely removed after testing

## Future Enhancements

- Add module-specific configuration
- Implement lazy loading for modules
- Add module dependency management
- Create module-specific tests
- Add module documentation
