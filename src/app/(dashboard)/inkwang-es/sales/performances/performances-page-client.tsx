'use client';

import * as React from 'react';
import { FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { PerformancesTable } from './performances-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { PerformanceWithDetails } from '@/types';

interface PerformancesPageClientProps {
  performances: PerformanceWithDetails[];
}

/**
 * 실적관리 페이지 클라이언트 컴포넌트
 *
 * 서버 컴포넌트에서 받은 데이터를 클라이언트 테이블에 전달하는 래퍼
 */
export function PerformancesPageClient({ performances }: PerformancesPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = performances.length;
    const planned = performances.filter((p) => p.performance_type === 'planned').length;
    const confirmed = performances.filter((p) => p.performance_type === 'confirmed').length;
    const totalAmount = performances.reduce((sum, p) => sum + Number(p.performance_amount || 0), 0);

    return { total, planned, confirmed, totalAmount };
  }, [performances]);

  return (
    <div className="space-y-6">
      <PageHeader title="실적관리" description="수주관리와 연동된 실적 등록 및 관리" />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 실적"
          value={stats.total}
          description="등록된 전체 실적 수"
          icon={FileText}
        />
        <StatsCard
          title="예정 실적"
          value={stats.planned}
          description="예정된 실적"
          icon={Clock}
        />
        <StatsCard
          title="확정 실적"
          value={stats.confirmed}
          description="확정된 실적"
          icon={CheckCircle}
        />
        <StatsCard
          title="실적금액 합계"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="전체 실적금액"
          icon={DollarSign}
        />
      </div>

      {/* 실적 테이블 */}
      <PerformancesTable data={performances} />
    </div>
  );
}
