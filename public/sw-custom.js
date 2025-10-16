/* public/sw-custom.js
   - IndexedDB + Background Sync (pendientes -> POST -> pending=0)
   - Estrategias de caché en runtime:
       • Páginas/HTML: Network-First + fallback /offline.html
       • API (/api/*): Network-First con cache dinámico
       • Imágenes: Stale-While-Revalidate
     (Los assets del App Shell los precachea Workbox.)
   - Mensajería: {type:'SYNC_DONE'} a la página cuando termina
   - Push opcional
*/

/* ========= CACHES & RUNTIME CONFIG ========= */
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';

// Si tienes backend propio, cambia esta URL:
const API_ENDPOINT = 'https://httpbin.org/post'; // p.ej. '/api/entries'

// Helper para detectar API de tu dominio
function isApiRequest(url) {
    try {
        const u = new URL(url);
        return u.pathname.startsWith('/api/');
    } catch {
        return false;
    }
}

/* ========= INDEXEDDB (en el SW) ========= */
const DB_NAME = 'app-db';
const STORE = 'entries';
const SYNC_TAG = 'sync-entries';

function swOpenDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('pending', 'pending');
                store.createIndex('createdAt', 'createdAt');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function swGetAll() {
    const db = await swOpenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function swPut(obj) {
    const db = await swOpenDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).put(obj);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/* ========= SYNC ========= */
async function syncPending() {
    try {
        const all = await swGetAll();
        const pendings = all.filter((e) => e?.pending === true || e?.pending === 1);
        if (!pendings.length) return;

        for (const it of pendings) {
            try {
                const res = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: it.title, note: it.note, createdAt: it.createdAt }),
                });
                if (res.ok) {
                    await swPut({ ...it, pending: 0 });
                }
            } catch {
                // sigue con los demás
            }
        }

        // avisa a todas las páginas controladas
        const cl = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        cl.forEach((c) => c.postMessage({ type: 'SYNC_DONE' }));
    } catch {
        // noop
    }
}

self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(syncPending());
    }
});

self.addEventListener('message', (event) => {
    // Mantén el protocolo que ya usas en tu app:
    if (event.data && event.data.type === 'SYNC_NOW') {
        event.waitUntil(syncPending());
    }
});

/* ========= RUNTIME CACHING (estrategias) ========= */
// Network-First para páginas (HTML) con fallback a /offline.html
async function networkFirstForPages(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) return response;
        throw new Error('bad network response');
    } catch {
        // Workbox debe haber precacheado /offline.html; si no, intenta match genérico
        return (await caches.match('/offline.html')) ||
            (await caches.match('/index.html')) ||
            new Response('Sin conexión y sin contenido cacheado.', { headers: { 'Content-Type': 'text/plain' } });
    }
}

// Network-First con cache dinámico (para API)
async function networkFirst(request, cacheName) {
    try {
        const res = await fetch(request);
        if (res && res.status === 200) {
            const cache = await caches.open(cacheName);
            cache.put(request, res.clone());
        }
        return res;
    } catch {
        const cache = await caches.open(cacheName);
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error('Network and cache both failed');
    }
}

// SWR para imágenes
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedPromise = cache.match(request);
    const networkPromise = fetch(request)
        .then((res) => {
            if (res && res.status === 200) cache.put(request, res.clone());
            return res;
        })
        .catch(() => null);

    const cached = await cachedPromise;
    return cached || (await networkPromise) || fetch(request);
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Páginas/HTML
    if (
        req.mode === 'navigate' ||
        (req.destination === '' && req.headers.get('accept')?.includes('text/html'))
    ) {
        event.respondWith(networkFirstForPages(req));
        return;
    }

    // API (tu dominio)
    if (isApiRequest(req.url)) {
        event.respondWith(networkFirst(req, DYNAMIC_CACHE));
        return;
    }

    // Imágenes
    if (req.destination === 'image') {
        event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
        return;
    }

    // Resto: deja que Workbox gestione (precache/estrategias declaradas)
});

/* ========= PUSH (opcional) ========= */
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'MiPWA', body: 'Mensaje push' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: data.url ? { url: data.url } : {},
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});
