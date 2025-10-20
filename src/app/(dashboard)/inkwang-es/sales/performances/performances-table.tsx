'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createPerformanceColumns } from './performance-columns';
import { PerformanceToolbar } from './components/PerformanceToolbar';
import { usePerformanceData } from './hooks/usePerformanceData';
import { usePerformanceActions } from './hooks/usePerformanceActions';
import type { PerformanceWithDetails } from '@/types';

interface PerformancesTableProps {
  data: PerformanceWithDetails[];
}

export function PerformancesTable({ data }: PerformancesTableProps) {
  // 테이블 상태 관리 (useTableState Hook 사용)
  const tableState = useTableState<PerformanceWithDetails>(data);

  const {
    displayData,
    rowSelection,
    setRowSelection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    isSavingNewRow,
    selectedCount,
  } = tableState;

  // 데이터 로딩 및 모바일 상태 관리
  const performanceData = usePerformanceData(displayData);
  const { newOrders, managers, customers } = performanceData;

  // CRUD 액션
  const performanceActions = usePerformanceActions(tableState, newOrders);
  const {
    handleUpdateCell,
    handleDeleteSelected,
    handleAddPerformance,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = performanceActions;

  // 통합 업데이트 핸들러 (EditableCell들이 사용)
  const handleUnifiedUpdate = React.useCallback(
    async (rowIndex: number, columnId: string, value: string | boolean | null) => {
      // 새 행 업데이트
      if (newRowData && rowIndex === 0) {
        handleUpdateNewRow(columnId, value);
        return;
      }

      // 기존 행 업데이트 (새 행이 있으면 인덱스 조정)
      const adjustedIndex = newRowData ? rowIndex - 1 : rowIndex;
      await handleUpdateCell(adjustedIndex, columnId, String(value ?? ''));
    },
    [newRowData, handleUpdateNewRow, handleUpdateCell]
  );

  // 컬럼 정의 (메모이제이션)
  const columns = useMemo(
    () =>
      createPerformanceColumns({
        newOrders,
        managers,
        customers,
        handleUnifiedUpdate,
      }),
    [newOrders, managers, customers, handleUnifiedUpdate]
  );

  // useTableState의 displayData를 직접 사용 (이미 newRowData 포함)
  const tableData = displayData;

  // 테이블 인스턴스를 useReactTable로 직접 생성하지 않고 DataTable이 내부에서 생성합니다.
  // 따라서 toolbar에서 table을 사용할 수 없으므로, PerformanceToolbar에서 table 관련 로직을 제거하거나
  // displayData를 직접 전달하는 방식으로 변경해야 합니다.

  return (
    <>
      <DataTable
        columns={columns}
        data={tableData}
        searchKey="contract_name"
        searchPlaceholder="계약명으로 검색..."
        toolbar={
          <PerformanceToolbar
            data={displayData}
            hasSelection={selectedCount > 0}
            hasNewRow={!!newRowData}
            isSavingNewRow={isSavingNewRow}
            onAdd={handleAddPerformance}
            onDelete={() => setDeleteDialogOpen(true)}
            onSaveNewRow={handleSaveNewRow}
            onCancelNewRow={handleCancelNewRow}
          />
        }
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="실적 삭제"
        description={`선택한 ${selectedCount}개의 실적을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </>
  );
}
