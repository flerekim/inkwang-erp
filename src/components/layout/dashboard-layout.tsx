'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import type { UserWithDetails } from '@/types';
import type { Module } from '@/lib/modules/types';

interface DashboardLayoutProps {
  user: UserWithDetails;
  modules: Module[];
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  modules,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-background">
      {/* 헤더 */}
      <Header user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* 사이드바 */}
      <Sidebar
        user={user}
        modules={modules}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 메인 컨텐츠 */}
      <main className="lg:pl-16 pt-16 transition-all duration-300">
        <div className="p-6 lg:p-8 animate-in fade-in-50 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
