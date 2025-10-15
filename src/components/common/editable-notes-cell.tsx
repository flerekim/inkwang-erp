'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EditableNotesCellProps {
  notes: string | null;
  onSave: (value: string) => Promise<void>;
}

/**
 * 비고 필드 인라인 편집 컴포넌트
 * - 더블클릭으로 편집 모드 활성화
 * - Ctrl+Enter 또는 Cmd+Enter로 저장
 * - Escape로 취소
 * - 내용 없을 때: "내용없음" Badge
 * - 내용 있을 때: "내용있음" Badge + Popover로 내용 표시
 */
export function EditableNotesCell({ notes, onSave }: EditableNotesCellProps) {
  const hasContent = notes && notes.trim().length > 0;
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(notes || '');
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // 편집 모드로 전환
  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  // 편집 모드 활성화 시 포커스
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 저장 처리
  const handleSave = async () => {
    if (value === notes) {
      setIsEditing(false);
      return;
    }

    try {
      await onSave(value);
      setIsEditing(false);
    } catch {
      setValue(notes || '');
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setValue(notes || '');
      setIsEditing(false);
    }
    // Ctrl+Enter 또는 Cmd+Enter로 저장
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  // 편집 모드
  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full min-h-[60px] px-2 py-1 border rounded text-sm resize-y"
        placeholder="비고 입력..."
      />
    );
  }

  // 표시 모드 - 내용 없음
  if (!hasContent) {
    return (
      <div
        onDoubleClick={handleDoubleClick}
        className="cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors"
        title="더블클릭하여 편집"
      >
        <Badge variant="outline" className="text-muted-foreground">
          내용없음
        </Badge>
      </div>
    );
  }

  // 표시 모드 - 내용 있음 (Badge + Popover)
  return (
    <div
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer"
      title="더블클릭하여 편집"
    >
      <Popover>
        <PopoverTrigger asChild>
          <Badge
            variant="default"
            className="cursor-pointer hover:bg-primary/80"
          >
            내용있음
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="start">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">비고</h4>
            <div className="text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
              {notes}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
