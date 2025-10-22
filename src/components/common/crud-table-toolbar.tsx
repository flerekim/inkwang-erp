'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Check, X, MoreVertical } from 'lucide-react';

/**
 * CRUD 테이블 툴바 props
 */
export interface CrudTableToolbarProps {
  /** 추가 모드 여부 (신규 데이터 입력 중) */
  isAddingNew?: boolean;
  /** 저장 중 여부 */
  isSaving?: boolean;
  /** 선택된 행 개수 */
  selectedCount?: number;
  /** 삭제 중 여부 */
  isDeleting?: boolean;

  /** 추가 버튼 클릭 핸들러 */
  onAdd?: () => void;
  /** 저장 버튼 클릭 핸들러 */
  onSave?: () => void;
  /** 취소 버튼 클릭 핸들러 */
  onCancel?: () => void;
  /** 삭제 버튼 클릭 핸들러 */
  onDelete?: () => void;

  /** 추가 버튼 텍스트 (기본: "추가") */
  addButtonText?: string;
  /** 삭제 버튼 텍스트 (기본: "삭제") */
  deleteButtonText?: string;

  /** Excel 다운로드 및 인쇄 버튼 (직접 렌더링) */
  exportButton?: React.ReactNode;
  printButton?: React.ReactNode;

  /** 추가 액션 버튼들 (커스텀) */
  extraActions?: React.ReactNode;

  /** 모바일 뷰 여부 */
  isMobile?: boolean;
}

/**
 * CRUD 테이블 공통 툴바 컴포넌트
 *
 * ## 기능
 * - 평상시: 추가, Excel 다운로드, 인쇄, 삭제 버튼
 * - 추가 모드: 저장, 취소 버튼
 * - 모바일: 드롭다운으로 통합
 *
 * ## 사용 예제
 * ```tsx
 * // 데스크톱
 * <CrudTableToolbar
 *   isAddingNew={!!newRowData}
 *   isSaving={isSaving}
 *   selectedCount={selectedCount}
 *   onAdd={handleAdd}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   onDelete={handleDelete}
 *   exportButton={<ExportToExcel {...exportProps} />}
 *   printButton={<PrintTable {...printProps} />}
 *   addButtonText="사원 추가"
 *   deleteButtonText="삭제"
 * />
 *
 * // 모바일
 * <CrudTableToolbar
 *   isMobile
 *   isAddingNew={!!newRowData}
 *   isSaving={isSaving}
 *   selectedCount={selectedCount}
 *   onAdd={handleAdd}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 *   onDelete={handleDelete}
 *   exportButton={<ExportToExcel {...exportProps} />}
 *   printButton={<PrintTable {...printProps} />}
 *   addButtonText="사원 추가"
 * />
 * ```
 */
