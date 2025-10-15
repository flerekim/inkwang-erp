'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'F5', description: '데이터 새로고침' },
    { key: 'F6', description: '새로운 행 추가' },
    { key: 'F7', description: '선택한 행 삭제' },
    { key: 'F8', description: '테이블 인쇄' },
    { key: 'Enter', description: '편집 완료 및 저장' },
    { key: 'Escape', description: '편집 취소' },
    { key: 'Tab', description: '다음 셀로 이동' },
    { key: 'Shift+Tab', description: '이전 셀로 이동' },
    { key: '더블클릭', description: '셀 편집 모드 활성화' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Keyboard className="mr-2 h-4 w-4" />
          단축키
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
          <DialogDescription>
            다음 단축키를 사용하여 빠르게 작업할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between"
            >
              <kbd className="px-3 py-1.5 text-sm font-semibold bg-muted rounded border">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
