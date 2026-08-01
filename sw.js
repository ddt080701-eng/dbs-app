// =============================================================================
// dbs 工具箱 Service Worker
// 策略：缓存优先，网络回退
// =============================================================================
const SW_VERSION = 'dbs-app-v2.17.0';
const CACHE_NAME = `dbs-cache-${SW_VERSION}`;

// 需要预缓存的核心静态文件
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json'
];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        // 预缓存失败不阻断安装，运行时再逐个缓存
        console.warn('[SW] precache partial fail:', err);
      })
  );
});

// 激活：清理旧版本缓存并接管控制
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 跳过跨域请求与 chrome-extension
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 跳过 manifest 自身的请求交由浏览器处理（避免循环）
  if (url.pathname.endsWith('/manifest.json')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 缓存命中：直接返回，同时后台更新缓存（stale-while-revalidate）
      if (cachedResponse) {
        fetchAndUpdate(request);
        return cachedResponse;
      }
      // 缓存未命中：走网络，成功后写入缓存
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // 网络失败且无缓存：对导航请求返回缓存的 index.html（离线可用）
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('离线且无缓存', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    })
  );
});

// 后台更新缓存（不阻塞响应）
function fetchAndUpdate(request) {
  fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
    })
    .catch(() => {
      // 静默失败：离线时忽略
    });
}

// 接收消息：手动触发立即更新
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
