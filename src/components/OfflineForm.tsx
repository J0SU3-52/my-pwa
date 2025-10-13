import React, { useEffect, useState } from 'react';
import { addEntry, listEntries, type Entry } from '../lib/db';

export default function OfflineForm() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const refresh = async () => setItems(await listEntries());
    refresh();

    const onStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', onStatus);
    window.addEventListener('offline', onStatus);
    return () => {
      window.removeEventListener('online', onStatus);
      window.removeEventListener('offline', onStatus);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const createdAt = Date.now();

    // Guarda local: pending 1 si offline, 0 si online (consistente con DB)
    await addEntry({
      title,
      note,
      createdAt,
      pending: navigator.onLine ? 0 : 1,
    });

    // Si offline: intenta registrar Background Sync (TS: castear reg a any)
    if (
      !navigator.onLine &&
      'serviceWorker' in navigator &&
      'SyncManager' in window
    ) {
      const reg = await navigator.serviceWorker.ready;
      const anyReg = reg as unknown as {
        sync?: { register: (tag: string) => Promise<void> };
      };
      try {
        await anyReg.sync?.register('sync-entries');
        console.log('[App] Background Sync registrado');
      } catch (err) {
        console.warn('[App] No se pudo registrar sync', err);
      }
    } else if (navigator.onLine && 'serviceWorker' in navigator) {
      // Si estamos online, pide al SW que sincronice ahora
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({ type: 'SYNC_NOW' });
    }

    setTitle('');
    setNote('');
    setItems(await listEntries());
  };

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto' }}>
      <h2>Reporte offline (IndexedDB)</h2>
      <p style={{ color: online ? 'lightgreen' : 'salmon' }}>
        Estado: {online ? 'Online' : 'Offline'}
      </p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          required
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
        />
        <button type="submit">Guardar</button>
      </form>

      <hr />
      <h3>Registros</h3>
      <ul>
        {items
          .slice()
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((it) => (
            <li key={it.id}>
              <b>{it.title}</b> — {new Date(it.createdAt).toLocaleString()}{' '}
              {(it.pending === 1 || it.pending === true) && (
                <em>(pendiente)</em>
              )}
              {it.note ? <> — {it.note}</> : null}
            </li>
          ))}
      </ul>
    </div>
  );
}
