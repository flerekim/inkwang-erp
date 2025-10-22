'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Option {
  id: string;
  name: string;
  renderItem?: React.ReactNode; // 커스텀 렌더링 옵션
}

interface EditableSelectCellProps {
  value: string | null;
  rowIndex: number;
  columnId: string;
  onUpdate: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  options: Option[];
  type?: 'select' | 'combobox';
  placeholder?: string;
  displayValue?: React.ReactNode;
  searchPlaceholder?: string;
  emptyText?: string;
  onAdvancedSearch?: () => void; // 고급 검색 버튼 클릭 핸들러
  advancedSearchLabel?: string; // 고급 검색 버튼 텍스트
  className?: string; // 추가 클래스명
}

const EditableSelectCellComponent = ({
  value: initialValue,
  rowIndex,
  columnId,
  onUpdate,
  options,
  type = 'select',
  placeholder = '선택...',
  displayValue,
  searchPlaceholder = '검색...',
  emptyText = '결과가 없습니다.',
  onAdvancedSearch,
  advancedSearchLabel = '🔍 고급 검색',
  className,
}: EditableSelectCellProps) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(initialValue || '');
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // 초기값이 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  // 편집 모드 진입
  const handleDoubleClick = () => {
    setIsEditing(true);
    setOpen(true);
  };

  // Tab 키로 다음 셀로 이동
  const moveFocus = (direction: 'next' | 'prev') => {
    // DOM 정보를 미리 저장 (React 상태 변경 전에)
    const currentCell = triggerRef.current?.closest('td');
    if (!currentCell) return;

    const allCells = Array.from(
      currentCell.closest('table')?.querySelectorAll('td') || []
    );
    const currentIndex = allCells.indexOf(currentCell);

    if (currentIndex === -1) return;

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

    if (nextEditableCell) {
      // setTimeout으로 React 렌더링 후 포커스 이동
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
  };

  // Tab/Escape 키 핸들링
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue(initialValue || '');
      setIsEditing(false);
      setOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Select/Combobox를 닫고 다음 셀로 이동
      setIsEditing(false);
      setOpen(false);
      moveFocus(e.shiftKey ? 'prev' : 'next');
    }
  };

  // 값 선택 및 저장
  const handleSelect = async (selectedValue: string) => {
    if (selectedValue === value) {
      setIsEditing(false);
      setOpen(false);
      return;
    }

    setValue(selectedValue);
    setIsSaving(true);

    try {
      await onUpdate(rowIndex, columnId, selectedValue);
      setIsEditing(false);
      setOpen(false);
    } catch (error) {
      // 에러 발생 시 원래 값으로 되돌림
      setValue(initialValue || '');
      console.error('Failed to update:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 현재 선택된 옵션 찾기
  const selectedOption = options.find((opt) => opt.id === value);
  const displayText = selectedOption?.name || placeholder;

  // 편집 모드일 때
  if (isEditing) {
    if (type === 'combobox') {
      return (
        <Popover open={open} onOpenChange={(newOpen) => {
          setOpen(newOpen);
          // Popover가 닫힐 때 편집 모드도 종료
          if (!newOpen) {
            setIsEditing(false);
          }
        }}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("h-8 w-full justify-between", className)}
              disabled={isSaving}
              onKeyDown={handleKeyDown}
            >
              {displayText}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={searchPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    setIsEditing(false);
                    setOpen(false);
                    moveFocus(e.shiftKey ? 'prev' : 'next');
                  } else if (e.key === 'Escape') {
                    setValue(initialValue || '');
                    setIsEditing(false);
                    setOpen(false);
                  }
                }}
              />
              <CommandList>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={option.name}
                      onSelect={() => handleSelect(option.id)}
                      className={option.renderItem ? 'items-start py-3' : ''}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 flex-shrink-0',
                          value === option.id ? 'opacity-100' : 'opacity-0',
                          option.renderItem && 'mt-1'
                        )}
                      />
                      {option.renderItem || option.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {/* 고급 검색 버튼 */}
                {onAdvancedSearch && (
                  <div className="border-t p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpen(false);
                        setIsEditing(false);
                        onAdvancedSearch();
                      }}
                    >
                      {advancedSearchLabel}
                    </Button>
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    // type === 'select'
    return (
      <Select
        value={value}
        onValueChange={handleSelect}
        disabled={isSaving}
        open={open}
        onOpenChange={(newOpen) => {
          setOpen(newOpen);
          // Select가 닫힐 때 편집 모드도 종료
          if (!newOpen) {
            setIsEditing(false);
          }
        }}
      >
        <SelectTrigger
          ref={triggerRef}
          className={cn("h-8 w-full", className)}
          onKeyDown={handleKeyDown}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent onKeyDown={handleKeyDown}>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // 보기 모드
  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors",
        // 텍스트 오버플로우 처리 (TanStack Table 권장 패턴)
        "truncate overflow-hidden text-ellipsis whitespace-nowrap",
        "min-w-0 max-w-full"
      )}
      title="더블클릭하여 편집"
    >
      {displayValue || displayText}
    </div>
  );
};

// React.memo로 래핑하여 불필요한 재렌더링 방지
export const EditableSelectCell = React.memo(EditableSelectCellComponent);
