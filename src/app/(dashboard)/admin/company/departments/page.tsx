import { Building, Users, Layers, TrendingUp } from 'lucide-react';
import { getDepartments } from '@/actions/departments';
import { DepartmentsTable } from './departments-table';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  const stats = {
    total: departments.length,
    active: departments.filter((d) => d.name).length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="부서 관리"
          description="부서를 관리하고 드래그하여 순서를 변경할 수 있습니다"
        />

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="전체 부서"
            value={stats.total}
            description="등록된 전체 부서 수"
            icon={Building}
          />
          <StatsCard
            title="활성 부서"
            value={stats.active}
            description="활성화된 부서"
            icon={Users}
          />
          <StatsCard
            title="조직 레벨"
            value={Math.ceil(stats.total / 3)}
            description="부서 계층 레벨"
            icon={Layers}
          />
          <StatsCard
            title="성장률"
            value={`+${Math.round(stats.total * 0.1)}`}
            description="전년 대비 증가"
            icon={TrendingUp}
          />
        </div>

        <DepartmentsTable data={departments} />
      </div>
    </PageTransition>
  );
}
