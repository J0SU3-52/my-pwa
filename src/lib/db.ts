import { openDB } from 'idb';

export type Entry = {
  id?: number;
  title: string;
  note?: string;
  createdAt: number;
  pending: 0 | 1 | boolean;
};

const DB_NAME = 'app-db';
const STORE = 'entries';
const LS_KEY = 'entries_fallback'; // respaldo cuando IndexedDB no esté disponible

function lsRead(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}
function lsWrite(all: Entry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch (e) {
    // Evita no-empty: si storage está lleno/bloqueado, no rompemos el flujo
    console.warn('[IDB] localStorage write failed', e);
  }
}

export async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('pending', 'pending');
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

export async function addEntry(entry: Entry) {
  try {
    const db = await getDB();
    await db.add(STORE, entry);
  } catch {
    const all = lsRead();
    const id = Date.now();
    all.push({ ...entry, id });
    lsWrite(all);
  }
}

export async function listEntries(): Promise<Entry[]> {
  try {
    const db = await getDB();
    return (await db.getAll(STORE)) as Entry[];
  } catch {
    return lsRead();
  }
}

export async function listPending(): Promise<Entry[]> {
  try {
    const db = await getDB();
    const all = (await db.getAll(STORE)) as Entry[];
    return all.filter((e) => e.pending === true || e.pending === 1);
  } catch {
    return lsRead().filter((e) => e.pending === true || e.pending === 1);
  }
}

export async function updateEntry(id: number, patch: Partial<Entry>) {
  try {
    const db = await getDB();
    const old = (await db.get(STORE, id)) as Entry | undefined;
    if (!old) return;
    await db.put(STORE, { ...old, ...patch });
  } catch {
    const all = lsRead().map((e) => (e.id === id ? { ...e, ...patch } : e));
    lsWrite(all);
  }
}

export async function removeEntry(id: number) {
  try {
    const db = await getDB();
    await db.delete(STORE, id);
  } catch {
    const remain = lsRead().filter((e) => e.id !== id);
    lsWrite(remain);
  }
}
