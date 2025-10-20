'use client';

import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { PerformanceWithDetails } from '@/types';

interface PerformanceToolbarProps {
  data: PerformanceWithDetails[];
  hasSelection: boolean;
  hasNewRow: boolean;
  isSavingNewRow: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
}

/**
 * 실적관리 테이블 툴바 컴포넌트
 *
 * 기능:
 * - 실적 추가/삭제 (CRUD 버튼)
 * - Excel 내보내기
 * - 인쇄
 */
export function PerformanceToolbar({
  data,
  hasSelection,
  hasNewRow,
  isSavingNewRow,
  onAdd,
  onDelete,
  onSaveNewRow,
  onCancelNewRow,
}: PerformanceToolbarProps) {
  // Excel 내보내기용 데이터 변환
  const exportData = data.map((perf) => {
    // 숫자 타입 보장 (문자열일 경우 변환)
    const quantity = typeof perf.quantity === 'number'
      ? perf.quantity
      : parseFloat(String(perf.quantity || 0));
    const unitPrice = typeof perf.unit_price === 'number'
      ? perf.unit_price
      : parseInt(String(perf.unit_price || 0), 10);
    const performanceAmount = typeof perf.performance_amount === 'number'
      ? perf.performance_amount
      : parseInt(String(perf.performance_amount || 0), 10);

    return {
      실적구분: perf.performance_type === 'confirmed' ? '확정' : '예정',
      계약명: perf.order?.contract_name || '-',
      고객명: perf.order?.customer?.name || '-',
      실적일: perf.performance_date || '-',
      단위: perf.unit === 'ton' ? 'Ton' : perf.unit === 'unit' ? '대' : 'm³',
      수량: quantity.toFixed(2),
      단가: unitPrice.toLocaleString(),
      실적금액: performanceAmount.toLocaleString(),
      담당자: perf.manager?.name || '미지정',
      비고: perf.notes || '',
    };
  });

  // Excel 내보내기용 컬럼 설정
  const exportColumns = [
    { key: '실적구분', header: '실적구분' },
    { key: '계약명', header: '계약명' },
    { key: '고객명', header: '고객명' },
    { key: '실적일', header: '실적일' },
    { key: '단위', header: '단위' },
    { key: '수량', header: '수량' },
    { key: '단가', header: '단가' },
    { key: '실적금액', header: '실적금액' },
    { key: '담당자', header: '담당자' },
    { key: '비고', header: '비고' },
  ];

  // 인쇄용 컬럼 설정
  const printColumns = [
    { key: '실적구분', header: '실적구분', width: '80px' },
    { key: '계약명', header: '계약명', width: '200px' },
    { key: '고객명', header: '고객명', width: '120px' },
    { key: '실적일', header: '실적일', width: '100px' },
    { key: '단위', header: '단위', width: '60px' },
    { key: '수량', header: '수량', width: '100px', align: 'right' as const },
    { key: '단가', header: '단가', width: '100px', align: 'right' as const },
    { key: '실적금액', header: '실적금액', width: '120px', align: 'right' as const },
    { key: '담당자', header: '담당자', width: '100px' },
    { key: '비고', header: '비고', width: '200px' },
  ];

  return (
    <div className="flex items-center justify-between gap-2">
      {/* CRUD 버튼 */}
      <CrudTableToolbar
        isAddingNew={hasNewRow}
        isSaving={isSavingNewRow}
        selectedCount={hasSelection ? 1 : 0}
        onAdd={onAdd}
        onSave={onSaveNewRow}
        onCancel={onCancelNewRow}
        onDelete={onDelete}
        addButtonText="실적 추가"
        deleteButtonText="선택 삭제"
      />

      {/* Excel & Print */}
      <div className="flex items-center gap-2">
        <ExportToExcel data={exportData} columns={exportColumns} filename="실적관리" />
        <PrintTable
          data={exportData}
          columns={printColumns}
          title="실적관리 목록"
          subtitle={`총 ${exportData.length}건`}
        />
      </div>
    </div>
  );
}
