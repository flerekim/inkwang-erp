'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { OrderWithDetails } from '@/types';

interface MobileOrderCardProps {
  order: OrderWithDetails;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onCardClick: () => void;
}

/**
 * 모바일 수주 카드 컴포넌트
 */
export function MobileOrderCard({
  order,
  isSelected,
  onSelectChange,
  onCardClick,
}: MobileOrderCardProps) {
  // 계약상태 텍스트 및 배지 변환
  const getStatusBadge = (status: string) => {
    const statusMap = {
      quotation: { label: '견적', variant: 'secondary' as const },
      contract: { label: '계약', variant: 'default' as const },
      in_progress: { label: '진행', variant: 'default' as const },
      completed: { label: '완료', variant: 'outline' as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
  };

  const statusInfo = getStatusBadge(order.contract_status);

  // 구분 텍스트 변환
  const businessTypeText = order.business_type === 'civilian' ? '민수' : '관수';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 shadow-sm cursor-pointer active:bg-muted/50 transition-colors'
      )}
      onClick={onCardClick}
    >
      {/* 헤더: 계약번호/계약명과 체크박스 */}
      <div className="flex items-start justify-between" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1">
          <div className="font-semibold text-base">{order.contract_name || '(계약명 없음)'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{order.order_number}</div>
        </div>
        <Checkbox checked={isSelected} onCheckedChange={onSelectChange} />
      </div>

      {/* 정보 그리드 */}
      <div className="grid grid-cols-2 gap-2.5 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1">고객명</div>
          <div className="font-medium truncate">{order.customer?.name || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">계약일</div>
          <div className="font-medium">{order.contract_date || '-'}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">계약금액</div>
          <div className="font-medium">{Number(order.contract_amount).toLocaleString()}원</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">구분</div>
          <div className="font-medium">{businessTypeText}</div>
        </div>
      </div>

      {/* 상태 배지 */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        {order.contract_type === 'change' && <Badge variant="outline">변경</Badge>}
      </div>
    </div>
  );
}
