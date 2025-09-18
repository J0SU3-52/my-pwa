// src/registerSW.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => console.log('SW registrado'))
      .catch((err) => console.error('SW error', err));
  });
}
