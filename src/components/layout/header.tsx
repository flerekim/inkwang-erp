'use client';

import Link from 'next/link';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserNav } from './user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import type { UserWithDetails } from '@/types';

interface HeaderProps {
  user: UserWithDetails;
  onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b">
      <div className="flex h-full items-center gap-4 px-4 lg:px-6">
        {/* 모바일 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <div className="px-3 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center whitespace-nowrap transition-opacity hover:opacity-90 cursor-pointer">
            <span className="text-sidebar-primary-foreground text-sm font-bold">인광 ONE</span>
          </div>
        </Link>

        {/* 검색 (데스크톱) */}
        <div className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="검색 작업"
              className="pl-10 pr-16 h-9 bg-muted/50"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* 우측 액션 버튼들 */}
        <div className="flex flex-1 items-center justify-end gap-1">
          {/* 검색 (모바일) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* 알림 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* 다크모드 전환 */}
          <ThemeToggle />

          {/* 사용자 메뉴 */}
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
