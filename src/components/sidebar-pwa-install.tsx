'use client';

/**
 * SidebarPWAInstall 컴포넌트
 * @description 사이드바 하단에 고정되는 컴팩트한 PWA 설치 배너
 * @requires Next.js 15, Framer Motion
 *
 * UX 개선 사항:
 * - localStorage를 사용하여 사용자 선택 저장
 * - 닫기 클릭 시 7일간 다시 표시하지 않음
 * - 설치 거부 시 30일간 다시 표시하지 않음
 * - 페이지 로드 후 3초 뒤에 표시 (즉시 표시하지 않음)
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa-install-prompt-sidebar';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일 (밀리초)
const REJECT_DURATION = 30 * 24 * 60 * 60 * 1000; // 30일 (밀리초)
const SHOW_DELAY = 3000; // 3초 후 표시

export function SidebarPWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // localStorage에서 이전 선택 확인
    const checkPromptStatus = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { timestamp, action } = JSON.parse(stored);
        const now = Date.now();

        // 'dismiss' 액션은 7일, 'reject' 액션은 30일간 표시 안함
        if (action === 'dismiss' && now - timestamp < DISMISS_DURATION) {
          return false;
        }
        if (action === 'reject' && now - timestamp < REJECT_DURATION) {
          return false;
        }
      }
      return true;
    };

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 프롬프트 표시 가능 여부 확인 후 3초 뒤에 표시
      if (checkPromptStatus()) {
        setTimeout(() => {
          setShowPrompt(true);
        }, SHOW_DELAY);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // 설치 프롬프트 표시
    deferredPrompt.prompt();

    // 사용자 선택 대기
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      // 설치 수락 - 프롬프트 완전히 제거
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), action: 'accepted' })
      );
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // 설치 거부 - 30일간 표시 안함
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ timestamp: Date.now(), action: 'reject' })
      );
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    // 닫기 클릭 - 7일간 표시 안함
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), action: 'dismiss' })
    );
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="border-t bg-gradient-to-r from-primary to-primary/80 p-3">
      <div className="flex items-center gap-2 text-primary-foreground">
        <Download className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium flex-1 min-w-0 truncate opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
          앱 설치
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleInstall}
          className="h-7 px-3 text-xs flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
        >
          설치
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
          onClick={handleDismiss}
          aria-label="설치 프롬프트 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
