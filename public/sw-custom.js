// Utilidades mínimas IndexedDB dentro del SW (sin idb, para mantener el SW liviano)
const DB_NAME = 'app-db';
const STORE = 'entries';

function openDB() {
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

async function readPending() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const idx = tx.store.index('pending');
        const req = idx.getAll(true);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function updateEntry(id, patch) {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const getReq = tx.store.get(id);
    return new Promise((resolve, reject) => {
        getReq.onsuccess = () => {
            const old = getReq.result;
            tx.store.put({ ...old, ...patch });
            tx.done?.then(resolve).catch(reject);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

// Endpoint de ejemplo (cámbialo por tu backend real)
const API_ENDPOINT = 'https://httpbin.org/post';

// --- Background Sync:
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-entries') {
        event.waitUntil(syncPending());
    }
});

async function syncPending() {
    const pendings = await readPending();
    if (!pendings.length) return;

    const okIds = [];
    for (const it of pendings) {
        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: it.title, note: it.note, createdAt: it.createdAt })
            });
            if (res.ok) {
                okIds.push(it.id);
            }
        } catch (_) { /* sin conexión */ }
    }
    await Promise.all(okIds.map(id => updateEntry(id, { pending: false })));
}

// Mensaje para forzar sync en online
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_NOW') {
        event.waitUntil(syncPending());
    }
});

// --- Push notifications (manejo en SW):
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'MiPWA', body: 'Mensaje push' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: data.url ? { url: data.url } : {}
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
});

// (opcional) Solo si quieres un fallback manual de navegación
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const r = await fetch(event.request);
                if (r && r.ok) return r;
            } catch { }
            return (await caches.match('/offline.html')) || (await caches.match('/index.html'));
        })());
    }
});


