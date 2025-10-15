// Notification Manager - Handles stacking, updating, and dismissing notifications
class NotificationManager {
    constructor() {
        this.notifications = new Map(); // resourceType -> notification element
        this.container = null;
        this.nextOffset = 0;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    addOrUpdateNotification(resourceType, message) {
        // Check if notification for this resource already exists
        if (this.notifications.has(resourceType)) {
            this.updateNotification(resourceType, message);
        } else {
            this.createNotification(resourceType, message);
        }
    }

    createNotification(resourceType, message) {
        // Create notification wrapper
        const notification = document.createElement('div');
        notification.className = 'resource-warning-notification';
        notification.dataset.resourceType = resourceType;
        notification.style.cssText = `
            background: #ff4444;
            color: white;
            padding: 12px 40px 12px 16px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 14px;
            font-weight: 500;
            max-width: 320px;
            position: relative;
            animation: slideInRight 0.3s ease-out;
            pointer-events: auto;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // Create message text
        const messageText = document.createElement('span');
        messageText.className = 'notification-message';
        messageText.textContent = message;
        messageText.style.cssText = `
            flex: 1;
        `;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 4px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.removeNotification(resourceType);
        };

        // Assemble notification
        notification.appendChild(messageText);
        notification.appendChild(closeBtn);

        // Add to container
        this.container.appendChild(notification);
        this.notifications.set(resourceType, notification);

        // Set auto-dismiss timer
        notification.dismissTimer = setTimeout(() => {
            this.removeNotification(resourceType);
        }, 6000); // 6 seconds to give more time to read
    }

    updateNotification(resourceType, message) {
        const notification = this.notifications.get(resourceType);
        if (!notification) return;

        // Clear existing timer
        if (notification.dismissTimer) {
            clearTimeout(notification.dismissTimer);
        }

        // Update message with animation
        const messageElement = notification.querySelector('.notification-message');
        if (messageElement) {
            // Flash animation to show update
            notification.style.animation = 'notificationPulse 0.4s ease-out';
            setTimeout(() => {
                notification.style.animation = '';
            }, 400);
            
            messageElement.textContent = message;
        }

        // Reset auto-dismiss timer
        notification.dismissTimer = setTimeout(() => {
            this.removeNotification(resourceType);
        }, 6000);
    }

    removeNotification(resourceType) {
        const notification = this.notifications.get(resourceType);
        if (!notification) return;

        // Clear timer
        if (notification.dismissTimer) {
            clearTimeout(notification.dismissTimer);
        }

        // Animate out
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(resourceType);
        }, 300);
    }

    clearAll() {
        for (const [resourceType, notification] of this.notifications.entries()) {
            this.removeNotification(resourceType);
        }
    }
}



