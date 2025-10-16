import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './registerSW';

// Pide almacenamiento persistente (mejor fiabilidad en móvil)
async function ensurePersistence() {
  try {
    if (navigator.storage?.persist && navigator.storage?.persisted) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch {
    // no hacer nada
  }
}
ensurePersistence();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
