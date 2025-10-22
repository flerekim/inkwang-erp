import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { updateBilling, deleteBilling, createBilling } from '@/actions/billings';
import { useTableActions } from '@/hooks/use-table-actions';
import type { BillingWithDetails, BillingOrderOption, BillingFormData } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';
import { format } from 'date-fns';

/**
 * useBillingActions Hook
 *
 * 청구 테이블의 CRUD 작업과 비즈니스 로직 관리
 *
 * @param tableState - useTableState에서 반환된 상태 객체
 * @param newOrders - 신규 수주 목록 (청구 추가 시 계약명 선택용)
 */
export function useBillingActions(
  tableState: UseTableStateReturn<BillingWithDetails>,
  newOrders: BillingOrderOption[]
) {
  const { toast } = useToast();

  const {
    tableData,
    setTableData,
    rowSelection,
    newRowData,
    setNewRowData,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  } = tableState;

  // updateAction 래퍼: Partial<BillingWithDetails>를 Partial<BillingFormData>로 변환
  const updateBillingWrapper = useCallback(
    async (id: string, data: Partial<BillingWithDetails>) => {
      const formData: Partial<BillingFormData> = {
        billing_date: data.billing_date,
        order_id: data.order_id,
        customer_id: data.customer_id,
        billing_type: data.billing_type as 'contract' | 'interim' | 'final' | undefined,
        billing_amount: data.billing_amount?.toString(),
        expected_payment_date: data.expected_payment_date,
        invoice_status: data.invoice_status as 'issued' | 'not_issued' | undefined,
        notes: data.notes,
      };

      const result = await updateBilling(id, formData);
      return { error: result.error || undefined, success: !result.error };
    },
    []
  );

  // createAction 래퍼: BillingFormData로 변환
  const createBillingWrapper = useCallback(
    async (data: BillingFormData): Promise<
      | { data: BillingWithDetails; error: null }
      | { data: null; error: string }
      | { error?: string; success?: boolean; data?: BillingWithDetails }
    > => {
      if (!data.billing_date || !data.order_id || !data.customer_id) {
        return { error: '청구일, 계약명, 고객명은 필수 입력 항목입니다.' };
      }

      if (!data.billing_amount || parseFloat(data.billing_amount) <= 0) {
        return { error: '청구금액은 0보다 커야 합니다.' };
      }

      if (!data.expected_payment_date) {
        return { error: '수금예정일은 필수 입력 항목입니다.' };
      }

      return (await createBilling(data)) as
        | { data: BillingWithDetails; error: null }
        | { data: null; error: string }
        | { error?: string; success?: boolean; data?: BillingWithDetails };
    },
    []
  );

  // deleteAction 래퍼: 반환 타입 변환
  const deleteBillingWrapper = useCallback(
    async (id: string) => {
      const result = await deleteBilling(id);
      return { error: result.error || undefined, success: !result.error };
    },
    []
  );

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleDeleteSelected: deleteSelectedAction,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<BillingWithDetails, BillingFormData>({
    tableData,
    setTableData,
    originalData: tableState.tableData,
    updateAction: updateBillingWrapper,
    deleteAction: deleteBillingWrapper,
    createAction: createBillingWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection)
      .filter((key) => rowSelection[Number(key)])
      .map(Number);

    if (selectedIndices.length === 0) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: '선택된 청구가 없습니다.',
      });
      return;
    }

    await deleteSelectedAction(selectedIndices);
  }, [rowSelection, deleteSelectedAction, toast]);

  // 청구 추가 버튼 핸들러
  const handleAddBilling = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 실패',
        description: '이미 추가 중인 청구가 있습니다. 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 청구 기본값 설정
    const today = format(new Date(), 'yyyy-MM-dd');
    const newBilling = {
      id: `temp-${Date.now()}`,
      billing_number: '', // 자동 생성됨
      billing_date: today,
      order_id: '',
      customer_id: '',
      billing_type: 'contract' as const,
      billing_amount: 0,
      expected_payment_date: today,
      invoice_status: 'not_issued' as const,
      notes: null,
      order: null,
      customer: null,
      created_by: null,
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by_user: null,
      updated_by_user: null,
    } as BillingWithDetails;

    setNewRowData(newBilling);
  }, [newRowData, setNewRowData, toast]);

  // 새 청구 저장 핸들러
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // 유효성 검사
    if (!newRowData.billing_date || !newRowData.order_id || !newRowData.customer_id) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '청구일, 계약명, 고객명은 필수 입력 항목입니다.',
      });
      return;
    }

    if (!newRowData.billing_amount || newRowData.billing_amount <= 0) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '청구금액은 0보다 커야 합니다.',
      });
      return;
    }

    if (!newRowData.expected_payment_date) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '수금예정일은 필수 입력 항목입니다.',
      });
      return;
    }

    // BillingFormData로 변환
    const formData: BillingFormData = {
      billing_date: newRowData.billing_date!,
      order_id: newRowData.order_id!,
      customer_id: newRowData.customer_id!,
      billing_type: (newRowData.billing_type || 'contract') as 'contract' | 'interim' | 'final',
      billing_amount: newRowData.billing_amount.toString(),
      expected_payment_date: newRowData.expected_payment_date!,
      invoice_status: (newRowData.invoice_status || 'not_issued') as 'issued' | 'not_issued',
      notes: newRowData.notes || null,
    };

    await saveNewRowAction(formData, () => true);
  }, [newRowData, saveNewRowAction, toast]);

  // 새 청구 취소 핸들러
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 새 청구 데이터 업데이트 핸들러
  const handleUpdateNewRow = useCallback(
    (columnId: string, value: string) => {
      if (!newRowData) return;

      // 계약명 변경 시 고객명 자동 입력
      if (columnId === 'order_id') {
        const selectedOrder = newOrders.find((order) => order.id === value);
        if (selectedOrder) {
          setNewRowData({
            ...newRowData,
            order_id: value,
            customer_id: selectedOrder.customer_id,
            order: {
              id: selectedOrder.id,
              order_number: selectedOrder.order_number,
              contract_name: selectedOrder.contract_name,
            },
            customer: {
              id: selectedOrder.customer_id,
              name: selectedOrder.customer_name,
              business_number: '',
            },
          });
          return;
        }
      }

      setNewRowData({
        ...newRowData,
        [columnId]: value,
      });
    },
    [newRowData, newOrders, setNewRowData]
  );

  return {
    handleUpdateCell,
    handleDeleteSelected,
    handleAddBilling,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  };
}
