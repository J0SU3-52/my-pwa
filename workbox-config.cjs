module.exports = {
    globDirectory: 'dist',
    globPatterns: ['**/*.{html,js,css,svg,png,ico,webp}'],
    swDest: 'dist/sw.js',
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: '/index.html',
    importScripts: ['sw-custom.js'],
    runtimeCaching: [
        // 2) Imágenes -> Stale-While-Revalidate
        {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'images',
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
        },
        // 3) Datos de API -> Network-First
        {
            urlPattern: ({ url }) => url.origin !== self.location.origin,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'api',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
            }
        }
    ]
};