export function CrudTableToolbar({
  isAddingNew = false,
  isSaving = false,
  selectedCount = 0,
  isDeleting = false,
  onAdd,
  onSave,
  onCancel,
  onDelete,
  addButtonText = '추가',
  deleteButtonText = '삭제',
  exportButton,
  printButton,
  extraActions,
  isMobile = false,
}: CrudTableToolbarProps) {
  // 데스크톱 툴바
  if (!isMobile) {
    return (
      <>
        {!isAddingNew ? (
          // 평상시: 추가, Excel 다운로드, 인쇄 버튼
          <>
            {onAdd && (
              <Button
                onClick={onAdd}
                size="sm"
                className="
                  group gap-2
                  bg-gradient-to-r from-primary to-primary/80
                  backdrop-blur-sm
                  shadow-lg shadow-primary/25
                  border border-primary/20
                  hover:shadow-xl hover:shadow-primary/40
                  hover:scale-105
                  hover:-translate-y-0.5
                  active:scale-95
                  transition-all duration-200
                  relative overflow-hidden
                  before:absolute before:inset-0
                  before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent
                  before:translate-x-[-100%]
                  hover:before:translate-x-[100%]
                  before:transition-transform before:duration-500
                "
              >
                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                {addButtonText}
              </Button>
            )}
            {exportButton}
            {printButton}
            {extraActions}
          </>
        ) : (
          // 신규 등록 중: 저장/취소 버튼
          <>
            {onSave && (
              <Button
                onClick={onSave}
                size="sm"
                disabled={isSaving}
                className="
                  group gap-2
                  bg-gradient-to-r from-green-600 to-green-500
                  shadow-lg shadow-green-500/25
                  border border-green-400/20
                  hover:shadow-xl hover:shadow-green-500/40
                  hover:scale-105
                  hover:-translate-y-0.5
                  active:scale-95
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:hover:scale-100 disabled:hover:translate-y-0
                "
              >
                <Check className="h-4 w-4 group-hover:scale-110 transition-transform" />
                저장
              </Button>
            )}
            {onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="outline"
                disabled={isSaving}
                className="
                  gap-2
                  hover:bg-muted/50
                  hover:scale-105
                  hover:-translate-y-0.5
                  active:scale-95
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  disabled:hover:scale-100 disabled:hover:translate-y-0
                "
              >
                <X className="h-4 w-4" />
                취소
              </Button>
            )}
          </>
        )}

        {/* 삭제 버튼: 신규 등록 중이 아닐 때만 표시 */}
        {!isAddingNew && onDelete && (
          <Button
            onClick={onDelete}
            size="sm"
            variant="destructive"
            disabled={selectedCount === 0 || isDeleting}
            className="
              gap-2
              shadow-lg shadow-destructive/25
              hover:shadow-xl hover:shadow-destructive/40
              hover:scale-105
              hover:-translate-y-0.5
              active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:scale-100 disabled:hover:translate-y-0
            "
          >
            <Trash2 className="h-4 w-4" />
            {deleteButtonText} ({selectedCount})
          </Button>
        )}
      </>
    );
  }

  // 모바일 툴바
  return (
    <>
      {!isAddingNew ? (
        <>
          {onAdd && (
            <Button onClick={onAdd} size="default" className="gap-2 flex-1">
              <Plus className="h-4 w-4" />
              {addButtonText}
            </Button>
          )}

          {/* 더보기 드롭다운 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="default">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {exportButton && (
                <DropdownMenuItem
                  onClick={() => {
                    // Excel 다운로드 트리거
                    const exportBtn = document.querySelector('[aria-label="Excel 다운로드"]') as HTMLButtonElement;
                    exportBtn?.click();
                  }}
                >
                  Excel 다운로드
                </DropdownMenuItem>
              )}
              {printButton && (
                <DropdownMenuItem
                  onClick={() => {
                    // 인쇄 트리거
                    const printBtn = document.querySelector('[aria-label="인쇄"]') as HTMLButtonElement;
                    printBtn?.click();
                  }}
                >
                  인쇄
                </DropdownMenuItem>
              )}
              {selectedCount > 0 && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    선택 {deleteButtonText} ({selectedCount})
                  </DropdownMenuItem>
                </>
              )}
              {extraActions && (
                <>
                  <DropdownMenuSeparator />
                  {extraActions}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 숨겨진 버튼들 (모바일 트리거용) */}
          {(exportButton || printButton) && (
            <div className="hidden">
              {exportButton}
              {printButton}
            </div>
          )}
        </>
      ) : (
        // 신규 등록 중
        <>
          {onSave && (
            <Button
              onClick={onSave}
              size="default"
              disabled={isSaving}
              className="gap-2 flex-1"
            >
              <Check className="h-4 w-4" />
              저장
            </Button>
          )}
          {onCancel && (
            <Button
              onClick={onCancel}
              size="default"
              variant="outline"
              disabled={isSaving}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              취소
            </Button>
          )}
        </>
      )}
    </>
  );
}
