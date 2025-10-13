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
  const db = await getDB();
  await db.add(STORE, entry);
}

export async function listEntries(): Promise<Entry[]> {
  const db = await getDB();
  return db.getAll(STORE) as Promise<Entry[]>;
}

// Evitamos el error de TS usando filtro en memoria (soporta pending: true/false o 1/0)
export async function listPending(): Promise<Entry[]> {
  const db = await getDB();
  const all = (await db.getAll(STORE)) as Entry[];
  return all.filter((e) => e.pending === true || e.pending === 1);
}

export async function updateEntry(id: number, patch: Partial<Entry>) {
  const db = await getDB();
  const old = (await db.get(STORE, id)) as Entry | undefined;
  if (!old) return;
  await db.put(STORE, { ...old, ...patch });
}

export async function removeEntries(ids: number[]) {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}
