const CACHE_NAME = 'speed-rivals-v1.0.0';
const DATA_CACHE_NAME = 'speed-rivals-data-v1.0.0';

// Core files to cache for offline functionality
const FILES_TO_CACHE = [
    '/',
    '/mobile-racing.html',
    '/game-hub.html',
    '/js/mobile-controls.js',
    '/js/mobile-performance.js',
    '/js/mobile-pwa.js',
    '/js/mobile-game.js',
    '/js/car.js',
    '/js/track.js',
    '/js/game.js',
    '/libs/three.min.js',
    '/libs/cannon.min.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/apple-touch-icon.png',
    '/icons/badge-72x72.png'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
    '/api/races',
    '/api/progress',
    '/api/leaderboard',
    '/api/achievements'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
    console.log('[SW] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline page');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[SW] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API calls with network-first strategy
    if (isApiCall(url.pathname)) {
        event.respondWith(handleApiCall(event));
        return;
    }

    // Handle game assets with cache-first strategy
    if (isGameAsset(url.pathname)) {
        event.respondWith(handleGameAsset(event));
        return;
    }

    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(event));
        return;
    }

    // Default: cache-first for static resources
    event.respondWith(
        caches.match(request).then((response) => {
            return response || fetch(request);
        })
    );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync', event.tag);

    if (event.tag === 'speedRivalsSync') {
        event.waitUntil(syncOfflineData());
    }
});

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('[SW] Push received');

    const options = {
        body: 'You have a new race challenge!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'speed-rivals-notification',
        data: {
            url: '/mobile-racing.html'
        },
        actions: [
            {
                action: 'open',
                title: 'Open Game',
                icon: '/icons/action-open.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/action-close.png'
            }
        ]
    };

    if (event.data) {
        const payload = event.data.json();
        options.body = payload.message || options.body;
        options.data = payload.data || options.data;

        if (payload.title) {
            options.title = payload.title;
        }
    }

    event.waitUntil(
        self.registration.showNotification('Speed Rivals', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/mobile-racing.html')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Helper functions
function isApiCall(pathname) {
    return API_CACHE_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

function isGameAsset(pathname) {
    const gameAssetPatterns = [
        '/js/',
        '/libs/',
        '/icons/',
        '/sounds/',
        '/models/',
        '/textures/'
    ];
    return gameAssetPatterns.some(pattern => pathname.startsWith(pattern));
}

async function handleApiCall(event) {
    const { request } = event;
    const url = new URL(request.url);

    try {
        // Try network first
        const response = await fetch(request);

        if (response.status === 200) {
            // Cache successful API responses
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(request.url, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Network request failed, serving from cache', error);

        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline response for race data
        if (url.pathname.includes('/api/races')) {
            return new Response(JSON.stringify({
                offline: true,
                message: 'Race data will sync when online',
                races: getOfflineRaces()
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generic offline response
        return new Response(JSON.stringify({
            offline: true,
            message: 'Data will sync when online'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

async function handleGameAsset(event) {
    const { request } = event;

    // Cache-first strategy for game assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        // Cache the asset if successful
        if (response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.log('[SW] Failed to fetch game asset', request.url, error);

        // Return placeholder for missing assets
        if (request.url.includes('.png') || request.url.includes('.jpg')) {
            return new Response(createPlaceholderImage(), {
                headers: { 'Content-Type': 'image/svg+xml' }
            });
        }

        throw error;
    }
}

async function handleNavigation(event) {
    const { request } = event;

    try {
        // Try network first for navigation
        const response = await fetch(request);
        return response;
    } catch (error) {
        console.log('[SW] Navigation offline, serving cached page');

        // Serve cached mobile racing page for offline navigation
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('/mobile-racing.html');

        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to basic offline page
        return new Response(createOfflinePage(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

async function syncOfflineData() {
    console.log('[SW] Syncing offline data');

    try {
        // Get stored offline data
        const cache = await caches.open(DATA_CACHE_NAME);
        const requests = await cache.keys();

        for (const request of requests) {
            if (request.url.includes('offline-data')) {
                const response = await cache.match(request);
                const data = await response.json();

                // Attempt to sync with server
                try {
                    await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    // Remove from cache after successful sync
                    await cache.delete(request);
                } catch (syncError) {
                    console.log('[SW] Sync failed for item', syncError);
                }
            }
        }

        // Notify client about sync completion
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                payload: { status: 'complete' }
            });
        });

    } catch (error) {
        console.error('[SW] Background sync failed', error);
    }
}

function getOfflineRaces() {
    // Return sample offline race data
    return [
        {
            id: 'offline-1',
            track: 'Circuit Alpha',
            time: '1:23.45',
            position: 1,
            offline: true
        }
    ];
}

function createPlaceholderImage() {
    return `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#cccccc"/>
            <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="#666">
                🏎️
            </text>
        </svg>
    `;
}

function createOfflinePage() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Speed Rivals - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                    color: white;
                    text-align: center;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                .offline-icon {
                    font-size: 4em;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 2em;
                    margin-bottom: 20px;
                }
                p {
                    font-size: 1.2em;
                    margin-bottom: 30px;
                    opacity: 0.9;
                }
                .retry-button {
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 25px;
                    font-size: 1.1em;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .retry-button:hover {
                    transform: scale(1.05);
                }
            </style>
        </head>
        <body>
            <div class="offline-icon">📴</div>
            <h1>You're Offline</h1>
            <p>Connect to the internet to access all features</p>
            <button class="retry-button" onclick="window.location.reload()">
                Try Again
            </button>

            <script>
                // Auto-retry when online
                window.addEventListener('online', () => {
                    window.location.reload();
                });
            </script>
        </body>
        </html>
    `;
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(cleanupCaches());
    }
});

async function cleanupCaches() {
    const cacheNames = await caches.keys();
    const oldCaches = cacheNames.filter(name =>
        name.startsWith('speed-rivals-') &&
        name !== CACHE_NAME &&
        name !== DATA_CACHE_NAME
    );

    await Promise.all(oldCaches.map(name => caches.delete(name)));
}

// Handle cache quota exceeded
self.addEventListener('quotaexceedederror', (event) => {
    console.log('[SW] Quota exceeded, cleaning up caches');
    event.waitUntil(cleanupCaches());
});

// Performance monitoring
self.addEventListener('fetch', (event) => {
    const start = performance.now();

    event.respondWith(
        handleFetch(event).then(response => {
            const duration = performance.now() - start;

            // Log slow requests
            if (duration > 1000) {
                console.log(`[SW] Slow request: ${event.request.url} took ${duration}ms`);
            }

            return response;
        })
    );
});

async function handleFetch(event) {
    // Use existing fetch handlers
    const { request } = event;
    const url = new URL(request.url);

    if (isApiCall(url.pathname)) {
        return handleApiCall(event);
    }

    if (isGameAsset(url.pathname)) {
        return handleGameAsset(event);
    }

    if (request.mode === 'navigate') {
        return handleNavigation(event);
    }

    const cachedResponse = await caches.match(request);
    return cachedResponse || fetch(request);
}