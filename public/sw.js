/**
 * Service Worker for 인광 ERP
 * @description PWA 기능 제공하며 Supabase 인증과 충돌하지 않는 보수적 캐싱 전략
 * @strategy
 * - 정적 자산만 캐싱 (이미지, 폰트, 아이콘)
 * - 모든 인증/API 요청은 Service Worker 바이패스
 * - Network First: 네트워크 우선, 캐시는 오프라인 백업용
 */

const CACHE_VERSION = 'v4';
const STATIC_CACHE = `inkwang-erp-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `inkwang-erp-images-${CACHE_VERSION}`;

// PWA 필수 파일만 사전 캐싱
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// 캐시 가능한 정적 자산 확장자
const CACHEABLE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];

/**
 * 요청이 캐시 가능한 정적 자산인지 확인
 */
function isCacheableAsset(url) {
  const pathname = url.pathname.toLowerCase();
  return CACHEABLE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Service Worker가 절대 개입하면 안 되는 요청인지 확인
 */
function shouldBypassServiceWorker(request, url) {
  // GET 요청이 아니면 바이패스 (POST, PUT, DELETE 등)
  if (request.method !== 'GET') {
    return true;
  }

  // Supabase 관련 모든 요청 바이패스
  if (url.hostname.includes('supabase.co')) {
    return true;
  }

  // 인증 관련 경로 바이패스
  if (
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.includes('/callback') ||
    url.pathname.includes('/login') ||
    url.pathname.includes('/logout')
  ) {
    return true;
  }

  // API 엔드포인트 바이패스
  if (url.pathname.startsWith('/api/')) {
    return true;
  }

  // Next.js 데이터 요청 바이패스 (_next/data)
  if (url.pathname.includes('/_next/data/')) {
    return true;
  }

  // HTML 페이지는 항상 네트워크 우선 (캐시 안 함)
  if (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    !url.pathname.includes('.')
  ) {
    return true;
  }

  return false;
}

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v4...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Precaching PWA assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Precache failed:', error);
      })
  );
  // 즉시 활성화하지 않음 - 사용자가 업데이트를 승인해야 함
});

// 메시지 이벤트 처리 (업데이트 활성화)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Activating new version...');
    self.skipWaiting();
  }
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v4...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 현재 버전이 아닌 모든 캐시 삭제
              return (
                cacheName !== STATIC_CACHE &&
                cacheName !== IMAGE_CACHE &&
                cacheName.startsWith('inkwang-erp-')
              );
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch 이벤트 처리 (보수적 전략)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Service Worker를 바이패스해야 하는 요청
  if (shouldBypassServiceWorker(request, url)) {
    // Service Worker가 전혀 개입하지 않음
    return;
  }

  // 정적 자산만 캐싱 (이미지, 폰트 등)
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // 캐시가 있으면 반환하면서 백그라운드에서 업데이트
        if (cachedResponse) {
          // Stale-While-Revalidate 전략
          fetch(request)
            .then((freshResponse) => {
              if (freshResponse && freshResponse.ok) {
                caches.open(IMAGE_CACHE).then((cache) => {
                  cache.put(request, freshResponse.clone());
                });
              }
            })
            .catch(() => {
              // 네트워크 실패는 무시 (캐시된 버전 사용)
            });
          return cachedResponse;
        }

        // 캐시가 없으면 네트워크에서 가져와서 캐싱
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 그 외 모든 요청은 Service Worker가 개입하지 않음
  // (네트워크로 직접 전달)
});
