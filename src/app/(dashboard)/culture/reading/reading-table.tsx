'use client';

import * as React from 'react';
import { useMemo, useState, useCallback } from 'react';
import { DataTable } from '@/components/common/data-table';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Info } from 'lucide-react';
import { ReadingToolbar } from './components/ReadingToolbar';
import { BookSearchDialog } from './components/BookSearchDialog';
import { getReadingColumns, getRowClassName } from './reading-columns';
import { useTableState } from '@/hooks/use-table-state';
import { useReadingData } from './hooks/useReadingData';
import { useReadingActions } from './hooks/useReadingActions';
import type { ReadingRecord, UserWithDetails } from '@/types';

interface ReadingTableProps {
  initialData: ReadingRecord[];
  users: UserWithDetails[];
  currentUserId: string;
}

/**
 * 독서 관리 테이블 컴포넌트
 * - 독서 기록 조회 및 관리
 * - 중복 독서 시각적 표시
 * - 인라인 편집 지원
 */
export function ReadingTable({ initialData, users, currentUserId }: ReadingTableProps) {
  // 도서 선택 다이얼로그 상태
  const [bookDialogOpen, setBookDialogOpen] = useState(false);

  // 테이블 상태 관리
  const tableState = useTableState<ReadingRecord>(initialData);
  const {
    displayData,
    rowSelection,
    setRowSelection,
    newRowData,
    isDeleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    isSavingNewRow,
  } = tableState;

  // 관계형 데이터 로드
  const readingData = useReadingData(displayData);
  const { books, companies, departments, duplicateCount } = readingData;

  // CRUD 액션 훅
  const readingActions = useReadingActions(tableState, books, currentUserId);
  const {
    handleUpdateCell,
    handleDeleteSelected,
    handleAddReading,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = readingActions;

  // 도서 선택 핸들러 (알라딘 검색 다이얼로그에서 선택)
  const handleBookSelect = (book: { id: string; title: string; author: string | null; publisher: string | null; cover_url: string | null; page_count: number | null; category: string | null }) => {
    if (handleUpdateNewRow) {
      handleUpdateNewRow('book_id', book.id);
    }
  };

  // 셀 업데이트 핸들러 (타입 변환)
  const handleCellUpdate = useCallback(
    async (rowIndex: number, columnId: string, value: unknown) => {
      return handleUpdateCell(rowIndex, columnId, value as string);
    },
    [handleUpdateCell]
  );

  // 컬럼 정의 메모이제이션
  const columns = useMemo(
    () =>
      getReadingColumns({
        handleUpdateCell: handleCellUpdate,
        handleUpdateNewRow,
        allRecords: displayData,
        books,
        users,
        companies,
        departments,
        onOpenBookDialog: () => setBookDialogOpen(true),
      }),
    [handleCellUpdate, handleUpdateNewRow, displayData, books, users, companies, departments]
  );

  // 선택된 행 개수
  const selectedCount = Object.keys(rowSelection).filter((key) => rowSelection[key]).length;

  return (
    <div className="space-y-4">
      {/* 중복 독서 안내 */}
      {duplicateCount > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>
                중복 독서 {duplicateCount}건이 표시됩니다. 같은 책을 여러 번 읽은
                경우 배경색과 배지로 표시됩니다.
              </span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={displayData}
        searchKey="book_id"
        searchPlaceholder="도서명, 저자, 독서자로 검색..."
        pageSize={10}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableFuzzyFilter={true}
        enableColumnVisibility={true}
        enablePageSizeSelection={true}
        enablePageJump={true}
        getRowClassName={(row) => getRowClassName(row, displayData)}
        toolbar={
          <ReadingToolbar
            tableData={displayData}
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddReading}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
          />
        }
      />

      {/* 범례 */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border-l-4 border-l-amber-400 rounded" />
          <span>중복 독서 (같은 책을 여러 번 읽음)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            2회
          </div>
          <span>독서 횟수 표시</span>
        </div>
      </div>

      {/* 도서 검색 다이얼로그 (알라딘 API → 로컬 DB) */}
      <BookSearchDialog
        open={bookDialogOpen}
        onOpenChange={setBookDialogOpen}
        onBookSelect={handleBookSelect}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="독서 기록 삭제"
        description={`선택한 ${selectedCount}건의 독서 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
