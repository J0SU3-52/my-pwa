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
  } catch {
    // no hacer nada
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
  } catch (e) {
    console.warn('[IDB] addEntry falló, usando localStorage', e);
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
  } catch (e) {
    console.warn('[IDB] listEntries falló, leyendo de localStorage', e);
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

export async function removeEntries(ids: number[]) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE, 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  } catch {
    const remain = lsRead().filter((e) => !ids.includes(e.id as number));
    lsWrite(remain);
  }
}
