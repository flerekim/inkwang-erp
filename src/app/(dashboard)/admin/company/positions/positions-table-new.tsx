'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
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
import type { Position } from '@/types';

interface PositionsTableNewProps {
  data: Position[];
}

export function PositionsTableNew({ data }: PositionsTableNewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tableData, setTableData] = React.useState<Position[]>(data);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // 새 행 관리
  const [newRowData, setNewRowData] = React.useState<Partial<Position> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = React.useState(false);

  // 데이터가 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  // 셀 업데이트 핸들러
  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const position = tableData[rowIndex];
      if (!position) return;

      // 낙관적 업데이트
      setTableData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            return {
              ...row,
              [columnId]: columnId === 'sort_order' ? parseInt(value) || 0 : value,
            };
          }
          return row;
        })
      );

      // 서버 업데이트
      try {
        const updateData = columnId === 'sort_order'
          ? { [columnId]: parseInt(value) || 0 }
          : { [columnId]: value };

        const result = await updatePosition(position.id, updateData);

        if (result.error) {
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          // 에러 발생 시 원래 값으로 되돌림
          setTableData(data);
          throw new Error(result.error);
        }

        toast({
          title: '수정 완료',
          description: '정보가 성공적으로 수정되었습니다.',
        });

        // 서버 데이터 새로고침
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, data, toast, router]
  );

  // 선택된 행 삭제
  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedPositions = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedPositions.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택 오류',
        description: '삭제할 직급을 선택해주세요.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      // 각 직급 삭제 요청
      const results = await Promise.allSettled(
        selectedPositions.map((position) => deletePosition(position.id))
      );

      // 실패한 요청 확인
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: '일부 삭제 실패',
          description: `${successes.length}개 삭제 성공, ${failures.length}개 실패`,
        });
      } else {
        toast({
          title: '삭제 완료',
          description: `${selectedPositions.length}개의 직급이 삭제되었습니다.`,
        });
      }

      // 선택 초기화 및 새로고침
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

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
  }, [newRowData]);

  // 새 행 저장
  const handleSaveNewRow = async () => {
    if (!newRowData) return;

    // 필수 필드 검증
    if (!newRowData.name) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '직급명은 필수 입력 항목입니다.',
      });
      return;
    }

    setIsSavingNewRow(true);

    try {
      // createPosition API 호출
      const result = await createPosition({
        name: newRowData.name!,
        sort_order: newRowData.sort_order || (tableData.length + 1) * 10,
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '직급 추가 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: '직급 추가 완료',
        description: `${newRowData.name}이(가) 추가되었습니다.`,
      });

      // 새 행 초기화 및 새로고침
      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '직급 추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  };

  // 새 행 취소
  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  // ESC 키로 신규 직급 추가 취소
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && newRowData) {
        handleCancelNewRow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newRowData]);

  // 새 행이 있을 경우 테이블 데이터에 포함
  const displayData = React.useMemo(() => {
    if (newRowData) {
      return [newRowData as Position, ...tableData];
    }
    return tableData;
  }, [newRowData, tableData]);

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createPositionColumns({
        handleUpdateCell,
        handleUpdateNewRow,
      }),
    [handleUpdateCell, handleUpdateNewRow]
  );

  // 선택된 행 개수
  const selectedCount = Object.keys(rowSelection).length;

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
