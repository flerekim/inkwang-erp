'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createOrderColumns } from './order-columns';
import { PollutantEditDialog } from './pollutant-edit-dialog';
import { MethodEditDialog } from './method-edit-dialog';
import { ParentOrderSelectDialog } from './parent-order-select-dialog';
import { AttachmentDialog } from './attachment-dialog';
import { MobileOrderCard } from './mobile-order-card';
import { OrderToolbar } from './components/OrderToolbar';
import { useOrderData } from './hooks/useOrderData';
import { useOrderActions } from './hooks/useOrderActions';
import { transformToHierarchical } from '@/lib/order-utils';
import { deleteOrder } from '@/actions/orders';
import type { OrderWithDetails } from '@/types';

interface OrdersTableProps {
  data: OrderWithDetails[];
}

export function OrdersTable({ data }: OrdersTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<OrderWithDetails>(data);
  const {
    rowSelection,
    setRowSelection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    selectedCount,
    tableData,
    isDeleting,
    isSavingNewRow,
  } = tableState;

  // 계층 구조 변환된 displayData
  const displayData = React.useMemo(() => {
    const hierarchicalData = transformToHierarchical(tableData);
    if (newRowData) {
      return [newRowData as OrderWithDetails, ...hierarchicalData];
    }
    return hierarchicalData;
  }, [tableData, newRowData]);

  // 수주 관련 데이터 및 다이얼로그 상태
  const {
    customers,
    verificationCompanies,
    users,
    newOrders,
    pollutants,
    methods,
    searchQuery,
    setSearchQuery,
    pollutantDialogOpen,
    setPollutantDialogOpen,
    editingOrderForPollutant,
    setEditingOrderForPollutant,
    methodDialogOpen,
    setMethodDialogOpen,
    editingOrderForMethod,
    setEditingOrderForMethod,
    parentOrderDialogOpen,
    setParentOrderDialogOpen,
    editingOrderForParent,
    setEditingOrderForParent,
    attachmentDialogOpen,
    setAttachmentDialogOpen,
    editingOrderForAttachment,
    setEditingOrderForAttachment,
  } = useOrderData(displayData);

  // 수주 CRUD 작업
  const {
    handleUpdateCell,
    handleAddOrder,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
    handleSavePollutants,
    handleSaveMethods,
    handleSelectParentOrder,
    handleAttachmentsChange,
  } = useOrderActions(tableState, customers, pollutants);

  const router = useRouter();
  const { toast } = useToast();

  // 계층 구조 데이터를 위한 삭제 핸들러 (인덱스 → ID 변환)
  const handleDeleteSelected = React.useCallback(async () => {
    // displayData에서 선택된 행의 ID 추출
    const selectedIds = Object.keys(rowSelection)
      .map(Number)
      .map((index) => displayData[index]?.id)
      .filter((id): id is string => !!id && !id.startsWith('temp-'));

    if (selectedIds.length === 0) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '선택된 수주가 없습니다.',
      });
      return;
    }

    tableState.setIsDeleting(true);

    try {
      // 각 ID에 대해 삭제 수행
      const results = await Promise.all(
        selectedIds.map((id) => deleteOrder(id))
      );

      // 에러 체크
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error);
      }

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 수주가 삭제되었습니다.`,
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

  // 통합 업데이트 핸들러 (새 행과 기존 행 모두 처리)
  const handleUnifiedUpdate = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const order = displayData[rowIndex];
      if (!order) return;

      // temp- prefix가 있으면 새 행
      if (order.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        // 기존 행: tableData에서 실제 인덱스 찾기
        const actualIndex = tableData.findIndex((o) => o.id === order.id);
        if (actualIndex !== -1) {
          await handleUpdateCell(actualIndex, columnId, value);
        }
      }
    },
    [displayData, tableData, handleUpdateCell, handleUpdateNewRow]
  );

  // 오염물질 편집 다이얼로그 열기
  const handleEditPollutants = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForPollutant(order);
    setPollutantDialogOpen(true);
  }, [setEditingOrderForPollutant, setPollutantDialogOpen]);

  // 정화방법 편집 다이얼로그 열기
  const handleEditMethods = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForMethod(order);
    setMethodDialogOpen(true);
  }, [setEditingOrderForMethod, setMethodDialogOpen]);

  // 부모 계약 선택 다이얼로그 열기
  const handleOpenParentOrderDialog = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForParent(order);
    setParentOrderDialogOpen(true);
  }, [setEditingOrderForParent, setParentOrderDialogOpen]);

  // 첨부파일 관리 다이얼로그 열기
  const handleManageAttachments = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForAttachment(order);
    setAttachmentDialogOpen(true);
  }, [setEditingOrderForAttachment, setAttachmentDialogOpen]);

  // 컬럼 정의 (메모이제이션)
  const columns = React.useMemo(
    () =>
      createOrderColumns({
        customers,
        verificationCompanies,
        users,
        newOrders,
        onUpdateCell: handleUnifiedUpdate,
        onEditPollutants: handleEditPollutants,
        onEditMethods: handleEditMethods,
        onSelectParentOrder: handleOpenParentOrderDialog,
        onManageAttachments: handleManageAttachments,
      }),
    [
      customers,
      verificationCompanies,
      users,
      newOrders,
      handleUnifiedUpdate,
      handleEditPollutants,
      handleEditMethods,
      handleOpenParentOrderDialog,
      handleManageAttachments,
    ]
  );

  // 모바일용 필터링된 데이터
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return displayData;
    }

    const query = searchQuery.toLowerCase();
    return displayData.filter((order) => {
      return (
        order.contract_name?.toLowerCase().includes(query) ||
        order.order_number?.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.contract_status?.toLowerCase().includes(query)
      );
    });
  }, [displayData, searchQuery]);

  return (
    <>
      {/* 데스크톱 테이블 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="contract_name"
          searchPlaceholder="계약명으로 검색..."
          toolbar={
            <OrderToolbar
              data={tableData}
              selectedCount={selectedCount}  // 실제 selectedCount 전달
              hasNewRow={!!newRowData}
              isSavingNewRow={isSavingNewRow}
              isDeleting={isDeleting}
              onAdd={handleAddOrder}
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

      {/* 모바일 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {/* 모바일 툴바 */}
        <div className="flex items-center gap-2">
          <OrderToolbar
            isMobile
            data={tableData}
            selectedCount={selectedCount}  // 실제 selectedCount 전달
            hasNewRow={!!newRowData}
            isSavingNewRow={isSavingNewRow}
            isDeleting={isDeleting}
            onAdd={handleAddOrder}
            onDelete={() => setDeleteDialogOpen(true)}
            onSaveNewRow={handleSaveNewRow}
            onCancelNewRow={handleCancelNewRow}
          />
        </div>

        {/* 모바일 검색 */}
        <input
          type="text"
          placeholder="계약명, 계약번호, 고객명, 상태 검색..."
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* 모바일 카드 리스트 */}
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">검색 결과가 없습니다.</div>
        ) : (
          filteredData.map((order) => (
            <MobileOrderCard
              key={order.id}
              order={order}
              isSelected={rowSelection[displayData.findIndex((o) => o.id === order.id)] || false}
              onSelectChange={(checked) => {
                const idx = displayData.findIndex((o) => o.id === order.id);
                if (idx !== -1) {
                  setRowSelection({ [idx]: checked });
                }
              }}
              onCardClick={() => {
                // 모바일 카드 클릭 시 동작 (필요시 구현)
              }}
            />
          ))
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="수주 삭제"
        description={`선택한 ${selectedCount}개의 수주를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />

      {/* 오염물질 편집 다이얼로그 */}
      <PollutantEditDialog
        open={pollutantDialogOpen}
        onOpenChange={setPollutantDialogOpen}
        order={editingOrderForPollutant}
        pollutants={pollutants}
        onSave={handleSavePollutants}
      />

      {/* 정화방법 편집 다이얼로그 */}
      <MethodEditDialog
        open={methodDialogOpen}
        onOpenChange={setMethodDialogOpen}
        order={editingOrderForMethod}
        methods={methods}
        onSave={handleSaveMethods}
      />

      {/* 부모 계약 선택 다이얼로그 */}
      <ParentOrderSelectDialog
        open={parentOrderDialogOpen}
        onOpenChange={setParentOrderDialogOpen}
        newOrders={newOrders}
        currentParentOrderId={editingOrderForParent?.parent_order_id}
        onSelect={(parentOrderId) => handleSelectParentOrder(parentOrderId, editingOrderForParent)}
      />

      {/* 첨부파일 관리 다이얼로그 */}
      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        order={editingOrderForAttachment}
        onAttachmentsChange={handleAttachmentsChange}
      />
    </>
  );
}
