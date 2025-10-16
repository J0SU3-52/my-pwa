module.exports = {
    globDirectory: 'dist',
    globPatterns: ['**/*.{html,js,css,svg,png,ico,webp}'],
    swDest: 'dist/sw.js',
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: '/index.html',
    importScripts: ['sw-custom.js'], // este archivo debe existir en dist/
    runtimeCaching: [
        {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images' }
        },
        {
            urlPattern: ({ url }) => url.origin !== self.location.origin,
            handler: 'NetworkFirst',
            options: { cacheName: 'api', networkTimeoutSeconds: 3 }
        }
    ]
};
