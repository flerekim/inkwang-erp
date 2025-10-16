'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  ChevronRight,
  HelpCircle,
  LogOut,
  Database,
  UsersRound,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarPWAInstall } from '@/components/sidebar-pwa-install';
import { SidebarPWAUpdate } from '@/components/sidebar-pwa-update';
import type { UserWithDetails } from '@/types';
import type { Module, ModuleCode } from '@/lib/modules/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleCode?: ModuleCode; // DB의 모듈 코드와 매핑
  children?: NavItem[];
  badge?: number;
}

// 모든 네비게이션 아이템 정의 (모듈 기반 필터링 전)
const allNavItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/',
    icon: LayoutDashboard,
    // 대시보드는 모든 사용자 접근 가능
  },
  {
    title: '인광이에스',
    href: '/inkwang-es',
    icon: Building2,
    moduleCode: 'inkwang-es', // 모듈 코드로 접근 제어
    children: [
      {
        title: '기초관리',
        href: '/inkwang-es/basics',
        icon: Database,
        children: [
          {
            title: '고객관리',
            href: '/inkwang-es/basics/customers',
            icon: UsersRound,
          },
        ],
      },
      {
        title: '영업관리',
        href: '/inkwang-es/sales',
        icon: FileText,
        children: [
          {
            title: '수주관리',
            href: '/inkwang-es/sales/orders',
            icon: FileText,
          },
        ],
      },
    ],
  },
  {
    title: '관리자',
    href: '/admin',
    icon: Settings,
    moduleCode: 'admin', // 모듈 코드로 접근 제어
    children: [
      {
        title: '사원관리',
        href: '/admin/employees',
        icon: Users,
      },
      {
        title: '회사관리',
        href: '/admin/company',
        icon: Building2,
        children: [
          {
            title: '회사 정보',
            href: '/admin/company/companies',
            icon: Building2,
          },
          {
            title: '부서 관리',
            href: '/admin/company/departments',
            icon: Building2,
          },
          {
            title: '직급 관리',
            href: '/admin/company/positions',
            icon: Building2,
          },
          {
            title: '은행계좌',
            href: '/admin/company/bank-accounts',
            icon: Building2,
          },
        ],
      },
    ],
  },
];

interface SidebarProps {
  user: UserWithDetails;
  modules: Module[];
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ modules, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // 사용자가 접근 가능한 모듈 코드 Set 생성 (빠른 조회)
  const accessibleModuleCodes = React.useMemo(() => {
    return new Set(modules.map((m) => m.code));
  }, [modules]);

  // 모듈 기반으로 네비게이션 아이템 필터링
  const filteredNavItems = React.useMemo(() => {
    return allNavItems.filter((item) => {
      // moduleCode가 없으면 모든 사용자 접근 가능 (예: 대시보드)
      if (!item.moduleCode) return true;

      // moduleCode가 있으면 사용자의 모듈 목록에 있는지 확인
      return accessibleModuleCodes.has(item.moduleCode);
    });
  }, [accessibleModuleCodes]);

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-label="사이드바 닫기"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'group fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-16 hover:w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0 !w-64' : '-translate-x-full'
        )}
        aria-label="메인 네비게이션"
      >
        {/* 스크롤 가능한 메뉴 영역 */}
        <ScrollArea className="flex-1 py-6">
          {/* MENU 섹션 */}
          <div className="px-4 mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              MENU
            </h2>
            <div className="space-y-1">
              {filteredNavItems.slice(0, 5).map((item) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>

          {/* GENERAL 섹션 */}
          <div className="px-4 mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 overflow-hidden whitespace-nowrap">
              GENERAL
            </h2>
            <div className="space-y-1">
              {filteredNavItems.slice(5).map((item) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onClose={onClose}
                />
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              >
                <HelpCircle className="h-4 w-4 shrink-0" />
                <span className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  도움말
                </span>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-10 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  로그아웃
                </span>
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* PWA 업데이트 배너 (설치 배너 위) */}
        <SidebarPWAUpdate />

        {/* PWA 설치 배너 (하단 고정) */}
        <SidebarPWAInstall />
      </aside>
    </>
  );
}

function NavItemComponent({
  item,
  pathname,
  onClose,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
  depth?: number;
}) {
  // 현재 경로가 자식 메뉴 중 하나와 일치하면 자동으로 펼침
  const shouldBeOpen = React.useMemo(() => {
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        pathname === child.href ||
        pathname.startsWith(child.href + '/') ||
        (child.children && child.children.some(
          (grandChild) =>
            pathname === grandChild.href || pathname.startsWith(grandChild.href + '/')
        ))
    );
  }, [item.children, pathname]);

  const [isOpen, setIsOpen] = React.useState(shouldBeOpen);

  // pathname이 변경되면 isOpen 상태 업데이트
  React.useEffect(() => {
    if (shouldBeOpen) {
      setIsOpen(true);
    }
  }, [shouldBeOpen]);

  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 h-10 text-sm font-medium transition-colors',
            isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
            !isActive && 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            depth > 0 && 'pl-10'
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            {item.title}
          </span>
          {item.badge && (
            <span className="ml-auto rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
              {item.badge}
            </span>
          )}
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-all duration-300 ease-in-out opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
              isOpen && 'rotate-90'
            )}
          />
        </Button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="mt-1 space-y-1 pl-2">
            {item.children?.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                pathname={pathname}
                onClose={onClose}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start gap-3 h-10 text-sm font-medium transition-colors',
        isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
        !isActive && 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        depth > 0 && 'pl-10'
      )}
      asChild
    >
      <Link href={item.href} onClick={onClose}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
          {item.title}
        </span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-muted-foreground/20 px-2 py-0.5 text-xs font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
            {item.badge}
          </span>
        )}
      </Link>
    </Button>
  );
}
