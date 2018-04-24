const PAGE_ROOT = '/test/';
const CACHE_NAME = 'emojicache';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log("Attempting cache");
            return cache.addAll([
                `${PAGE_ROOT}/index.html`,
                `${PAGE_ROOT}/js/emojibuilder.js`,
                `${PAGE_ROOT}/css/style.css`
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