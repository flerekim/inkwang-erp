import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateOrder, deleteOrder, createOrder } from '@/actions/orders';
import { useTableActions } from '@/hooks/use-table-actions';
import type { OrderWithDetails, Customer, Pollutant, PollutantInput, AttachmentMetadata, OrderFormData } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useOrderActions Hook
 *
 * 수주 테이블의 CRUD 작업과 비즈니스 로직 관리
 *
 * @param tableState - useTableState에서 반환된 상태 객체
 * @param customers - 고객 목록 (새 수주 추가 시 기본값 설정용)
 * @param pollutants - 오염물질 목록 (오염물질 편집용)
 */
export function useOrderActions(
  tableState: UseTableStateReturn<OrderWithDetails>,
  customers: Customer[],
  pollutants: Pollutant[]
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

  // updateAction 래퍼: Partial<OrderWithDetails>를 Partial<OrderFormData>로 변환
  const updateOrderWrapper = useCallback(
    async (id: string, data: Partial<OrderWithDetails>) => {
      const formData: Partial<OrderFormData> = {
        contract_type: data.contract_type as 'new' | 'change' | undefined,
        contract_status: data.contract_status as 'quotation' | 'contract' | 'in_progress' | 'completed' | undefined,
        business_type: data.business_type as 'civilian' | 'government' | undefined,
        pricing_type: data.pricing_type as 'total' | 'unit_price' | undefined,
        contract_name: data.contract_name,
        contract_date: data.contract_date,
        contract_amount: data.contract_amount,
        customer_id: data.customer_id,
        verification_company_id: data.verification_company_id,
        manager_id: data.manager_id,
        parent_order_id: data.parent_order_id,
        export_type: data.export_type as 'on_site' | 'export' | 'new_business' | undefined,
        contract_unit: data.contract_unit as 'ton' | 'unit' | 'm3' | null | undefined,
        notes: data.notes,
      };

      return await updateOrder(id, formData);
    },
    []
  );

  // createAction 래퍼: Partial<OrderWithDetails>를 OrderFormData로 변환
  const createOrderWrapper = useCallback(
    async (data: OrderFormData): Promise<
      | { data: OrderWithDetails; error: null }
      | { data: null; error: string }
      | { error?: string; success?: boolean; data?: OrderWithDetails }
    > => {
      if (!data.contract_name?.trim() || !data.customer_id) {
        return { error: '계약명과 고객은 필수 입력 항목입니다.' };
      }

      return (await createOrder(data)) as
        | { data: OrderWithDetails; error: null }
        | { data: null; error: string }
        | { error?: string; success?: boolean; data?: OrderWithDetails };
    },
    []
  );

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleDeleteSelected: deleteSelectedAction,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<OrderWithDetails, OrderFormData>({
    tableData,
    setTableData,
    originalData: tableState.tableData,
    updateAction: updateOrderWrapper,
    deleteAction: deleteOrder,
    createAction: createOrderWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({});
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 수주 추가 (인라인 방식)
  const handleAddOrder = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 수주가 있습니다',
        description: '현재 추가 중인 수주를 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<OrderWithDetails> = {
      id: tempId,
      order_number: '자동생성',
      contract_type: 'new',
      contract_status: 'quotation',
      business_type: 'civilian',
      pricing_type: 'total',
      export_type: 'on_site',
      contract_name: '',
      contract_date: new Date().toISOString().split('T')[0],
      contract_amount: 0,
      contract_unit: null,
      customer_id: customers[0]?.id || '',
      verification_company_id: null,
      manager_id: null,
      parent_order_id: null,
      notes: null,
      pollutants: [],
      methods: [],
    };

    setNewRowData(newRow);
  }, [newRowData, customers, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;

      // 타입 변환 처리
      let processedValue = value;
      if (field === 'contract_amount') {
        processedValue = typeof value === 'string' ? Number(value) || 0 : value;
      }

      setNewRowData({ ...newRowData, [field]: processedValue });
    },
    [newRowData, setNewRowData]
  );

  // 새 행 저장
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // Partial<OrderWithDetails>를 OrderFormData로 변환
    const formData: OrderFormData = {
      contract_type: (newRowData.contract_type || 'new') as 'new' | 'change',
      contract_status: (newRowData.contract_status || 'quotation') as 'quotation' | 'contract' | 'in_progress' | 'completed',
      business_type: (newRowData.business_type || 'civilian') as 'civilian' | 'government',
      pricing_type: (newRowData.pricing_type || 'total') as 'total' | 'unit_price',
      contract_name: newRowData.contract_name || '',
      contract_date: newRowData.contract_date || new Date().toISOString().split('T')[0],
      contract_amount: newRowData.contract_amount || 0,
      customer_id: newRowData.customer_id || '',
      verification_company_id: newRowData.verification_company_id || null,
      manager_id: newRowData.manager_id || null,
      parent_order_id: newRowData.parent_order_id || null,
      export_type: (newRowData.export_type || 'on_site') as 'on_site' | 'export' | 'new_business',
      contract_unit: (newRowData.contract_unit as 'ton' | 'unit' | 'm3' | null) || null,
      notes: newRowData.notes || null,
      pollutants: (newRowData.pollutants || []).map(p => ({
        pollutant_id: p.pollutant_id,
        concentration: String(p.concentration),
        group_name: p.group_name || null,
      })),
      methods: (newRowData.methods || []).map(m => m.method_id),
    };

    const result = await saveNewRowAction(
      formData,
      (data: Record<string, unknown>) => {
        if (!data.contract_name || typeof data.contract_name !== 'string' || !data.contract_name.trim()) {
          return { error: '계약명을 입력해주세요.' };
        }
        if (!data.customer_id) {
          return { error: '고객을 선택해주세요.' };
        }
        return true;
      }
    );

    if (result.success) {
      toast({
        title: '추가 완료',
        description: '새로운 수주가 추가되었습니다.',
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 오염물질 저장
  const handleSavePollutants = useCallback(
    async (orderId: string, pollutantsData: PollutantInput[]) => {
      // 새 행인 경우
      if (orderId.startsWith('temp-')) {
        if (!newRowData) return;

        setNewRowData({
          ...newRowData,
          pollutants: pollutantsData.map(p => ({
            id: `temp-pollutant-${p.pollutant_id}`,
            order_id: '',
            pollutant_id: p.pollutant_id,
            concentration: Number(p.concentration) || 0,
            group_name: p.group_name || null,
            pollutant: pollutants.find(pol => pol.id === p.pollutant_id) || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        });

        toast({
          title: '오염물질 설정',
          description: '오염물질이 설정되었습니다. 저장 버튼을 눌러 수주를 완료하세요.',
        });
        return;
      }

      // 기존 행인 경우
      try {
        const result = await updateOrder(orderId, { pollutants: pollutantsData });

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: '저장 완료',
          description: '오염물질이 저장되었습니다.',
        });

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
        throw error;
      }
    },
    [newRowData, pollutants, toast, router, setNewRowData]
  );

  // 정화방법 저장
  const handleSaveMethods = useCallback(
    async (orderId: string, methodIds: string[]) => {
      // 새 행인 경우
      if (orderId.startsWith('temp-')) {
        if (!newRowData) return;

        setNewRowData({
          ...newRowData,
          methods: methodIds.map(methodId => ({
            id: `temp-method-${methodId}`,
            order_id: '',
            method_id: methodId,
            method: null, // method 정보는 나중에 서버에서 로드
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        });

        toast({
          title: '정화방법 설정',
          description: '정화방법이 설정되었습니다. 저장 버튼을 눌러 수주를 완료하세요.',
        });
        return;
      }

      // 기존 행인 경우
      try {
        const result = await updateOrder(orderId, { methods: methodIds });

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: '저장 완료',
          description: '정화방법이 저장되었습니다.',
        });

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
        throw error;
      }
    },
    [newRowData, toast, router, setNewRowData]
  );

  // 부모 계약 선택
  const handleSelectParentOrder = useCallback(
    async (parentOrderId: string | null, editingOrder: OrderWithDetails | null) => {
      if (!editingOrder) return;

      // 새 행인 경우
      if (editingOrder.id?.startsWith('temp-')) {
        if (!newRowData) return;

        setNewRowData({
          ...newRowData,
          parent_order_id: parentOrderId,
        });

        toast({
          title: '부모 계약 설정',
          description: '부모 계약이 설정되었습니다. 저장 버튼을 눌러 수주를 완료하세요.',
        });
        return;
      }

      // 기존 행인 경우
      try {
        const result = await updateOrder(editingOrder.id, {
          parent_order_id: parentOrderId,
        });

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: '저장 완료',
          description: '부모 계약이 연동되었습니다.',
        });

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
        throw error;
      }
    },
    [newRowData, toast, router, setNewRowData]
  );

  // 첨부파일 변경
  const handleAttachmentsChange = useCallback(
    (orderId: string, attachments: AttachmentMetadata[]) => {
      const attachmentPaths = attachments.map(a => a.path);
      setTableData((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, attachments: attachmentPaths } : order
        )
      );
    },
    [setTableData]
  );

  return {
    // CRUD 작업
    handleUpdateCell,
    handleDeleteSelected,
    handleAddOrder,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,

    // 특수 작업
    handleSavePollutants,
    handleSaveMethods,
    handleSelectParentOrder,
    handleAttachmentsChange,
  };
}
