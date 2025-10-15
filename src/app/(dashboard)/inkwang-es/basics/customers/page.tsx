import { Users, Building2, UserCheck, UserX } from 'lucide-react';
import { getCustomers } from '@/actions/customers';
import { CustomersTable } from './customers-table';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';

export default async function CustomersPage() {
  const customers = await getCustomers();

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === '거래중').length,
    suspended: customers.filter((c) => c.status === '중단').length,
    withBusiness: customers.filter((c) => c.business_number).length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="고객 관리"
          description="고객 정보를 관리하고 거래 상태를 추적할 수 있습니다"
        />

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="전체 고객"
            value={stats.total}
            description="등록된 전체 고객 수"
            icon={Users}
          />
          <StatsCard
            title="거래중"
            value={stats.active}
            description="현재 거래중인 고객"
            icon={UserCheck}
          />
          <StatsCard
            title="거래중단"
            value={stats.suspended}
            description="거래가 중단된 고객"
            icon={UserX}
          />
          <StatsCard
            title="사업자등록"
            value={stats.withBusiness}
            description="사업자번호 등록 완료"
            icon={Building2}
          />
        </div>

        <CustomersTable data={customers} />
      </div>
    </PageTransition>
  );
}
