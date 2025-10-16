'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/**
 * 모바일 카드 필드 정의
 */
export interface MobileCardField {
  /** 필드 라벨 */
  label: string;
  /** 필드 값 (문자열 또는 React 노드) */
  value: React.ReactNode;
}

/**
 * 모바일 카드 공통 Props
 */
export interface MobileCardProps<T> {
  /** 카드 데이터 */
  data: T;
  /** 선택 상태 */
  isSelected: boolean;
  /** 새 행 여부 (temp- prefix로 판단) */
  isNewRow?: boolean;
  /** 선택 상태 변경 핸들러 */
  onSelectChange: (checked: boolean) => void;
  /** 카드 클릭 핸들러 */
  onCardClick: () => void;

  // 렌더링 함수
  /** 헤더 렌더링 (제목, 부제목) */
  renderHeader: (data: T) => React.ReactNode;
  /** 필드 목록 렌더링 (2열 그리드) */
  renderFields: (data: T) => MobileCardField[];
  /** 배지 렌더링 (하단) */
  renderBadges?: (data: T) => React.ReactNode;

  // 스타일링
  /** 추가 CSS 클래스 */
  className?: string;
  /** 헤더 추가 CSS 클래스 */
  headerClassName?: string;
  /** 필드 그리드 컬럼 수 (기본: 2) */
  gridCols?: number;
}

/**
 * 모바일 카드 제네릭 컴포넌트
 *
 * @example
 * ```tsx
 * <MobileCard
 *   data={employee}
 *   isSelected={isSelected}
 *   onSelectChange={handleSelect}
 *   onCardClick={handleClick}
 *   renderHeader={(emp) => (
 *     <>
 *       <div className="font-semibold">{emp.name}</div>
 *       <div className="text-sm text-muted-foreground">{emp.employee_number}</div>
 *     </>
 *   )}
 *   renderFields={(emp) => [
 *     { label: '이메일', value: emp.email },
 *     { label: '회사', value: emp.company?.name },
 *   ]}
 *   renderBadges={(emp) => (
 *     <Badge>{emp.role === 'admin' ? '관리자' : '사용자'}</Badge>
 *   )}
 * />
 * ```
 */
export function MobileCard<T>({
  data,
  isSelected,
  isNewRow = false,
  onSelectChange,
  onCardClick,
  renderHeader,
  renderFields,
  renderBadges,
  className,
  headerClassName,
  gridCols = 2,
}: MobileCardProps<T>) {
  const fields = renderFields(data);

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3 shadow-sm',
        isNewRow && 'border-primary/50 bg-primary/5',
        !isNewRow && 'cursor-pointer active:bg-muted/50 transition-colors',
        className
      )}
      onClick={() => {
        if (!isNewRow) {
          onCardClick();
        }
      }}
    >
      {/* 헤더: 제목/부제목과 체크박스 */}
      <div
        className={cn("flex items-start justify-between", headerClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1">
          {renderHeader(data)}
        </div>
        {!isNewRow && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelectChange}
          />
        )}
      </div>

      {/* 정보 그리드 */}
      {fields.length > 0 && (
        <div
          className={cn(
            "grid gap-2.5 text-sm",
            gridCols === 2 && "grid-cols-2",
            gridCols === 3 && "grid-cols-3",
            gridCols === 1 && "grid-cols-1"
          )}
        >
          {fields.map((field, idx) => (
            <div key={idx}>
              <div className="text-xs text-muted-foreground mb-1">{field.label}</div>
              <div className="font-medium truncate">{field.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 배지 (선택적) */}
      {renderBadges && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {renderBadges(data)}
        </div>
      )}
    </div>
  );
}
