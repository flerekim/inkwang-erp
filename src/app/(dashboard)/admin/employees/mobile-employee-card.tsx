'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { MobileCard, type MobileCardField } from '@/components/common/mobile-card';
import type { UserWithDetails } from '@/types';

interface MobileEmployeeCardProps {
  employee: UserWithDetails;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onCardClick: () => void;
}

/**
 * 모바일 사원 카드 컴포넌트
 * (MobileCard 제네릭 컴포넌트 활용)
 */
export function MobileEmployeeCard({
  employee,
  isSelected,
  onSelectChange,
  onCardClick,
}: MobileEmployeeCardProps) {
  const isNewRow = employee.id?.startsWith('temp-');

  return (
    <MobileCard<UserWithDetails>
      data={employee}
      isSelected={isSelected}
      isNewRow={isNewRow}
      onSelectChange={onSelectChange}
      onCardClick={onCardClick}
      renderHeader={(emp) => (
        <>
          <div className="font-semibold text-base">{emp.name || '(이름 없음)'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{emp.employee_number}</div>
        </>
      )}
      renderFields={(emp): MobileCardField[] => [
        {
          label: '이메일',
          value: emp.email || '-',
        },
        {
          label: '회사',
          value: emp.company?.name || '-',
        },
        {
          label: '부서',
          value: emp.department?.name || '-',
        },
        {
          label: '직급',
          value: emp.position?.name || '-',
        },
        {
          label: '입사일',
          value: emp.hire_date || '-',
        },
        {
          label: '상태',
          value: (
            <Badge variant={emp.employment_status === 'active' ? 'default' : 'outline'}>
              {emp.employment_status === 'active' ? '재직' : '퇴사'}
            </Badge>
          ),
        },
      ]}
      renderBadges={(emp) => (
        <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'}>
          {emp.role === 'admin' ? '관리자' : '사용자'}
        </Badge>
      )}
    />
  );
}
