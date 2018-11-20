const PAGE_ROOT = '.';
const CACHE_NAME = 'emojicache';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            return cache.addAll([
                `${PAGE_ROOT}/index.html`,
                `${PAGE_ROOT}/js/emojibuilder.js`,
                `${PAGE_ROOT}/css/style.css`,
                `${PAGE_ROOT}/svgs.json`,
                `${PAGE_ROOT}/img/backward.png`,
                `${PAGE_ROOT}/img/clear.png`,
                `${PAGE_ROOT}/img/copy.png`,
                `${PAGE_ROOT}/img/delete.png`,
                `${PAGE_ROOT}/img/download.png`,
                `${PAGE_ROOT}/img/forward.png`,
                `${PAGE_ROOT}/img/handle.png`,
                `${PAGE_ROOT}/img/info.png`,
                `${PAGE_ROOT}/img/logo.svg`,
                `${PAGE_ROOT}/img/oval.svg`,
                `${PAGE_ROOT}/favicon/android-chrome-192x192.png`,
                `${PAGE_ROOT}/favicon/android-chrome-512x512.png`,
                `${PAGE_ROOT}/favicon/apple-touch-icon.png`,
                `${PAGE_ROOT}/favicon/browserconfig.xml`,
                `${PAGE_ROOT}/favicon/favicon-16x16.png`,
                `${PAGE_ROOT}/favicon/favicon-32x32.png`,
                `${PAGE_ROOT}/favicon/favicon.ico`,
                `${PAGE_ROOT}/favicon/manifest.json`,
                `${PAGE_ROOT}/favicon/mstile-150x150.png`,
                `${PAGE_ROOT}/favicon/safari-pinned-tabs.svg`
            ]);
        })
        .catch((error) => {
            console.error(error);
        })
    );
});

self.addEventListener('fetch', function (event) {
    let requestURL = new URL(event.request.url);

    let freshResource = fetch(event.request).then(function (response) {
        let clonedResponse = response.clone();
        // Don't update the cache with error pages!
        if (response.ok) {
            // All good? Update the cache with the network response
            caches.open(CACHE_NAME).then(function (cache) {
                cache.put(event.request, clonedResponse);
            });
        }
        return response;
    });

    let cachedResource = caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(event.request).then(function(response) {
            return response || freshResource;
        });
    }).catch(function (e) {
        console.error(e);
        return freshResource;
    });

    event.respondWith(cachedResource);
});
