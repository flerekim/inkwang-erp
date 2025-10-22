'use client';

import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import type { OrderWithDetails } from '@/types';
import { useMemo } from 'react';

interface OrderToolbarProps {
  data: OrderWithDetails[];
  selectedCount: number;  // hasSelection을 selectedCount로 변경
  hasNewRow: boolean;
  isSavingNewRow: boolean;
  isDeleting: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
  isMobile?: boolean;
}

/**
 * 수주관리 테이블 툴바 컴포넌트
 *
 * 기능:
 * - 수주 추가/삭제 (CRUD 버튼)
 * - Excel 내보내기
 * - 인쇄
 */
export function OrderToolbar({
  data,
  selectedCount,  // hasSelection에서 selectedCount로 변경
  hasNewRow,
  isSavingNewRow,
  isDeleting,
  onAdd,
  onDelete,
  onSaveNewRow,
  onCancelNewRow,
  isMobile = false,
}: OrderToolbarProps) {
  // Excel 내보내기용 컬럼 설정
  const exportColumns = useMemo<ExportColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호' },
      { key: 'contract_name', header: '계약명' },
      {
        key: 'customer_id',
        header: '고객명',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일' },
      {
        key: 'contract_type',
        header: '계약유형',
        format: (value) => (value === 'new' ? '신규' : '변경'),
      },
      {
        key: 'contract_status',
        header: '계약상태',
        format: (value) =>
          value === 'quotation'
            ? '견적'
            : value === 'contract'
            ? '계약'
            : value === 'in_progress'
            ? '진행중'
            : '완료',
      },
      {
        key: 'contract_amount',
        header: '계약금액(원)',
        format: (value) => String(Number(value).toLocaleString()),
      },
    ],
    []
  );

  // 인쇄용 컬럼 설정
  const printColumns = useMemo<PrintColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호', width: '100px', align: 'center' },
      { key: 'contract_name', header: '계약명', width: '200px' },
      {
        key: 'customer_id',
        header: '고객명',
        width: '120px',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일', width: '100px', align: 'center' },
      {
        key: 'contract_type',
        header: '유형',
        width: '60px',
        align: 'center',
        format: (value) => (value === 'new' ? '신규' : '변경'),
      },
      {
        key: 'contract_status',
        header: '상태',
        width: '80px',
        align: 'center',
        format: (value) =>
          value === 'quotation'
            ? '견적'
            : value === 'contract'
            ? '계약'
            : value === 'in_progress'
            ? '진행중'
            : '완료',
      },
      {
        key: 'contract_amount',
        header: '계약금액',
        width: '120px',
        align: 'right',
        format: (value) => Number(value).toLocaleString() + '원',
      },
    ],
    []
  );

  return (
    <CrudTableToolbar
      isMobile={isMobile}
      isAddingNew={hasNewRow}
      isSaving={isSavingNewRow}
      selectedCount={selectedCount}  // 실제 selectedCount 전달
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSaveNewRow}
      onCancel={onCancelNewRow}
      onDelete={onDelete}
      exportButton={
        <ExportToExcel
          data={data}
          columns={exportColumns}
          filename={`수주목록_${new Date().toISOString().split('T')[0]}.xlsx`}
          sheetName="수주"
          buttonText="Excel 다운로드"
        />
      }
      printButton={
        <PrintTable
          data={data}
          columns={printColumns}
          title="수주 목록"
          subtitle={`총 ${data.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
          buttonText="인쇄"
        />
      }
      addButtonText="수주 추가"
      deleteButtonText="삭제"
    />
  );
}
