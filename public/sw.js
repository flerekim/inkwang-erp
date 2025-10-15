/**
 * Service Worker for 인광 ERP
 * @description Next.js 15 호환 PWA Service Worker
 */

const CACHE_NAME = 'inkwang-erp-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';

// 캐시할 정적 파일 목록
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static files');
      return cache.addAll(STATIC_FILES);
    })
  );
  // 업데이트 시 사용자 확인 후 활성화하도록 skipWaiting() 제거
});

// 메시지 이벤트 처리 (업데이트 활성화)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] SKIP_WAITING message received');
    self.skipWaiting();
  }
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== CACHE_NAME
            );
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch 이벤트 처리 (Network First 전략)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase 인증 요청은 Service Worker에서 처리하지 않음 (redirect 문제 방지)
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('/callback')
  ) {
    return; // Service Worker가 개입하지 않음
  }

  // API 요청은 Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request, { redirect: 'follow' }) // redirect 명시적 허용
        .then((response) => {
          // redirect 응답은 캐시하지 않음
          if (response.type === 'opaqueredirect' || response.redirected) {
            return response;
          }

          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 정적 파일은 Cache First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request, { redirect: 'follow' }).then((response) => {
        // 유효한 응답만 캐시 (redirect 응답 제외)
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'error' ||
          response.type === 'opaqueredirect' ||
          response.redirected
        ) {
          return response;
        }

        const clonedResponse = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return response;
      });
    })
  );
});
