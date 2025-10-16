/* public/sw-custom.js
   - Sincroniza entradas pendientes usando IndexedDB del SW
   - Marca pending:0 cuando el POST tiene éxito
   - Notifica a la página con {type:'SYNC_DONE'} al terminar
   - Incluye fallback de navegación a offline.html
*/

const DB_NAME = 'app-db';
const STORE = 'entries';
const SYNC_TAG = 'sync-entries';
// Cambia por tu backend real si tienes uno:
const API_ENDPOINT = 'https://httpbin.org/post';

// ---------- IndexedDB helpers (dentro del SW) ----------
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

// ---------- Sincronización ----------
async function syncPending() {
    try {
        // Traemos TODO y filtramos nósotros para cubrir pending: true/1
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
                // Si un item falla, continuamos con los demás
            }
        }

        // Avisar a todas las páginas controladas para que refresquen
        const cl = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        cl.forEach((c) => c.postMessage({ type: 'SYNC_DONE' }));
    } catch {
        // noop
    }
}

// Background Sync (cuando vuelva la red)
self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_TAG) {
        event.waitUntil(syncPending());
    }
});

// Mensaje directo desde la página para forzar sync ahora
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_NOW') {
        event.waitUntil(syncPending());
    }
});

// ---------- Push (opcional) ----------
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

// ---------- Fallback de navegación (offline) ----------
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const r = await fetch(event.request);
                    if (r && r.ok) return r;
                } catch { }
                return (await caches.match('/offline.html')) || (await caches.match('/index.html'));
            })()
        );
    }
});
