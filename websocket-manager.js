console.log('Loading WebSocketManager class...');

class WebSocketManager {
    constructor() {
        console.log('WebSocketManager constructor called');
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.eventHandlers = new Map();
    }

    connect(serverUrl = 'http://localhost:3000') {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(serverUrl);
                
                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startHeartbeat();
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    console.log('Disconnected from server');
                    this.isConnected = false;
                    this.stopHeartbeat();
                });

                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error);
                    this.handleReconnect();
                    reject(error);
                });

                // Set up event handlers
                this.setupEventHandlers();

            } catch (error) {
                console.error('Failed to connect:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.stopHeartbeat();
    }

    send(event, data) {
        console.log(`Sending WebSocket message: ${event}`, data);
        if (this.isConnected && this.socket) {
            this.socket.emit(event, data);
            console.log(`Message sent successfully: ${event}`);
        } else {
            console.warn('Cannot send message: not connected to server');
        }
    }

    on(event, handler) {
        this.eventHandlers.set(event, handler);
        if (this.socket) {
            this.socket.on(event, handler);
        }
    }

    off(event) {
        this.eventHandlers.delete(event);
        if (this.socket) {
            this.socket.off(event);
        }
    }

    setupEventHandlers() {
        if (!this.socket) return;

        // Re-attach all stored event handlers
        for (const [event, handler] of this.eventHandlers) {
            this.socket.on(event, handler);
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, 30000); // Send ping every 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}