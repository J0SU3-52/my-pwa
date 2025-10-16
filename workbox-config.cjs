// workbox-config.cjs
module.exports = {
    globDirectory: 'dist',
    globPatterns: [
        '**/*.{js,css,html,ico,png,svg,webmanifest,json}',
        'offline.html'
    ],
    // Opcional: ignora mapas si quieres
    // globIgnores: ['**/*.map'],

    swDest: 'dist/sw.js',

    // MUY IMPORTANTE: inyecta tu script con estrategias, sync, push, etc.
    importScripts: ['sw-custom.js'],

    // Tamaño máximo de archivos a precachear (sube si tienes imágenes grandes)
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB

    // Si no usaras tu handler de navegación, puedes activar navigateFallback:
    // navigateFallback: '/index.html',
};
