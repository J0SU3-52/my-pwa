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
        // en workbox-config.cjs, dentro de runtimeCaching:
        {
            urlPattern: ({ url }) => url.origin !== self.location.origin, // o tu dominio de API
            handler: 'NetworkFirst',
            options: {
                cacheName: 'api',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }
            }
        }
    ]
};
