'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createPositionColumns } from './position-columns';
import {
  updatePosition,
  deletePosition,
  createPosition,
} from '@/actions/positions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useTableState } from '@/hooks/use-table-state';
import { useTableActions } from '@/hooks/use-table-actions';
import type { Position } from '@/types';

interface PositionsTableProps {
  data: Position[];
}

export function PositionsTable({ data }: PositionsTableProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 테이블 상태 관리 (useTableState Hook 사용)
  const {
    tableData,
    setTableData,
    rowSelection,
    setRowSelection,
    isDeleting,
    setIsDeleting,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    setNewRowData,
    isSavingNewRow,
    setIsSavingNewRow,
    selectedCount,
    displayData,
  } = useTableState<Position>(data);

  // createAction 래퍼: Partial<Position>를 Omit<Position, 'id' | ...>로 변환
  const createPositionWrapper = React.useCallback(
    async (data: Partial<Position>) => {
      if (!data.name) {
        return { error: '직급명은 필수 입력 항목입니다.' };
      }
      return await createPosition({
        name: data.name,
        sort_order: data.sort_order || 0,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const { handleUpdateCell: updateCellAction, handleDeleteSelected: deleteSelectedAction, handleSaveNewRow: saveNewRowAction } = useTableActions<
    Position,
    Omit<Position, 'id' | 'created_at' | 'updated_at'>
  >({
    tableData,
    setTableData,
    originalData: data,
    updateAction: updatePosition,
    deleteAction: deletePosition,
    createAction: createPositionWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // Position-specific 셀 업데이트 래퍼 (sort_order 타입 변환)
  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      if (columnId === 'sort_order') {
        const numValue = parseInt(value) || 0;
        const row = tableData[rowIndex];
        if (!row) return;

        setTableData((old) =>
          old.map((r, idx) => (idx === rowIndex ? { ...r, sort_order: numValue } : r))
        );

        try {
          const result = await updatePosition(row.id, { sort_order: numValue });
          if (result.error) {
            setTableData(data);
            toast({
              variant: 'destructive',
              title: '수정 실패',
              description: result.error,
            });
            throw new Error(result.error);
          }
          toast({
            title: '수정 완료',
            description: '정보가 성공적으로 수정되었습니다.',
          });
          router.refresh();
        } catch (error) {
          throw error;
        }
      } else {
        await updateCellAction(rowIndex, columnId, value);
      }
    },
    // updatePosition는 imported Server Action이므로 의존성 배열에 포함 불필요
    // setTableData는 React의 setState 함수이므로 의존성 배열에 포함 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableData, data, updateCellAction, toast, router]
  );

  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({});
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 직급 추가 (인라인 방식)
  const handleAddPosition = () => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 직급이 있습니다',
        description: '먼저 현재 직급을 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<Position> = {
      id: tempId,
      name: '',
      sort_order: (tableData.length + 1) * 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNewRowData(newRow);
  };

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    if (!newRowData) return;
    setNewRowData({ ...newRowData, [field]: value });
  }, [newRowData, setNewRowData]);

  // 새 행 저장
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRowData) return;
    const validate = (data: Record<string, unknown>) => {
      if (!data.name) {
        return { error: '직급명은 필수 입력 항목입니다.' };
      }
      return true;
    };
    const preparedData = {
      name: newRowData.name!,
      sort_order: newRowData.sort_order || (tableData.length + 1) * 10,
    };
    const result = await saveNewRowAction(preparedData, validate);
    if (result.success) {
      toast({
        title: '직급 추가 완료',
        description: `${newRowData.name}이(가) 추가되었습니다.`,
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData, tableData.length]);

  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  React.useEffect(() => {
    if (!newRowData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelNewRow();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    // handleCancelNewRow는 단순 setState 호출이므로 의존성 배열에 포함 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newRowData]);

  const columns = React.useMemo(
    () =>
      createPositionColumns({
        handleUpdateCell,
        handleUpdateNewRow,
      }),
    [handleUpdateCell, handleUpdateNewRow]
  );

  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<Position>[]>(
    () => [
      { key: 'name', header: '직급명' },
      { key: 'sort_order', header: '정렬순서' },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<Position>[]>(
    () => [
      { key: 'name', header: '직급명', width: '300px' },
      { key: 'sort_order', header: '정렬순서', width: '100px', align: 'center' },
    ],
    []
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={displayData}
        searchKey="name"
        searchPlaceholder="직급명 검색..."
        pageSize={10}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableFuzzyFilter={true}
        enableColumnResizing={true}
        columnResizeMode="onChange"
        enablePageSizeSelection={true}
        enablePageJump={true}
        toolbar={
          <CrudTableToolbar
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddPosition}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={
              <ExportToExcel
                data={tableData}
                columns={exportColumns}
                filename={`직급목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                sheetName="직급"
                buttonText="Excel 다운로드"
              />
            }
            printButton={
              <PrintTable
                data={tableData}
                columns={printColumns}
                title="직급 목록"
                subtitle={`총 ${tableData.length}개 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                buttonText="인쇄"
              />
            }
            addButtonText="직급 추가"
            deleteButtonText="삭제"
          />
        }
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="직급 삭제"
        description={`선택한 ${selectedCount}개의 직급을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
