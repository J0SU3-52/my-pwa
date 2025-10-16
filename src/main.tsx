import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './registerSW';

async function ensurePersistence() {
  try {
    if (navigator.storage?.persist && navigator.storage?.persisted) {
      const already = await navigator.storage.persisted();
      if (!already) {
        await navigator.storage.persist();
      }
    }
  } catch (err) {
    console.error('Error asegurando persistencia', err);
  }
}
ensurePersistence();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
