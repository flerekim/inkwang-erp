'use client';

import * as React from 'react';
import { FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { OrdersTable } from './orders-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { OrderWithDetails } from '@/types';

interface OrdersPageClientProps {
  orders: OrderWithDetails[];
}

export function OrdersPageClient({ orders }: OrdersPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter((o) => o.contract_status === 'in_progress').length;
    const completed = orders.filter((o) => o.contract_status === 'completed').length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.contract_amount), 0);

    return { total, inProgress, completed, totalAmount };
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader title="수주관리" description="전체 계약 정보를 관리합니다" />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 계약"
          value={stats.total}
          description="등록된 전체 계약 수"
          icon={FileText}
        />
        <StatsCard
          title="진행 중"
          value={stats.inProgress}
          description="현재 진행 중인 계약"
          icon={Clock}
        />
        <StatsCard
          title="완료"
          value={stats.completed}
          description="완료된 계약"
          icon={CheckCircle}
        />
        <StatsCard
          title="계약금액 합계"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="전체 계약금액"
          icon={DollarSign}
        />
      </div>

      {/* 수주 테이블 */}
      <OrdersTable data={orders} />
    </div>
  );
}
