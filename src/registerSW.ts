if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then(() => console.log('SW registrado:', swUrl))
      .catch((e) => console.error('SW error:', e));
  });
}
