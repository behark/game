/**
 * Game Error Handler - Frontend Error Boundaries
 * Provides graceful error handling and recovery for the game
 */

class GameErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        type: 'unhandled-rejection'
      });
      event.preventDefault();
    });

    // Handle WebGL context loss
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        this.handleContextLoss();
      });

      canvas.addEventListener('webglcontextrestored', () => {
        this.handleContextRestored();
      });
    }
  }

  handleError(error, context = {}) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context,
      userAgent: navigator.userAgent
    };

    this.errors.push(errorInfo);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (window.location.hostname === 'localhost') {
      console.error('Game Error:', errorInfo);
    }

    // Show user-friendly error message
    this.showErrorNotification(error.message);

    // Send error to analytics (if available)
    this.reportError(errorInfo);

    return errorInfo;
  }

  handleContextLoss() {
    console.warn('WebGL context lost - attempting recovery...');
    this.showErrorNotification('Graphics context lost. Reloading game...', 'warning');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  handleContextRestored() {
    console.log('WebGL context restored');
    this.showErrorNotification('Graphics restored successfully', 'success');
  }

  showErrorNotification(message, type = 'error') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.game-error-notification');
    existing.forEach(el => el.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `game-error-notification ${type}`;
    notification.innerHTML = `
      <div class="error-content">
        <span class="error-icon">${type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : '✅'}</span>
        <span class="error-message">${this.escapeHtml(message)}</span>
        <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles if not already added
    if (!document.getElementById('error-handler-styles')) {
      const style = document.createElement('style');
      style.id = 'error-handler-styles';
      style.textContent = `
        .game-error-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 400px;
          padding: 15px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          animation: slideIn 0.3s ease-out;
          font-family: Arial, sans-serif;
        }

        .game-error-notification.error {
          background: rgba(220, 38, 38, 0.95);
          color: white;
        }

        .game-error-notification.warning {
          background: rgba(245, 158, 11, 0.95);
          color: white;
        }

        .game-error-notification.success {
          background: rgba(34, 197, 94, 0.95);
          color: white;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .error-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .error-message {
          flex: 1;
          font-size: 14px;
        }

        .error-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          line-height: 24px;
          opacity: 0.8;
          flex-shrink: 0;
        }

        .error-close:hover {
          opacity: 1;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 600px) {
          .game-error-notification {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  reportError(errorInfo) {
    // Send error to server for logging (if analytics endpoint exists)
    try {
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          type: 'client-error',
          error: errorInfo
        });
        navigator.sendBeacon('/api/analytics/client-error', data);
      }
    } catch (e) {
      console.warn('Could not report error to server:', e);
    }
  }

  getRecentErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }

  // Wrapper for async game functions
  async wrapAsync(fn, context = 'async operation') {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error, { context });
      throw error;
    }
  }

  // Wrapper for game loops
  wrapGameLoop(fn, onError = null) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error, { context: 'game-loop' });
        if (onError) {
          onError(error);
        }
      }
    };
  }
}

// Create global instance
window.gameErrorHandler = new GameErrorHandler();

// Expose utilities
window.safeAsync = (fn, context) => window.gameErrorHandler.wrapAsync(fn, context);
window.safeGameLoop = (fn, onError) => window.gameErrorHandler.wrapGameLoop(fn, onError);

console.log('✅ Game Error Handler initialized');
