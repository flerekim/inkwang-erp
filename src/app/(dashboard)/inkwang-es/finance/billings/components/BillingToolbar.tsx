'use client';

import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import type { BillingWithDetails } from '@/types';
import { useMemo } from 'react';

interface BillingToolbarProps {
  data: BillingWithDetails[];
  selectedCount: number;
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
 * 청구관리 테이블 툴바 컴포넌트
 *
 * 기능:
 * - 청구 추가/삭제 (CRUD 버튼)
 * - Excel 내보내기
 * - 인쇄
 */
export function BillingToolbar({
  data,
  selectedCount,
  hasNewRow,
  isSavingNewRow,
  isDeleting,
  onAdd,
  onDelete,
  onSaveNewRow,
  onCancelNewRow,
  isMobile = false,
}: BillingToolbarProps) {
  // Excel 내보내기용 컬럼 설정
  const exportColumns = useMemo<ExportColumn<BillingWithDetails>[]>(
    () => [
      { key: 'billing_number', header: '청구번호' },
      { key: 'billing_date', header: '청구일' },
      {
        key: 'order_id',
        header: '계약명',
        format: (_, row) => row.order?.contract_name || '',
      },
      {
        key: 'customer_id',
        header: '고객명',
        format: (_, row) => row.customer?.name || '',
      },
      {
        key: 'billing_type',
        header: '청구구분',
        format: (value) =>
          value === 'contract' ? '계약금' :
          value === 'interim' ? '중도금' : '잔금',
      },
      {
        key: 'billing_amount',
        header: '청구금액(원)',
        format: (value) => String(Number(value).toLocaleString()),
      },
      { key: 'expected_payment_date', header: '수금예정일' },
      {
        key: 'invoice_status',
        header: '계산서',
        format: (value) => value === 'issued' ? '발행' : '미발행',
      },
      { key: 'notes', header: '비고' },
    ],
    []
  );

  // 인쇄용 컬럼 설정
  const printColumns = useMemo<PrintColumn<BillingWithDetails>[]>(
    () => [
      { key: 'billing_number', header: '청구번호', width: '110px', align: 'center' },
      { key: 'billing_date', header: '청구일', width: '90px', align: 'center' },
      {
        key: 'order_id',
        header: '계약명',
        width: '150px',
        format: (_, row) => row.order?.contract_name || '',
      },
      {
        key: 'customer_id',
        header: '고객명',
        width: '100px',
        format: (_, row) => row.customer?.name || '',
      },
      {
        key: 'billing_type',
        header: '청구구분',
        width: '70px',
        align: 'center',
        format: (value) =>
          value === 'contract' ? '계약금' :
          value === 'interim' ? '중도금' : '잔금',
      },
      {
        key: 'billing_amount',
        header: '청구금액',
        width: '110px',
        align: 'right',
        format: (value) => Number(value).toLocaleString() + '원',
      },
      { key: 'expected_payment_date', header: '수금예정일', width: '90px', align: 'center' },
      {
        key: 'invoice_status',
        header: '계산서',
        width: '60px',
        align: 'center',
        format: (value) => value === 'issued' ? '발행' : '미발행',
      },
    ],
    []
  );

  return (
    <CrudTableToolbar
      isMobile={isMobile}
      isAddingNew={hasNewRow}
      isSaving={isSavingNewRow}
      selectedCount={selectedCount}
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSaveNewRow}
      onCancel={onCancelNewRow}
      onDelete={onDelete}
      exportButton={
        <ExportToExcel
          data={data}
          columns={exportColumns}
          filename={`청구목록_${new Date().toISOString().split('T')[0]}.xlsx`}
          sheetName="청구"
          buttonText="Excel 다운로드"
        />
      }
      printButton={
        <PrintTable
          data={data}
          columns={printColumns}
          title="청구 목록"
          subtitle={`총 ${data.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
          buttonText="인쇄"
        />
      }
      addButtonText="청구 추가"
      deleteButtonText="삭제"
    />
  );
}
