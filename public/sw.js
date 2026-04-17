const CACHE_NAME = 'palmoni-v9';
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

  // GET 요청만 처리, 나머지는 브라우저 기본 동작
  if (request.method !== 'GET') return;

  // URL 파싱 에러 방지
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // 캐시하지 않을 요청들은 브라우저 기본 동작으로
  if (NO_CACHE_PATTERNS.some(pattern => request.url.includes(pattern))) {
    return;
  }

  // 네비게이션 요청 (HTML 페이지)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html').then(response => {
          return response || new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // JS/CSS/HTML 등 동적 콘텐츠는 브라우저 기본 동작으로 (캐시 안함)
  if (NO_CACHE_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    return;
  }

  // 이미지/폰트만 캐시: Network First
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|webp)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(response => {
            return response || new Response('', { status: 404 });
          });
        })
    );
  }
  // 그 외 요청은 브라우저 기본 동작
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
