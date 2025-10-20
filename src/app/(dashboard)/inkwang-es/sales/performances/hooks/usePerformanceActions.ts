import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updatePerformance, deletePerformance, createPerformance } from '@/actions/performances';
import { useTableActions } from '@/hooks/use-table-actions';
import type { PerformanceWithDetails, PerformanceFormData, NewOrderOption, PerformanceType, UnitType } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * usePerformanceActions Hook
 *
 * 실적 테이블의 CRUD 작업과 비즈니스 로직 관리
 *
 * @param tableState - useTableState에서 반환된 상태 객체
 * @param newOrders - 신규계약 목록 (새 실적 추가 시 기본값 설정용)
 */
export function usePerformanceActions(
  tableState: UseTableStateReturn<PerformanceWithDetails>,
  newOrders: NewOrderOption[]
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    setTableData,
    rowSelection,
    setRowSelection,
    newRowData,
    setNewRowData,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  } = tableState;

  // createAction 래퍼: PerformanceFormData를 받아서 createPerformance 호출
  const createPerformanceWrapper = useCallback(
    async (data: PerformanceFormData) => {
      if (
        !data.performance_type ||
        !data.order_id ||
        !data.performance_date ||
        !data.unit ||
        data.quantity == null ||
        data.unit_price == null ||
        data.performance_amount == null
      ) {
        return { error: '실적구분, 계약번호, 실적일, 단위, 수량, 단가, 실적금액은 필수 입력 항목입니다.' };
      }

      return await createPerformance(data);
    },
    []
  );

  // Server Actions 어댑터 (ActionResult -> useTableActions 형식)
  const updateActionAdapter = useCallback(
    async (id: string, data: Partial<PerformanceWithDetails>) => {
      // PerformanceWithDetails -> PerformanceFormData 변환
      const formData: Partial<PerformanceFormData> = {
        performance_type: data.performance_type as PerformanceType | undefined,
        order_id: data.order_id,
        performance_date: data.performance_date,
        unit: data.unit as UnitType | undefined,
        quantity: data.quantity !== undefined ? String(data.quantity) : undefined,
        unit_price: data.unit_price !== undefined ? String(data.unit_price) : undefined,
        performance_amount: data.performance_amount !== undefined ? String(data.performance_amount) : undefined,
        manager_id: data.manager_id,
        notes: data.notes,
      };
      const result = await updatePerformance(id, formData);
      return result.error ? { error: result.error } : { success: true };
    },
    []
  );

  const deleteActionAdapter = useCallback(async (id: string) => {
    const result = await deletePerformance(id);
    return result.error ? { error: result.error } : { success: true };
  }, []);

  const createActionAdapter = useCallback(
    async (data: Record<string, unknown>) => {
      // Record<string, unknown>을 PerformanceFormData로 변환
      const formData: PerformanceFormData = {
        performance_type: data.performance_type as PerformanceType,
        order_id: data.order_id as string,
        performance_date: data.performance_date as string,
        unit: data.unit as UnitType,
        quantity: data.quantity as string,
        unit_price: data.unit_price as string,
        performance_amount: data.performance_amount as string,
        manager_id: (data.manager_id as string | null) || null,
        notes: (data.notes as string | null) || null,
      };

      const result = await createPerformanceWrapper(formData);
      if (result.error) {
        return { error: result.error };
      }
      // ActionResult 형식을 useTableActions 형식으로 변환
      // null 체크를 통해 data가 undefined가 아님을 보장
      const performanceData = 'data' in result && result.data !== null ? result.data : undefined;
      return { success: true, data: performanceData };
    },
    [createPerformanceWrapper]
  );

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleDeleteSelected: deleteSelectedAction,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<PerformanceWithDetails, Record<string, unknown>>({
    tableData,
    setTableData,
    originalData: tableState.tableData, // useTableState의 원본 데이터
    updateAction: updateActionAdapter,
    deleteAction: deleteActionAdapter,
    createAction: createActionAdapter,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 실적 추가 (인라인 방식) - 중복 방지 로직 포함
  const handleAddPerformance = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 실적이 있습니다',
        description: '먼저 현재 실적을 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // 첫 번째 신규계약 정보 가져오기 (자동 연동용)
    const firstOrder = newOrders[0];

    const newRow: Partial<PerformanceWithDetails> = {
      id: tempId,
      performance_type: 'planned', // 기본값: 예정
      order_id: firstOrder?.id || '', // 첫 번째 신규계약 기본 선택
      performance_date: today,
      unit: 'ton', // 기본값: Ton
      quantity: 0,
      unit_price: 0,
      performance_amount: 0,
      manager_id: firstOrder?.manager_id || null, // 계약의 담당자 자동 설정
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNewRowData(newRow);
  }, [newRowData, newOrders, toast, setNewRowData]);

  // 새 행 데이터 업데이트 (계약 선택 시 자동 연동 포함)
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;

      const updatedData = { ...newRowData, [field]: value };

      // 계약번호(order_id) 변경 시 자동 연동
      if (field === 'order_id') {
        const selectedOrder = newOrders.find((order) => order.id === value);
        if (selectedOrder) {
          // 고객과 담당자 자동 설정
          updatedData.manager_id = selectedOrder.manager_id;
          // Note: customer_id는 PerformanceWithDetails에 없으므로 컬럼에서 직접 처리
        }
      }

      // 수량 또는 단가 변경 시 실적금액 자동 계산
      if (field === 'quantity' || field === 'unit_price') {
        const quantity =
          typeof updatedData.quantity === 'number'
            ? updatedData.quantity
            : parseFloat(String(updatedData.quantity || 0).replace(/,/g, ''));
        const unitPrice =
          typeof updatedData.unit_price === 'number'
            ? updatedData.unit_price
            : parseInt(String(updatedData.unit_price || 0).replace(/,/g, ''), 10);

        // 실적금액 = 수량 × 단가 (소수점 버림)
        updatedData.performance_amount = Math.floor(quantity * unitPrice);
      }

      setNewRowData(updatedData);
    },
    [newRowData, newOrders, setNewRowData]
  );

  // 새 행 저장 (useTableActions 훅 활용 + performance-specific 로직)
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // Performance-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (
        !data.performance_type ||
        !data.order_id ||
        !data.performance_date ||
        !data.unit ||
        data.quantity == null ||
        data.unit_price == null ||
        data.performance_amount == null
      ) {
        return { error: '실적구분, 계약번호, 실적일, 단위, 수량, 단가, 실적금액은 필수 입력 항목입니다.' };
      }
      return true;
    };

    // useTableActions의 saveNewRowAction 호출
    const preparedData: Record<string, unknown> = {
      performance_type: newRowData.performance_type,
      order_id: newRowData.order_id!,
      performance_date: newRowData.performance_date!,
      unit: newRowData.unit,
      quantity: String(newRowData.quantity || 0),
      unit_price: String(newRowData.unit_price || 0),
      performance_amount: String(newRowData.performance_amount || 0),
      manager_id: newRowData.manager_id || null,
      notes: newRowData.notes || null,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      toast({
        title: '실적 추가 완료',
        description: '새 실적이 추가되었습니다.',
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 모바일 편집 저장
  const handleSaveMobileEdit = useCallback(
    async (
      editingPerformance: PerformanceWithDetails | null,
      editFormData: Partial<PerformanceWithDetails>
    ) => {
      if (!editingPerformance) return { success: false };

      try {
        // Partial<PerformanceWithDetails>를 PerformanceFormData로 변환
        const formData: Partial<PerformanceFormData> = {
          order_id: editFormData.order_id,
          performance_date: editFormData.performance_date,
          performance_type: editFormData.performance_type as PerformanceType | undefined,
          quantity: editFormData.quantity !== undefined ? String(editFormData.quantity) : undefined,
          unit: editFormData.unit as UnitType | undefined,
          unit_price: editFormData.unit_price !== undefined ? String(editFormData.unit_price) : undefined,
          performance_amount: editFormData.performance_amount !== undefined ? String(editFormData.performance_amount) : undefined,
          manager_id: editFormData.manager_id,
          notes: editFormData.notes,
        };

        const result = await updatePerformance(editingPerformance.id, formData);

        if (result.error) {
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          return { success: false };
        }

        toast({
          title: '수정 완료',
          description: '실적 정보가 수정되었습니다.',
        });

        router.refresh();
        return { success: true };
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '수정 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
        return { success: false };
      }
    },
    [toast, router]
  );

  return {
    // CRUD 작업
    handleUpdateCell,
    handleDeleteSelected,
    handleAddPerformance,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
    handleSaveMobileEdit,
  };
}
