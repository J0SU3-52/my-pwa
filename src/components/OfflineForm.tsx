// src/components/OfflineForm.tsx
import React, { useEffect, useState } from 'react';
import { addEntry, listEntries, type Entry } from '../lib/db';

export default function OfflineForm() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [saving, setSaving] = useState(false);

  // Carga inicial + listeners de estado y mensajes del SW
  useEffect(() => {
    const refresh = async () => setItems(await listEntries());
    refresh();

    const onStatus = () => setOnline(navigator.onLine);
    window.addEventListener('online', onStatus);
    window.addEventListener('offline', onStatus);

    // Si el SW avisa que terminó de sincronizar, refrescamos lista
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_DONE') {
        refresh();
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', onSWMessage);

    return () => {
      window.removeEventListener('online', onStatus);
      window.removeEventListener('offline', onStatus);
      navigator.serviceWorker?.removeEventListener?.('message', onSWMessage);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !note.trim()) return;

    setSaving(true);
    const createdAt = Date.now();

    try {
      // Guarda local: pending 1 si offline, 0 si online
      await addEntry({
        title: title.trim(),
        note: note.trim(),
        createdAt,
        pending: navigator.onLine ? 0 : 1,
      });

      // Si offline: registra Background Sync (si existe)
      if (
        !navigator.onLine &&
        'serviceWorker' in navigator &&
        'SyncManager' in window
      ) {
        const reg = await navigator.serviceWorker.ready;
        const anyReg = reg as unknown as {
          sync?: { register: (tag: string) => Promise<void> };
        };
        await anyReg.sync?.register('sync-entries');
        // console.log('[App] Background Sync registrado');
      } else if (navigator.onLine && 'serviceWorker' in navigator) {
        // Si estamos online, pide al SW que sincronice ahora
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'SYNC_NOW' });
      }
    } catch {
      // Si IndexedDB falla (p.ej. restricciones del navegador), lo verás aquí
      alert(
        'No se pudo guardar localmente. Revisa permisos de almacenamiento.'
      );
      // console.error('Error guardando entrada', err);
    } finally {
      setTitle('');
      setNote('');
      setSaving(false);
      setItems(await listEntries());
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '2rem auto' }}>
      <h2>Reporte offline (IndexedDB)</h2>

      <p style={{ color: online ? 'lightgreen' : 'salmon', marginTop: -8 }}>
        Estado: {online ? 'Online' : 'Offline'}
      </p>

      {!online && (
        <p style={{ fontSize: 12, opacity: 0.8, marginTop: -8 }}>
          Sin conexión: tus envíos se guardarán y se sincronizarán al volver a
          estar en línea.
        </p>
      )}

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
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
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
