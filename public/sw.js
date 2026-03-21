const CACHE_NAME = 'palmoni-v5';
const STATIC_ASSETS = [
  '/offline.html'
];

// 절대 캐시하지 않을 도메인/경로
const NO_CACHE_PATTERNS = [
  'supabase.co',
  'supabase.io',
  'googleapis.com',
  'gstatic.com',
  'stripe.com',
  'chrome-extension',
  '/api/',
  'firebase'
];

// 캐시하지 않을 파일 확장자 (동적 콘텐츠)
const NO_CACHE_EXTENSIONS = [
  '.html',
  '.js',
  '.css',
  '.json'
];

// Install event - 최소한의 오프라인 페이지만 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // 즉시 활성화
  self.skipWaiting();
});

// Activate event - 이전 캐시 모두 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // 모든 클라이언트 즉시 제어
  self.clients.claim();
});

// Fetch event - Network First 전략 (캐시 최소화)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET 요청만 처리
  if (request.method !== 'GET') return;

  // 캐시하지 않을 요청들
  if (NO_CACHE_PATTERNS.some(pattern => request.url.includes(pattern))) {
    return;
  }

  // 네비게이션 요청 (HTML 페이지)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // JS/CSS/HTML 등 동적 콘텐츠는 캐시하지 않음 (항상 네트워크에서)
  if (NO_CACHE_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(fetch(request));
    return;
  }

  // 이미지/폰트만 캐시: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 이미지/폰트만 캐시
        if (response.ok && url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|webp)$/)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 찾기
        return caches.match(request);
      })
  );
});

// 앱에서 캐시 초기화 메시지 수신
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    // 현재 캐시 버전만 유지하고 나머지 삭제
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name !== CACHE_NAME) {
          caches.delete(name);
        }
      });
    });
  }
  if (event.data === 'clearAllCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});
