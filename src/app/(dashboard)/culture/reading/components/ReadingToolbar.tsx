import * as React from 'react';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import type { ReadingRecord } from '@/types';

interface ReadingToolbarProps {
  tableData: ReadingRecord[];
  isAddingNew: boolean;
  isSaving: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * ReadingToolbar 컴포넌트
 *
 * 독서 기록 테이블의 툴바 UI
 */
export function ReadingToolbar({
  tableData,
  isAddingNew,
  isSaving,
  selectedCount,
  isDeleting,
  onAdd,
  onSave,
  onCancel,
  onDelete,
}: ReadingToolbarProps) {
  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<ReadingRecord>[]>(
    () => [
      {
        key: 'book_id',
        header: '도서명',
        format: (_, row) => row.book?.title || '',
      },
      {
        key: 'book_id',
        header: '저자',
        format: (_, row) => row.book?.author || '',
      },
      {
        key: 'book_id',
        header: '출판사',
        format: (_, row) => row.book?.publisher || '',
      },
      {
        key: 'book_id',
        header: '페이지',
        format: (_, row) => row.book?.page_count?.toString() || '',
      },
      {
        key: 'book_id',
        header: '카테고리',
        format: (_, row) => row.book?.category || '',
      },
      {
        key: 'user_id',
        header: '독서자',
        format: (_, row) => row.user?.name || '',
      },
      {
        key: 'company_id',
        header: '회사',
        format: (_, row) => row.company?.name || '',
      },
      {
        key: 'department_id',
        header: '부서',
        format: (_, row) => row.department?.name || '',
      },
      { key: 'completed_date', header: '완독일' },
      { key: 'notes', header: '독서노트' },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<ReadingRecord>[]>(
    () => [
      {
        key: 'book_id',
        header: '도서명',
        width: '200px',
        format: (_, row) => row.book?.title || '',
      },
      {
        key: 'book_id',
        header: '저자',
        width: '120px',
        format: (_, row) => row.book?.author || '',
      },
      {
        key: 'user_id',
        header: '독서자',
        width: '100px',
        format: (_, row) => row.user?.name || '',
      },
      {
        key: 'company_id',
        header: '회사',
        width: '100px',
        format: (_, row) => row.company?.name || '',
      },
      {
        key: 'department_id',
        header: '부서',
        width: '100px',
        format: (_, row) => row.department?.name || '',
      },
      { key: 'completed_date', header: '완독일', width: '100px', align: 'center' },
      { key: 'notes', header: '독서노트', width: '200px' },
    ],
    []
  );

  return (
    <CrudTableToolbar
      isAddingNew={isAddingNew}
      isSaving={isSaving}
      selectedCount={selectedCount}
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
      exportButton={
        <ExportToExcel
          data={tableData}
          columns={exportColumns}
          filename={`독서관리목록_${new Date().toISOString().split('T')[0]}.xlsx`}
          sheetName="독서관리"
          buttonText="Excel 다운로드"
        />
      }
      printButton={
        <PrintTable
          data={tableData}
          columns={printColumns}
          title="독서 관리 목록"
          subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
          buttonText="인쇄"
        />
      }
      addButtonText="독서 기록 추가"
      deleteButtonText="삭제"
    />
  );
}
