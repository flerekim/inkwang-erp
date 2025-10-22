'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string;
  rowIndex: number;
  columnId: string;
  onUpdate: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  type?: 'text' | 'email' | 'number' | 'password';
  className?: string;
  /**
   * 표시용 포맷 함수 (편집 모드가 아닐 때 사용)
   * @param value - 원본 값
   * @returns 포맷된 문자열
   * @example
   * formatDisplay={(value) => Number(value).toLocaleString() + '원'}
   */
  formatDisplay?: (value: string) => string;
}

const EditableCellComponent = ({
  value: initialValue,
  rowIndex,
  columnId,
  onUpdate,
  type = 'text',
  className,
  formatDisplay,
}: EditableCellProps) => {
  const [value, setValue] = React.useState(initialValue);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  // 모바일 감지
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 초기값이 변경되면 로컬 상태도 업데이트
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // 편집 모드 진입
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 모바일에서 싱글 탭으로 편집 모드 진입
  const handleClick = () => {
    if (isMobile) {
      setIsEditing(true);
    }
  };

  // 편집 모드 활성화 시 input에 포커스
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 저장 처리
  const handleSave = async () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(rowIndex, columnId, value);
      setIsEditing(false);
    } catch (error) {
      // 에러 발생 시 원래 값으로 되돌림
      setValue(initialValue);
      console.error('Failed to update:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Enter: 저장, Escape: 취소, Tab: 다음 셀로 이동
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();

      // 현재 셀과 테이블 정보를 미리 저장 (DOM이 변경되기 전에)
      const currentCell = inputRef.current?.closest('td');
      if (!currentCell) return;

      const allCells = Array.from(
        currentCell.closest('table')?.querySelectorAll('td') || []
      );
      const currentIndex = allCells.indexOf(currentCell);
      if (currentIndex === -1) return;

      const direction = e.shiftKey ? 'prev' : 'next';

      // 다음 편집 가능한 셀 찾기 함수
      const findNextEditableCell = (startIndex: number, dir: 'next' | 'prev'): HTMLElement | null => {
        const step = dir === 'next' ? 1 : -1;
        for (let i = startIndex + step; i >= 0 && i < allCells.length; i += step) {
          const cell = allCells[i] as HTMLElement;
          const editableDiv = cell.querySelector('[title="더블클릭하여 편집"], [title*="더블클릭하여 편집"]');
          const existingInput = cell.querySelector('input');
          const existingButton = cell.querySelector('button[role="combobox"], button.h-8');

          if (editableDiv || existingInput || existingButton) {
            return cell;
          }
        }
        return null;
      };

      // 다음 편집 가능한 셀 찾기
      const nextEditableCell = findNextEditableCell(currentIndex, direction);

      // 값이 변경되지 않았으면 편집 모드 종료 후 포커스 이동
      if (value === initialValue) {
        setIsEditing(false);
        // 다음 셀로 포커스 이동 (약간의 지연 후)
        if (nextEditableCell) {
          setTimeout(() => {
            const editableDiv = nextEditableCell.querySelector('[title="더블클릭하여 편집"], [title*="더블클릭하여 편집"]') as HTMLElement;
            const existingInput = nextEditableCell.querySelector('input') as HTMLInputElement;
            const existingButton = nextEditableCell.querySelector('button[role="combobox"], button.h-8') as HTMLButtonElement;

            if (existingInput) {
              existingInput.focus();
            } else if (existingButton) {
              existingButton.focus();
            } else if (editableDiv) {
              editableDiv.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            } else {
              nextEditableCell.focus();
            }
          }, 0);
        }
      } else {
        // 값이 변경되었으면 저장 후 포커스 이동
        handleSave();
        // 다음 셀로 포커스 이동 (약간의 지연 후)
        if (nextEditableCell) {
          setTimeout(() => {
            const editableDiv = nextEditableCell.querySelector('[title="더블클릭하여 편집"], [title*="더블클릭하여 편집"]') as HTMLElement;
            const existingInput = nextEditableCell.querySelector('input') as HTMLInputElement;
            const existingButton = nextEditableCell.querySelector('button[role="combobox"], button.h-8') as HTMLButtonElement;

            if (existingInput) {
              existingInput.focus();
            } else if (existingButton) {
              existingButton.focus();
            } else if (editableDiv) {
              editableDiv.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
            } else {
              nextEditableCell.focus();
            }
          }, 0);
        }
      }
    }
  };

  // 표시할 값 결정 (useMemo는 조건부 렌더링 이전에 있어야 함 - React Hooks 규칙)
  const displayValue = React.useMemo(() => {
    if (type === 'password') return '••••••••';
    if (!value) return '-';

    // formatDisplay가 제공되면 포맷된 값 사용
    if (formatDisplay) {
      try {
        return formatDisplay(value);
      } catch (error) {
        console.error('formatDisplay error:', error);
        return value;
      }
    }

    return value;
  }, [value, type, formatDisplay]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={cn(
          'h-8 py-1',
          'animate-in fade-in zoom-in-95 duration-200',
          'shadow-lg shadow-primary/10',
          'border-2 border-primary/50',
          'focus-visible:ring-2 focus-visible:ring-primary/20',
          'focus-visible:border-primary',
          'focus-visible:shadow-primary/30',
          className
        )}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'cursor-pointer rounded-lg px-3 py-2',
        'transition-all duration-200 ease-out',
        'hover:bg-gradient-to-r hover:from-muted/80 hover:to-muted/40',
        'hover:shadow-inner',
        'hover:scale-[1.02]',
        'active:scale-[0.98]',
        'border border-transparent hover:border-muted-foreground/10',
        // 텍스트 오버플로우 처리 (TanStack Table 권장 패턴)
        'truncate overflow-hidden text-ellipsis whitespace-nowrap',
        'min-w-0 max-w-full',
        isMobile && 'active:bg-muted',
        className
      )}
      title={`${displayValue} (${isMobile ? '탭하여 편집' : '더블클릭하여 편집'})`}
    >
      {displayValue}
    </div>
  );
};

// React.memo로 래핑하여 불필요한 재렌더링 방지
export const EditableCell = React.memo(EditableCellComponent);
