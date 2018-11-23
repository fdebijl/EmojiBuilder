const PAGE_ROOT = '';
const CACHE_NAME = 'emojicache';

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            return cache.addAll([
                `${PAGE_ROOT}/index.html`,
                `${PAGE_ROOT}/manifest.json`,
                `${PAGE_ROOT}/js/emojibuilder.js`,
                `${PAGE_ROOT}/js/emojibuilder.min.js`,
                `${PAGE_ROOT}/css/style.css`,
                `${PAGE_ROOT}/css/style.min.css`,
                `${PAGE_ROOT}/svgs_detailed.json`,
                `${PAGE_ROOT}/svgs_latest.json`,
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
                `${PAGE_ROOT}/favicon/mstile-150x150.png`,
                `${PAGE_ROOT}/favicon/safari-pinned-tabs.svg`
            ]);
        })
        .catch((error) => {
            console.error(error);
        })
    );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(event.request).then(function (response) {
        return response || fetch(event.request).then(function(response) {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
