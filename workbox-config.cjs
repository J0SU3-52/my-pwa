// workbox-config.cjs
module.exports = {
    globDirectory: 'dist',
    globPatterns: [
        '**/*.{js,css,html,ico,png,svg,webmanifest,json}',
        'offline.html'
    ],

    swDest: 'dist/sw.js',

    importScripts: ['sw-custom.js'],

    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MB
};
