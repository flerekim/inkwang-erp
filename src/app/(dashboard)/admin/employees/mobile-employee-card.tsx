'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { UserWithDetails } from '@/types';

interface MobileEmployeeCardProps {
  employee: UserWithDetails;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onCardClick: () => void;
}

/**
 * 모바일 사원 카드 컴포넌트
 */
export function MobileEmployeeCard({
  employee,
  isSelected,
  onSelectChange,
  onCardClick,
}: MobileEmployeeCardProps) {
  const isNewRow = employee.id?.startsWith('temp-');

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 shadow-sm',
        isNewRow && 'border-primary/50 bg-primary/5',
        !isNewRow && 'cursor-pointer active:bg-muted/50 transition-colors'
      )}
      onClick={() => {
        if (!isNewRow) {
          onCardClick();
        }
      }}
    >
      {/* 헤더: 이름과 체크박스 */}
      <div className="flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1">
          <div className="font-semibold text-base">{employee.name || '(이름 없음)'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{employee.employee_number}</div>
        </div>
        {!isNewRow && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectChange}
          />
        )}
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-2.5 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">이메일</div>
          <div className="font-medium truncate">{employee.email || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">회사</div>
          <div className="font-medium truncate">{employee.company?.name || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">부서</div>
          <div className="font-medium truncate">{employee.department?.name || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">직급</div>
          <div className="font-medium truncate">{employee.position?.name || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">입사일</div>
          <div className="font-medium">{employee.hire_date || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">상태</div>
          <Badge variant={employee.employment_status === 'active' ? 'default' : 'outline'}>
            {employee.employment_status === 'active' ? '재직' : '퇴사'}
          </Badge>
        </div>
      </div>

      {/* 권한 배지 */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
          {employee.role === 'admin' ? '관리자' : '사용자'}
        </Badge>
      </div>
    </div>
  );
}
