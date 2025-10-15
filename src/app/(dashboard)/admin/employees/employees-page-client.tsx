'use client';

import * as React from 'react';
import { Users, UserCheck, UserX, Building } from 'lucide-react';
import { EmployeesTableNew } from './employees-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { UserWithDetails } from '@/types';

interface EmployeesPageClientNewProps {
  employees: UserWithDetails[];
}

export function EmployeesPageClientNew({ employees }: EmployeesPageClientNewProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.employment_status === 'active').length;
    const inactive = employees.filter((e) => e.employment_status === 'inactive').length;
    const companies = new Set(employees.map((e) => e.company_id)).size;

    return { total, active, inactive, companies };
  }, [employees]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="사원관리"
        description="전체 사원 정보를 관리합니다"
      />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 사원"
          value={stats.total}
          description="등록된 전체 사원 수"
          icon={Users}
        />
        <StatsCard
          title="재직 중"
          value={stats.active}
          description="현재 재직 중인 사원"
          icon={UserCheck}
        />
        <StatsCard
          title="퇴사"
          value={stats.inactive}
          description="퇴사한 사원"
          icon={UserX}
        />
        <StatsCard
          title="소속 회사"
          value={stats.companies}
          description="등록된 회사 수"
          icon={Building}
        />
      </div>

      {/* 사원 테이블 */}
      <EmployeesTableNew data={employees} />
    </div>
  );
}
