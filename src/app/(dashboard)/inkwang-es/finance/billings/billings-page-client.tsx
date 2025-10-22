'use client';

import * as React from 'react';
import { FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { BillingsTable } from './billings-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { BillingWithDetails } from '@/types';

interface BillingsPageClientProps {
  billings: BillingWithDetails[];
}

export function BillingsPageClient({ billings }: BillingsPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = billings.length;
    const issued = billings.filter((b) => b.invoice_status === 'issued').length;
    const notIssued = billings.filter((b) => b.invoice_status === 'not_issued').length;
    const totalAmount = billings.reduce((sum, b) => sum + Number(b.billing_amount), 0);

    return { total, issued, notIssued, totalAmount };
  }, [billings]);

  return (
    <div className="space-y-6">
      <PageHeader title="청구관리" description="전체 청구 정보를 관리합니다" />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 청구"
          value={stats.total}
          description="등록된 전체 청구 건수"
          icon={FileText}
        />
        <StatsCard
          title="계산서 발행"
          value={stats.issued}
          description="계산서 발행 완료"
          icon={CheckCircle}
        />
        <StatsCard
          title="계산서 미발행"
          value={stats.notIssued}
          description="계산서 미발행"
          icon={Clock}
        />
        <StatsCard
          title="청구금액 합계"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="전체 청구금액"
          icon={DollarSign}
        />
      </div>

      {/* 청구 테이블 */}
      <BillingsTable data={billings} />
    </div>
  );
}
