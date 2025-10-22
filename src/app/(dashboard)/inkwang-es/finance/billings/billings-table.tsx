'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { DataTable } from '@/components/common/data-table';
import { useTableState } from '@/hooks/use-table-state';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createBillingColumns } from './billing-columns';
import { BillingToolbar } from './components/BillingToolbar';
import { useBillingData } from './hooks/useBillingData';
import { useBillingActions } from './hooks/useBillingActions';
import { deleteBilling } from '@/actions/billings';
import type { BillingWithDetails } from '@/types';

interface BillingsTableProps {
  data: BillingWithDetails[];
}

/**
 * 청구관리 테이블 컴포넌트
 *
 * 역할:
 * - 테이블 상태 관리 (useTableState)
 * - 청구 데이터 로딩 (useBillingData)
 * - CRUD 작업 핸들링 (useBillingActions)
 * - 데스크톱/모바일 반응형 뷰
 *
 * 특징:
 * - 인라인 편집 지원
 * - 계약명 선택 시 고객명 자동 입력
 * - Excel 내보내기 & 인쇄 기능
 */
export function BillingsTable({ data }: BillingsTableProps) {
  // 테이블 상태 관리
  const tableState = useTableState<BillingWithDetails>(data);
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

  // 청구 관련 데이터 및 다이얼로그 상태
  const {
    newOrders,
    customers,
    searchQuery,
    setSearchQuery,
  } = useBillingData(displayData);

  // 청구 CRUD 작업
  const {
    handleUpdateCell,
    handleAddBilling,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  } = useBillingActions(tableState, newOrders);

  const router = useRouter();
  const { toast } = useToast();

  // 삭제 핸들러 (ID 기반)
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
        description: '선택된 청구가 없습니다.',
      });
      return;
    }

    tableState.setIsDeleting(true);

    try {
      // 각 ID에 대해 삭제 수행
      const results = await Promise.all(
        selectedIds.map((id) => deleteBilling(id))
      );

      // 에러 체크
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error || "알 수 없는 오류");
      }

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 청구가 삭제되었습니다.`,
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
      const billing = displayData[rowIndex];
      if (!billing) return;

      // temp- prefix가 있으면 새 행
      if (billing.id?.startsWith('temp-')) {
        handleUpdateNewRow(columnId, value);
      } else {
        // 기존 행: tableData에서 실제 인덱스 찾기
        const actualIndex = tableData.findIndex((b) => b.id === billing.id);
        if (actualIndex !== -1) {
          await handleUpdateCell(actualIndex, columnId, value);
        }
      }
    },
    [displayData, tableData, handleUpdateCell, handleUpdateNewRow]
  );

  // 컬럼 정의 (메모이제이션)
  const columns = React.useMemo(
    () =>
      createBillingColumns({
        customers,
        newOrders,
        onUpdateCell: handleUnifiedUpdate,
      }),
    [customers, newOrders, handleUnifiedUpdate]
  );

  // 모바일용 필터링된 데이터
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return displayData;
    }

    const query = searchQuery.toLowerCase();
    return displayData.filter((billing) => {
      return (
        billing.billing_number?.toLowerCase().includes(query) ||
        billing.order?.contract_name?.toLowerCase().includes(query) ||
        billing.customer?.name?.toLowerCase().includes(query) ||
        billing.billing_type?.toLowerCase().includes(query) ||
        billing.invoice_status?.toLowerCase().includes(query)
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
          searchKey="billing_number"
          searchPlaceholder="청구번호로 검색..."
          toolbar={
            <BillingToolbar
              data={tableData}
              selectedCount={selectedCount}
              hasNewRow={!!newRowData}
              isSavingNewRow={isSavingNewRow}
              isDeleting={isDeleting}
              onAdd={handleAddBilling}
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
          <BillingToolbar
            isMobile
            data={tableData}
            selectedCount={selectedCount}
            hasNewRow={!!newRowData}
            isSavingNewRow={isSavingNewRow}
            isDeleting={isDeleting}
            onAdd={handleAddBilling}
            onDelete={() => setDeleteDialogOpen(true)}
            onSaveNewRow={handleSaveNewRow}
            onCancelNewRow={handleCancelNewRow}
          />
        </div>

        {/* 모바일 검색 */}
        <input
          type="text"
          placeholder="청구번호, 계약명, 고객명, 청구구분 검색..."
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* 모바일 카드 리스트 */}
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">검색 결과가 없습니다.</div>
        ) : (
          filteredData.map((billing) => (
            <div
              key={billing.id}
              className="border rounded-lg p-4 space-y-2 bg-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {billing.billing_number || '자동생성'}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${
                  billing.billing_type === 'contract'
                    ? 'bg-blue-100 text-blue-700'
                    : billing.billing_type === 'interim'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {billing.billing_type === 'contract' ? '계약금' :
                   billing.billing_type === 'interim' ? '중도금' : '잔금'}
                </span>
              </div>
              <div className="text-base font-semibold">
                {billing.order?.contract_name || '-'}
              </div>
              <div className="text-sm text-muted-foreground">
                {billing.customer?.name || '-'}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>청구금액</span>
                <span className="font-semibold">
                  {billing.billing_amount?.toLocaleString() || '0'}원
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>청구일: {billing.billing_date || '-'}</span>
                <span>수금예정: {billing.expected_payment_date || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">계산서</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  billing.invoice_status === 'issued'
                    ? 'bg-green-100 text-green-700'
                    : 'border border-slate-300 text-slate-700'
                }`}>
                  {billing.invoice_status === 'issued' ? '발행' : '미발행'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="청구 삭제"
        description={`선택한 ${selectedCount}개의 청구를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      />
    </>
  );
}
