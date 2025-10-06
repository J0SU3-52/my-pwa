// src/registerSW.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then(() => console.log('SW registrado en', swUrl))
      .catch((err) => console.error('SW error', err));
  });
}
