import { Building2, Users, MapPin, FileText } from 'lucide-react';
import { getCompanies } from '@/actions/companies';
import { CompaniesTable } from './companies-table';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';

export default async function CompaniesPage() {
  const companies = await getCompanies();

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.name).length,
    withBusiness: companies.filter((c) => c.business_number).length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="회사 정보 관리"
          description="회사 정보를 관리하고 드래그하여 순서를 변경할 수 있습니다"
        />

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="전체 회사"
            value={stats.total}
            description="등록된 전체 회사 수"
            icon={Building2}
          />
          <StatsCard
            title="활성 회사"
            value={stats.active}
            description="활성화된 회사"
            icon={Users}
          />
          <StatsCard
            title="사업자등록"
            value={stats.withBusiness}
            description="사업자번호 등록 완료"
            icon={FileText}
          />
          <StatsCard
            title="평균 순서"
            value={Math.round(stats.total / 2)}
            description="정렬 순서 평균"
            icon={MapPin}
          />
        </div>

        <CompaniesTable data={companies} />
      </div>
    </PageTransition>
  );
}
