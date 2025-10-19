class MobilePWA {
    constructor() {
        this.isInstalled = false;
        this.deferredPrompt = null;
        this.updateAvailable = false;
        this.isOnline = navigator.onLine;

        this.offlineData = {
            tracks: [],
            cars: [],
            settings: {},
            progress: {},
            cachedRaces: []
        };

        this.syncQueue = [];
        this.backgroundSync = null;

        this.init();
    }

    init() {
        this.setupServiceWorker();
        this.setupInstallPrompt();
        this.setupPushNotifications();
        this.setupBackgroundSync();
        this.setupOfflineMode();
        this.setupUpdateDetection();
        this.loadOfflineData();

        console.log('📱 PWA functionality initialized');
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailable();
                            }
                        });
                    });

                    // Handle controller change (new version activated)
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        window.location.reload();
                    });
                })
                .catch(error => {
                    console.error('❌ Service Worker registration failed:', error);
                });

            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleServiceWorkerMessage(event.data);
            });
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallButton();
            this.showNotification('🎉 Speed Rivals installed successfully!');
            this.trackInstallation();
        });

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.isInstalled = true;
        }
    }

    setupPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            // Request permission on first interaction
            document.addEventListener('click', this.requestNotificationPermission.bind(this), { once: true });
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.subscribeToPush();
                this.showNotification('🔔 Notifications enabled!');
            }
        } else if (Notification.permission === 'granted') {
            this.subscribeToPush();
        }
    }

    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY') // Replace with actual key
            });

            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);
        } catch (error) {
            console.error('Push subscription failed:', error);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async sendSubscriptionToServer(subscription) {
        try {
            await fetch('/api/push-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            });
        } catch (error) {
            console.error('Failed to send subscription to server:', error);
        }
    }

    setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                this.backgroundSync = registration;
            });
        }

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.handleOffline();
        });
    }

    setupOfflineMode() {
        // Set up offline data management
        this.setupOfflineDB();

        // Handle offline race data
        window.addEventListener('raceCompleted', (e) => {
            this.saveOfflineRaceResult(e.detail);
        });

        // Handle offline progress
        window.addEventListener('progressUpdate', (e) => {
            this.saveOfflineProgress(e.detail);
        });
    }

    async setupOfflineDB() {
        if ('indexedDB' in window) {
            this.db = await this.openDB();
        }
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SpeedRivalsDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create stores
                const raceStore = db.createObjectStore('races', { keyPath: 'id', autoIncrement: true });
                raceStore.createIndex('timestamp', 'timestamp');
                raceStore.createIndex('synced', 'synced');

                const progressStore = db.createObjectStore('progress', { keyPath: 'type' });

                const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });

                const assetsStore = db.createObjectStore('assets', { keyPath: 'url' });
            };
        });
    }

    setupUpdateDetection() {
        // Check for app updates periodically
        setInterval(() => {
            this.checkForUpdates();
        }, 30000); // Check every 30 seconds

        // Check immediately
        this.checkForUpdates();
    }

    async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                registration.update();
            }
        }
    }

    showInstallButton() {
        // Create install button if it doesn't exist
        let installButton = document.getElementById('installButton');
        if (!installButton) {
            installButton = document.createElement('button');
            installButton.id = 'installButton';
            installButton.innerHTML = '📱 Install App';
            installButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(45deg, #2ecc71, #27ae60);
                color: white;
                border: none;
                padding: 15px 25px;
                border-radius: 25px;
                font-size: 16px;
                font-weight: bold;
                z-index: 6000;
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
                cursor: pointer;
            `;

            installButton.addEventListener('click', () => {
                this.promptInstall();
            });

            document.body.appendChild(installButton);
        }
    }

    hideInstallButton() {
        const installButton = document.getElementById('installButton');
        if (installButton) {
            installButton.remove();
        }
    }

    async promptInstall() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }

            this.deferredPrompt = null;
            this.hideInstallButton();
        }
    }

    showUpdateAvailable() {
        this.updateAvailable = true;

        const updateBanner = document.createElement('div');
        updateBanner.id = 'updateBanner';
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 7000;
            font-weight: bold;
            cursor: pointer;
        `;
        updateBanner.innerHTML = `
            🔄 New version available! Tap to update
        `;

        updateBanner.addEventListener('click', () => {
            this.applyUpdate();
        });

        document.body.appendChild(updateBanner);

        // Auto-update after 30 seconds
        setTimeout(() => {
            if (this.updateAvailable) {
                this.applyUpdate();
            }
        }, 30000);
    }

    async applyUpdate() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        }
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'BACKGROUND_SYNC':
                this.handleBackgroundSync(data.payload);
                break;
            case 'PUSH_RECEIVED':
                this.handlePushNotification(data.payload);
                break;
            case 'CACHE_UPDATED':
                console.log('📦 Cache updated');
                break;
        }
    }

    async handleBackgroundSync(data) {
        console.log('🔄 Background sync triggered');
        await this.syncOfflineData();
    }

    handleOnline() {
        console.log('🌐 Back online');
        this.showNotification('🌐 Connection restored');
        this.syncOfflineData();
    }

    handleOffline() {
        console.log('📴 Gone offline');
        this.showNotification('📴 Offline mode enabled');
    }

    async saveOfflineRaceResult(raceData) {
        if (!this.db) return;

        const transaction = this.db.transaction(['races'], 'readwrite');
        const store = transaction.objectStore('races');

        const raceRecord = {
            ...raceData,
            timestamp: Date.now(),
            synced: false
        };

        await store.add(raceRecord);
        this.addToSyncQueue('race', raceRecord);
    }

    async saveOfflineProgress(progressData) {
        if (!this.db) return;

        const transaction = this.db.transaction(['progress'], 'readwrite');
        const store = transaction.objectStore('progress');

        const progressRecord = {
            type: progressData.type,
            data: progressData,
            timestamp: Date.now(),
            synced: false
        };

        await store.put(progressRecord);
        this.addToSyncQueue('progress', progressRecord);
    }

    addToSyncQueue(type, data) {
        this.syncQueue.push({ type, data });

        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncOfflineData();
        } else if (this.backgroundSync) {
            // Register for background sync
            this.backgroundSync.sync.register('speedRivalsSync');
        }
    }

    async syncOfflineData() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        console.log(`🔄 Syncing ${this.syncQueue.length} items...`);

        const failedItems = [];

        for (const item of this.syncQueue) {
            try {
                await this.syncItem(item);
            } catch (error) {
                console.error('Sync failed for item:', item, error);
                failedItems.push(item);
            }
        }

        // Keep failed items in queue
        this.syncQueue = failedItems;

        if (failedItems.length === 0) {
            this.showNotification('✅ All data synced successfully');
        } else {
            console.log(`⚠️ ${failedItems.length} items failed to sync`);
        }
    }

    async syncItem(item) {
        const endpoint = item.type === 'race' ? '/api/races' : '/api/progress';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
        }

        // Mark as synced in local database
        if (this.db) {
            const transaction = this.db.transaction([item.type === 'race' ? 'races' : 'progress'], 'readwrite');
            const store = transaction.objectStore(item.type === 'race' ? 'races' : 'progress');

            item.data.synced = true;
            await store.put(item.data);
        }
    }

    async loadOfflineData() {
        if (!this.db) return;

        try {
            // Load unsynced data back into sync queue
            const raceTransaction = this.db.transaction(['races'], 'readonly');
            const raceStore = raceTransaction.objectStore('races');
            const unsyncedRaces = await this.getUnsyncedRecords(raceStore);

            const progressTransaction = this.db.transaction(['progress'], 'readonly');
            const progressStore = progressTransaction.objectStore('progress');
            const unsyncedProgress = await this.getUnsyncedRecords(progressStore);

            // Add to sync queue
            unsyncedRaces.forEach(race => this.syncQueue.push({ type: 'race', data: race }));
            unsyncedProgress.forEach(progress => this.syncQueue.push({ type: 'progress', data: progress }));

            console.log(`📦 Loaded ${this.syncQueue.length} items from offline storage`);

            // Try to sync if online
            if (this.isOnline) {
                this.syncOfflineData();
            }
        } catch (error) {
            console.error('Failed to load offline data:', error);
        }
    }

    getUnsyncedRecords(store) {
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const records = request.result.filter(record => !record.synced);
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // Notification system
    showNotification(message, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(message, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-72x72.png',
                tag: 'speed-rivals',
                renotify: true,
                ...options
            });
        }

        // Also show in-app notification
        this.showInAppNotification(message);
    }

    showInAppNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
            z-index: 5000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Push notification handling
    handlePushNotification(payload) {
        console.log('📱 Push notification received:', payload);

        switch (payload.type) {
            case 'tournament':
                this.showNotification('🏆 New tournament starting!', {
                    body: payload.message,
                    actions: [
                        { action: 'join', title: 'Join Now' },
                        { action: 'later', title: 'Remind Later' }
                    ]
                });
                break;

            case 'challenge':
                this.showNotification('⚔️ Challenge received!', {
                    body: payload.message,
                    actions: [
                        { action: 'accept', title: 'Accept' },
                        { action: 'decline', title: 'Decline' }
                    ]
                });
                break;

            case 'achievement':
                this.showNotification('🎉 Achievement unlocked!', {
                    body: payload.message
                });
                break;

            default:
                this.showNotification(payload.title, {
                    body: payload.message
                });
        }
    }

    // Analytics and tracking
    trackInstallation() {
        // Track app installation
        if (typeof gtag !== 'undefined') {
            gtag('event', 'app_install', {
                event_category: 'PWA',
                event_label: 'Speed Rivals'
            });
        }
    }

    trackOfflineUsage() {
        // Track offline usage patterns
        const offlineSession = {
            start: Date.now(),
            actions: []
        };

        // Store for later sync
        localStorage.setItem('offlineSession', JSON.stringify(offlineSession));
    }

    // Utility methods
    isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }

    getInstallPromptOutcome() {
        return this.deferredPrompt ? 'available' : 'not-available';
    }

    getConnectionType() {
        if ('connection' in navigator) {
            return navigator.connection.effectiveType;
        }
        return 'unknown';
    }

    // Public API
    async cacheAsset(url) {
        if ('caches' in window) {
            const cache = await caches.open('speed-rivals-assets');
            await cache.add(url);
        }
    }

    async getCachedAsset(url) {
        if ('caches' in window) {
            const cache = await caches.open('speed-rivals-assets');
            return await cache.match(url);
        }
        return null;
    }

    isOffline() {
        return !this.isOnline;
    }

    getPendingSyncCount() {
        return this.syncQueue.length;
    }

    forcSync() {
        if (this.isOnline) {
            return this.syncOfflineData();
        }
        return Promise.reject(new Error('Device is offline'));
    }
}

// Initialize PWA functionality
const mobilePWA = new MobilePWA();