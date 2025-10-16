import React, { useEffect, useMemo, useState } from 'react';
import {
  addEntry,
  listEntries,
  removeEntry,
  updateEntry,
  type Entry,
} from '../lib/db';

type SWWithSync = ServiceWorkerRegistration & {
  sync?: { register(tag: string): Promise<void> };
};

// --- Plan B: sincronizar desde la página si no hay SyncManager o el SW no corre
async function syncNowFromPage() {
  try {
    // Traemos sólo pendientes desde la BD de la página
    const db = await import('../lib/db');
    const pendings: Entry[] =
      typeof db.listPending === 'function' ? await db.listPending() : [];
    if (!pendings.length) return;

    for (const it of pendings) {
      try {
        await fetch('https://httpbin.org/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: it.title,
            note: it.note,
            createdAt: it.createdAt,
          }),
        });
        await updateEntry(it.id as number, { pending: 0 });
      } catch {
        // ignorar item fallido y continuar
      }
    }
  } catch {
    // noop
  }
}

export default function OfflineForm() {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Entry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [saving, setSaving] = useState(false);

  const pendientes = useMemo(
    () => items.filter((e) => e.pending === 1 || e.pending === true).length,
    [items]
  );

  const refresh = async () =>
    setItems(
      (await listEntries()).slice().sort((a, b) => b.createdAt - a.createdAt)
    );

  useEffect(() => {
    refresh();

    const onStatus = () => {
      setOnline(navigator.onLine);
      // Si volvimos online: pide al SW sincronizar y ejecuta plan B
      if (navigator.onLine) {
        navigator.serviceWorker?.ready.then((reg) =>
          reg.active?.postMessage({ type: 'SYNC_NOW' })
        );
        syncNowFromPage().then(() => refresh());
      }
    };

    window.addEventListener('online', onStatus);
    window.addEventListener('offline', onStatus);

    // Si el SW avisa que terminó, refrescamos
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SYNC_DONE') refresh();
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
      await addEntry({
        title: title.trim(),
        note: note.trim(),
        createdAt,
        pending: navigator.onLine ? 0 : 1,
      });

      if (
        !navigator.onLine &&
        'serviceWorker' in navigator &&
        'SyncManager' in window
      ) {
        const reg = (await navigator.serviceWorker.ready) as SWWithSync;
        try {
          await reg.sync?.register('sync-entries');
        } catch (err) {
          console.warn('[App] No se pudo registrar sync', err);
        }
      } else if (navigator.onLine && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'SYNC_NOW' });
      }
    } catch {
      alert(
        'No se pudo guardar localmente. Revisa permisos de almacenamiento.'
      );
    } finally {
      setTitle('');
      setNote('');
      setSaving(false);
      refresh();
    }
  };

  const onDelete = async (id?: number) => {
    if (id == null) return;
    await removeEntry(id);
    refresh();
  };

  return (
    <div style={{ maxWidth: 680, margin: '1.5rem auto', padding: '0 1rem' }}>
      {!online && (
        <div
          style={{
            background: '#d97706',
            color: '#111',
            padding: '10px 12px',
            borderRadius: 12,
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Estás sin conexión. Tus datos se guardarán localmente y se mostrarán
          al recargar.
        </div>
      )}

      <h2 style={{ fontSize: 32, margin: 0 }}>Reporte / Tareas (Offline)</h2>

      <p style={{ marginTop: 6, opacity: 0.9 }}>
        Estado:{' '}
        <b style={{ color: online ? 'lightgreen' : '#fca5a5' }}>
          {online ? 'Online' : 'Offline'}
        </b>
        {' · '}
        <span>
          {pendientes} pendiente{pendientes === 1 ? '' : 's'}
        </span>
      </p>

      <form
        onSubmit={submit}
        style={{ display: 'grid', gap: 10, marginTop: 10 }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Estudiar PWA / Hacer ejercicio"
          required
          style={{
            padding: 12,
            borderRadius: 12,
            border: '1px solid #333',
            background: '#0b1220',
            color: '#fff',
          }}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Detalles opcionales…"
          rows={4}
          style={{
            padding: 12,
            borderRadius: 12,
            border: '1px solid #333',
            background: '#0b1220',
            color: '#fff',
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '14px 16px',
            borderRadius: 999,
            border: 0,
            background: '#7c3aed',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {saving ? 'Guardando…' : online ? 'Guardar' : 'Guardar (offline OK)'}
        </button>
      </form>

      <h3 style={{ marginTop: 24, fontSize: 24 }}>Entradas guardadas</h3>

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {items.map((it) => (
          <li
            key={it.id}
            style={{
              border: '1px solid #2a2a2a',
              borderRadius: 16,
              padding: 16,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
            }}
          >
            <div>
              <b style={{ fontSize: 18 }}>{it.title}</b>
              <br />
              <small style={{ opacity: 0.85 }}>
                {new Date(it.createdAt).toLocaleString()} ·{' '}
                {it.pending === 1 || it.pending === true
                  ? '⏳ pendiente de sincronizar'
                  : '✓ sincronizado'}
              </small>
              {it.note && <p style={{ marginTop: 8 }}>{it.note}</p>}
            </div>
            <button
              onClick={() => onDelete(it.id)}
              style={{
                border: '1px solid #444',
                borderRadius: 14,
                background: 'transparent',
                color: '#fff',
                padding: '8px 14px',
              }}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
