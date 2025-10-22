'use client';

import * as React from 'react';
import { FileText, AlertCircle, TrendingDown, DollarSign } from 'lucide-react';
import { ReceivablesTable } from './receivables-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { ReceivableWithDetails } from '@/types';

interface ReceivablesPageClientProps {
  receivables: ReceivableWithDetails[];
}

export function ReceivablesPageClient({ receivables }: ReceivablesPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = receivables.length;

    // 미수금 건수 (pending 상태)
    const pending = receivables.filter((r) => r.status === 'pending').length;

    // 장기/부실 채권 건수
    const problematic = receivables.filter(
      (r) => r.classification === 'overdue_long' || r.classification === 'bad_debt'
    ).length;

    // 총 채권금액 (잔액 기준)
    const totalAmount = receivables.reduce((sum, r) => sum + Number(r.remaining_amount || 0), 0);

    return { total, pending, problematic, totalAmount };
  }, [receivables]);

  return (
    <div className="space-y-6">
      <PageHeader title="채권관리" description="청구 기반 채권 추적 및 회수활동 관리" />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 채권"
          value={stats.total}
          description="등록된 전체 채권 건수"
          icon={FileText}
        />
        <StatsCard
          title="미수금"
          value={stats.pending}
          description="수금 대기 중인 채권"
          icon={AlertCircle}
        />
        <StatsCard
          title="장기/부실 채권"
          value={stats.problematic}
          description="90일 이상 경과"
          icon={TrendingDown}
        />
        <StatsCard
          title="총 채권금액"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="미수금 잔액 합계"
          icon={DollarSign}
        />
      </div>

      {/* 채권 테이블 */}
      <ReceivablesTable data={receivables} />
    </div>
  );
}
