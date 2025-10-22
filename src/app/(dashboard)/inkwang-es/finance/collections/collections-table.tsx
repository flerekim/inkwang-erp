'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createCollectionColumns } from './collection-columns';
import { CollectionToolbar } from './components/CollectionToolbar';
import { useCollectionData } from './hooks/useCollectionData';
import { useCollectionActions } from './hooks/useCollectionActions';
import { deleteCollection } from '@/actions/collections';
import type { CollectionWithDetails } from '@/types';

interface CollectionsTableProps {
  data: CollectionWithDetails[];
}

export function CollectionsTable({ data }: CollectionsTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<CollectionWithDetails>(data);
  const {
    rowSelection,
    setRowSelection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    selectedCount,
    displayData,
    tableData,
    isDeleting,
    isSavingNewRow,
  } = tableState;

  // 수금 관련 데이터 및 다이얼로그 상태
  const {
    billingStatuses,
    bankAccounts,
  } = useCollectionData(displayData);

  // 수금 CRUD 작업
  const {
    handleUpdateCell,
    handleAddCollection,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = useCollectionActions(tableState, billingStatuses, bankAccounts);

  const router = useRouter();
  const { toast } = useToast();

  // 삭제 핸들러
  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIds = Object.keys(rowSelection)
      .map(Number)
      .map((index) => displayData[index]?.id)
      .filter((id): id is string => !!id && !id.startsWith('temp-'));

    if (selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '선택된 수금이 없습니다.',
      });
      return;
    }

    tableState.setIsDeleting(true);

    try {
      const results = await Promise.all(
        selectedIds.map((id) => deleteCollection(id))
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error || '삭제 중 오류가 발생했습니다');
      }

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 수금이 삭제되었습니다.`,
      });

      setRowSelection({});
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      tableState.setIsDeleting(false);
    }
  }, [rowSelection, displayData, tableState, toast, router, setRowSelection, setDeleteDialogOpen]);

  // 통합 업데이트 핸들러
  const handleUnifiedUpdate = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const collection = displayData[rowIndex];
      if (!collection) return;

      if (collection.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        const actualIndex = tableData.findIndex((c) => c.id === collection.id);
        if (actualIndex !== -1) {
          await handleUpdateCell(actualIndex, columnId, value);
        }
      }
    },
    [displayData, tableData, handleUpdateCell, handleUpdateNewRow]
  );

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createCollectionColumns({
        billingStatuses,
        bankAccounts,
        onUpdateCell: handleUnifiedUpdate,
      }),
    [billingStatuses, bankAccounts, handleUnifiedUpdate]
  );

  return (
    <>
      {/* 데스크톱 테이블 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="billing_id"
          searchPlaceholder="청구번호로 검색..."
          toolbar={
            <CollectionToolbar
              data={tableData}
              selectedCount={selectedCount}
              hasNewRow={!!newRowData}
              isSavingNewRow={isSavingNewRow}
              isDeleting={isDeleting}
              onAdd={handleAddCollection}
              onDelete={() => setDeleteDialogOpen(true)}
              onSaveNewRow={handleSaveNewRow}
              onCancelNewRow={handleCancelNewRow}
            />
          }
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          enableColumnResizing
          columnResizeMode="onChange"
        />
      </div>

      {/* 모바일 카드 뷰 (필요 시 추가 구현) */}
      <div className="md:hidden">
        {/* MobileCollectionCard 컴포넌트 구현 (선택사항) */}
        <div className="text-center text-muted-foreground p-8">
          모바일 뷰는 추후 구현 예정입니다.
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="수금 삭제"
        description={`선택한 ${selectedCount}개의 수금을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </>
  );
}
