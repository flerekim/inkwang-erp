'use client';

import * as React from 'react';
import { DollarSign, CheckCircle, Clock, Wallet } from 'lucide-react';
import { CollectionsTable } from './collections-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { CollectionWithDetails } from '@/types';

interface CollectionsPageClientProps {
  collections: CollectionWithDetails[];
}

export function CollectionsPageClient({ collections }: CollectionsPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = collections.length;

    // 수금액 합계
    const totalAmount = collections.reduce((sum, c) => sum + Number(c.collection_amount), 0);

    // 계좌이체 건수
    const bankTransfer = collections.filter((c) => c.collection_method === 'bank_transfer').length;

    // 기타 방법 건수
    const others = collections.filter((c) => c.collection_method === 'other').length;

    return { total, totalAmount, bankTransfer, others };
  }, [collections]);

  return (
    <div className="space-y-6">
      <PageHeader title="수금관리" description="청구 기반 수금 내역을 관리합니다" />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 수금"
          value={stats.total}
          description="등록된 전체 수금 건수"
          icon={Wallet}
        />
        <StatsCard
          title="수금액 합계"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="전체 수금금액"
          icon={DollarSign}
        />
        <StatsCard
          title="계좌이체"
          value={stats.bankTransfer}
          description="계좌이체 수금 건수"
          icon={CheckCircle}
        />
        <StatsCard
          title="기타"
          value={stats.others}
          description="기타 수금 건수"
          icon={Clock}
        />
      </div>

      {/* 수금 테이블 */}
      <CollectionsTable data={collections} />
    </div>
  );
}
