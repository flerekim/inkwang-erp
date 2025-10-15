'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcutsOptions {
  onRefresh?: () => void;
  onAddRow?: () => void;
  onDeleteRow?: () => void;
  onPrint?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onRefresh,
  onAddRow,
  onDeleteRow,
  onPrint,
  enabled = true,
}: KeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // F5: 새로고침
      if (e.key === 'F5') {
        e.preventDefault();
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
        toast({
          title: '새로고침',
          description: '데이터를 새로고침했습니다.',
        });
      }

      // F6: 행 추가
      if (e.key === 'F6') {
        e.preventDefault();
        if (onAddRow) {
          onAddRow();
          toast({
            title: '행 추가',
            description: '새로운 행을 추가합니다.',
          });
        }
      }

      // F7: 선택행 삭제
      if (e.key === 'F7') {
        e.preventDefault();
        if (onDeleteRow) {
          onDeleteRow();
        }
      }

      // F8: 인쇄
      if (e.key === 'F8') {
        e.preventDefault();
        if (onPrint) {
          onPrint();
        } else {
          window.print();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onRefresh, onAddRow, onDeleteRow, onPrint, router, toast]);
}
