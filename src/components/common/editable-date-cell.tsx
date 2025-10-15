'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableDateCellProps {
  value: string;
  rowIndex: number;
  columnId: string;
  onUpdate: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  className?: string;
}

/**
 * TanStack Table v8 공식 패턴을 따르는 날짜 편집 셀 컴포넌트
 *
 * 패턴:
 * 1. 로컬 상태로 입력값 관리
 * 2. blur 시 서버 업데이트
 * 3. initialValue 변경 시 로컬 상태 동기화
 *
 * 참고: https://tanstack.com/table/v8/docs/framework/react/examples/editable-data
 */
const EditableDateCellComponent = ({
  value: initialValue,
  rowIndex,
  columnId,
  onUpdate,
  className,
}: EditableDateCellProps) => {
  // 로컬 상태로 입력값 관리
  const [value, setValue] = React.useState(initialValue || '');
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // initialValue가 변경되면 로컬 상태 동기화
  React.useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  // 편집 모드 진입
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 편집 모드 시작 시 input에 자동 포커스
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 날짜 포맷팅 함수 (입력 중)
  const formatDateInput = (input: string): string => {
    // 숫자와 하이픈만 허용
    const cleaned = input.replace(/[^\d-]/g, '');

    // 하이픈 제거한 숫자만 추출
    const digits = cleaned.replace(/-/g, '');

    // 최대 8자리까지만 허용 (yyyymmdd)
    if (digits.length > 8) {
      return value; // 이전 값 유지
    }

    // 자동 포맷팅: yyyy-mm-dd
    let formatted = digits;
    if (digits.length >= 5) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}${
        digits.length > 6 ? `-${digits.slice(6, 8)}` : ''
      }`;
    } else if (digits.length >= 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    return formatted;
  };

  // 날짜 유효성 검사
  const validateDate = (dateString: string): boolean => {
    if (!dateString) return true; // 빈 값 허용

    const digits = dateString.replace(/-/g, '');
    if (digits.length !== 8) return false;

    const year = parseInt(digits.slice(0, 4));
    const month = parseInt(digits.slice(4, 6));
    const day = parseInt(digits.slice(6, 8));

    // 기본 범위 체크
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;

    // Date 객체로 유효성 검증
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  // 입력값 변경 처리
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setValue(formatted);
  };

  // 저장 처리 (blur 시)
  const handleSave = async () => {
    // 값이 변경되지 않았으면 편집 모드만 종료
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    // 날짜 유효성 검사
    if (!validateDate(value)) {
      // 유효하지 않으면 원래 값으로 복원
      setValue(initialValue || '');
      setIsEditing(false);
      return;
    }

    // 서버 업데이트
    setIsSaving(true);
    try {
      await onUpdate(rowIndex, columnId, value);
      setIsEditing(false);
    } catch (error) {
      // 에러 발생 시 원래 값으로 복원
      setValue(initialValue || '');
      console.error('날짜 업데이트 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // Enter/Escape/Tab 키 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(initialValue || '');
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

  // 날짜 표시 포맷팅 (읽기 모드)
  const formatDisplayDate = (date: string): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return date;
    }
  };

  // 편집 모드
  if (isEditing) {
    return (
      <div className="relative w-full">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          placeholder="yyyymmdd"
          className={cn('h-8 py-1 font-mono text-sm', className)}
        />
        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  }

  // 읽기 모드
  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        'cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted/50 transition-colors',
        'border border-transparent hover:border-muted-foreground/20',
        className
      )}
      title="더블클릭하여 편집 (형식: yyyymmdd)"
    >
      {formatDisplayDate(value)}
    </div>
  );
};

// React.memo로 래핑하여 불필요한 재렌더링 방지
export const EditableDateCell = React.memo(EditableDateCellComponent);
