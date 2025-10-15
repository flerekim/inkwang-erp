import { Award, Users, TrendingUp, Briefcase } from 'lucide-react';
import { getPositions } from '@/actions/positions';
import { PositionsTable } from './positions-table';
import { PageTransition } from '@/components/page-transition';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';

export default async function PositionsPage() {
  const positions = await getPositions();

  const stats = {
    total: positions.length,
    active: positions.filter((p) => p.name).length,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="직급 관리"
          description="직급을 관리하고 드래그하여 순서를 변경할 수 있습니다"
        />

        {/* 통계 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="전체 직급"
            value={stats.total}
            description="등록된 전체 직급 수"
            icon={Award}
          />
          <StatsCard
            title="활성 직급"
            value={stats.active}
            description="활성화된 직급"
            icon={Briefcase}
          />
          <StatsCard
            title="직급 체계"
            value={Math.ceil(stats.total / 2)}
            description="직급 레벨 수"
            icon={TrendingUp}
          />
          <StatsCard
            title="평균 인원"
            value={Math.round(stats.total * 2)}
            description="직급당 평균 인원"
            icon={Users}
          />
        </div>

        <PositionsTable data={positions} />
      </div>
    </PageTransition>
  );
}
