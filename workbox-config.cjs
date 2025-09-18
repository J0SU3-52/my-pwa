// workbox-config.cjs
module.exports = {
    globDirectory: 'dist',
    globPatterns: ['**/*.{html,js,css,svg,png,jpg,jpeg,webp,ico}'],
    swDest: 'dist/sw.js',
    clientsClaim: true,
    skipWaiting: true,
    cleanupOutdatedCaches: true,
    // Para SPA routing offline:
    navigateFallback: 'index.html',
    // Ejemplo de runtime caching para imágenes:
    runtimeCaching: [
        {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'images',
                expiration: { maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
        }
    ]
};
