'use client';

import * as React from 'react';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { CollectionWithDetails } from '@/types';

interface CollectionToolbarProps {
  data: CollectionWithDetails[];
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

export function CollectionToolbar({
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
}: CollectionToolbarProps) {
  // Excel 내보내기용 컬럼 정의
  const excelColumns = React.useMemo(() => [
    { key: '청구번호', header: '청구번호' },
    { key: '계약명', header: '계약명' },
    { key: '고객명', header: '고객명' },
    { key: '수금예정일', header: '수금예정일' },
    { key: '수금일', header: '수금일' },
    { key: '수금액', header: '수금액' },
    { key: '수금방법', header: '수금방법' },
    { key: '입금자', header: '입금자' },
    { key: '은행명', header: '은행명' },
    { key: '계좌번호', header: '계좌번호' },
    { key: '비고', header: '비고' },
  ], []);

  // Excel 내보내기 데이터 변환
  const excelData = React.useMemo(() => {
    return data.map((collection) => ({
      청구번호: collection.billing?.billing_number || '-',
      계약명: collection.billing?.order?.contract_name || '-',
      고객명: collection.billing?.customer?.name || '-',
      수금예정일: collection.billing?.expected_payment_date || '-',
      수금일: collection.collection_date,
      수금액: collection.collection_amount,
      수금방법: collection.collection_method === 'bank_transfer' ? '계좌이체' : '기타',
      입금자: collection.depositor,
      은행명: collection.bank_name || '-',
      계좌번호: collection.account_number || '-',
      비고: collection.notes || '',
    }));
  }, [data]);

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo(() => [
    { key: '청구번호', header: '청구번호', width: '120px' },
    { key: '계약명', header: '계약명', width: '200px' },
    { key: '고객명', header: '고객명', width: '150px' },
    { key: '수금예정일', header: '수금예정일', width: '100px' },
    { key: '수금일', header: '수금일', width: '100px' },
    { key: '수금액', header: '수금액', width: '120px', align: 'right' as const },
    { key: '수금방법', header: '수금방법', width: '80px' },
    { key: '입금자', header: '입금자', width: '100px' },
    { key: '은행명', header: '은행명', width: '100px' },
    { key: '계좌번호', header: '계좌번호', width: '150px' },
    { key: '비고', header: '비고', width: '150px' },
  ], []);

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
      addButtonText="수금 추가"
      deleteButtonText="수금 삭제"
      exportButton={
        <ExportToExcel
          data={excelData}
          columns={excelColumns}
          filename="수금관리.xlsx"
          sheetName="수금 목록"
        />
      }
      printButton={
        <PrintTable
          data={excelData}
          columns={printColumns}
          title="수금관리"
          subtitle="수금 목록"
        />
      }
    />
  );
}
