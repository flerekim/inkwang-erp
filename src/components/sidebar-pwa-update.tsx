'use client';

/**
 * SidebarPWAUpdate 컴포넌트
 * @description 사이드바 하단에 표시되는 PWA 업데이트 알림 배너
 * @requires Next.js 15
 *
 * 동작 방식:
 * - Service Worker 업데이트 감지 시 표시
 * - [업데이트] 버튼 클릭 시 새 버전 활성화 및 페이지 새로고침
 * - 컴팩트한 배너 디자인 (설치 배너와 동일한 스타일)
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';

export function SidebarPWAUpdate() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Service Worker 업데이트 이벤트 리스너
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorker>;
      setWaitingWorker(customEvent.detail);
      setShowUpdate(true);
    };

    window.addEventListener('swUpdateAvailable', handleUpdate);

    return () => {
      window.removeEventListener('swUpdateAvailable', handleUpdate);
    };
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;

    // 새 Service Worker에게 skipWaiting 메시지 전송
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // 새 Service Worker가 활성화되면 페이지 새로고침
    waitingWorker.addEventListener('statechange', (event) => {
      const sw = event.target as ServiceWorker;
      if (sw.state === 'activated') {
        window.location.reload();
      }
    });
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="border-t bg-gradient-to-r from-blue-600 to-blue-500 p-3">
      <div className="flex items-center gap-2 text-white">
        <RefreshCw className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-0 truncate opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
          새 버전 사용 가능
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          className="h-7 px-3 text-xs flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
        >
          업데이트
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-white/80 hover:text-white hover:bg-white/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
          onClick={handleDismiss}
          aria-label="업데이트 알림 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
