'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, Users, Award, CreditCard } from 'lucide-react';

const tabs = [
  {
    label: '회사 정보',
    href: '/admin/company/companies',
    icon: Building2,
  },
  {
    label: '부서 관리',
    href: '/admin/company/departments',
    icon: Users,
  },
  {
    label: '직급 관리',
    href: '/admin/company/positions',
    icon: Award,
  },
  {
    label: '은행계좌',
    href: '/admin/company/bank-accounts',
    icon: CreditCard,
  },
];

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="border-b">
        <nav className="flex space-x-8" aria-label="회사관리 탭">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 페이지 콘텐츠 */}
      {children}
    </div>
  );
}
