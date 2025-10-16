'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { MobileCard, type MobileCardField } from '@/components/common/mobile-card';
import type { OrderWithDetails } from '@/types';

interface MobileOrderCardProps {
  order: OrderWithDetails;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onCardClick: () => void;
}

/**
 * 모바일 수주 카드 컴포넌트
 * (MobileCard 제네릭 컴포넌트 활용)
 */
export function MobileOrderCard({
  order,
  isSelected,
  onSelectChange,
  onCardClick,
}: MobileOrderCardProps) {
  // 계약상태 텍스트 및 배지 변환 헬퍼
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
  const businessTypeText = order.business_type === 'civilian' ? '민수' : '관수';

  return (
    <MobileCard<OrderWithDetails>
      data={order}
      isSelected={isSelected}
      isNewRow={false} // 수주 카드는 새 행이 없음
      onSelectChange={onSelectChange}
      onCardClick={onCardClick}
      renderHeader={(ord) => (
        <>
          <div className="font-semibold text-base">{ord.contract_name || '(계약명 없음)'}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{ord.order_number}</div>
        </>
      )}
      renderFields={(ord): MobileCardField[] => [
        {
          label: '고객명',
          value: ord.customer?.name || '-',
        },
        {
          label: '계약일',
          value: ord.contract_date || '-',
        },
        {
          label: '계약금액',
          value: `${Number(ord.contract_amount).toLocaleString()}원`,
        },
        {
          label: '구분',
          value: businessTypeText,
        },
      ]}
      renderBadges={(ord) => (
        <>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {ord.contract_type === 'change' && <Badge variant="outline">변경</Badge>}
        </>
      )}
    />
  );
}
