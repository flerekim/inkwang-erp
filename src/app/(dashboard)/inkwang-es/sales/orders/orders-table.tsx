'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createOrderColumns } from './order-columns';
import { PollutantEditDialog } from './pollutant-edit-dialog';
import { MethodEditDialog } from './method-edit-dialog';
import { ParentOrderSelectDialog } from './parent-order-select-dialog';
import { AttachmentDialog } from './attachment-dialog';
import { MobileOrderCard } from './mobile-order-card';
import {
  deleteOrder,
  updateOrder,
  createOrder,
  getCustomers,
  getVerificationCompanies,
  getUsers,
  getNewOrders,
  getPollutants,
  getMethods,
} from '@/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { transformToHierarchical } from '@/lib/order-utils';
import type { OrderWithDetails, Customer, UserSelectOption, Pollutant, Method, PollutantInput, AttachmentMetadata } from '@/types';

interface OrdersTableProps {
  data: OrderWithDetails[];
}

export function OrdersTable({ data }: OrdersTableProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 데이터 메모이제이션 (TanStack Table 안정성 확보)
  const memoizedData = React.useMemo(() => data, [data]);
  const [tableData, setTableData] = React.useState<OrderWithDetails[]>(memoizedData);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // 신규 행 관리 (인라인 추가)
  const [newRowData, setNewRowData] = React.useState<Partial<OrderWithDetails> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = React.useState(false);

  // 오염물질 편집 다이얼로그
  const [pollutantDialogOpen, setPollutantDialogOpen] = React.useState(false);
  const [editingOrderForPollutant, setEditingOrderForPollutant] = React.useState<OrderWithDetails | null>(null);

  // 정화방법 편집 다이얼로그
  const [methodDialogOpen, setMethodDialogOpen] = React.useState(false);
  const [editingOrderForMethod, setEditingOrderForMethod] = React.useState<OrderWithDetails | null>(null);

  // 부모 계약 선택 다이얼로그
  const [parentOrderDialogOpen, setParentOrderDialogOpen] = React.useState(false);
  const [editingOrderForParent, setEditingOrderForParent] = React.useState<OrderWithDetails | null>(null);

  // 첨부파일 관리 다이얼로그
  const [attachmentDialogOpen, setAttachmentDialogOpen] = React.useState(false);
  const [editingOrderForAttachment, setEditingOrderForAttachment] = React.useState<OrderWithDetails | null>(null);

  // 모바일 검색
  const [searchQuery, setSearchQuery] = React.useState('');

  // 관계형 데이터
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [verificationCompanies, setVerificationCompanies] = React.useState<Customer[]>([]);
  const [users, setUsers] = React.useState<UserSelectOption[]>([]);
  const [newOrders, setNewOrders] = React.useState<Array<{ id: string; order_number: string; contract_name: string }>>([]);
  const [pollutants, setPollutants] = React.useState<Pollutant[]>([]);
  const [methods, setMethods] = React.useState<Method[]>([]);

  // 관계형 데이터 로드
  React.useEffect(() => {
    const loadOptions = async () => {
      try {
        const [customersData, verificationData, usersData, newOrdersData, pollutantsData, methodsData] = await Promise.all([
          getCustomers(),
          getVerificationCompanies(),
          getUsers(),
          getNewOrders(),
          getPollutants(),
          getMethods(),
        ]);
        setCustomers(customersData);
        setVerificationCompanies(verificationData);
        setUsers(usersData);
        setNewOrders(newOrdersData);
        setPollutants(pollutantsData);
        setMethods(methodsData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  // ESC 키 핸들러 제거됨
  // 이유: Dialog 컴포넌트와 충돌하여 새 행이 의도치 않게 취소되는 문제 발생
  // 해결: 명시적인 "취소" 버튼만 사용

  // 수주 추가 (인라인)
  const handleAddOrder = () => {
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
      customer_id: customers[0]?.id || '',
      verification_company_id: null,
      manager_id: null,
      parent_order_id: null,
      notes: null,
      pollutants: [],
      methods: [],
    };
    setNewRowData(newRow);
  };

  // 신규 행 필드 업데이트
  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    setNewRowData((prev) => {
      if (!prev) return prev;

      // 타입 변환 처리: contract_amount는 number로 변환
      let processedValue = value;
      if (field === 'contract_amount') {
        processedValue = typeof value === 'string' ? Number(value) || 0 : value;
      }

      return { ...prev, [field]: processedValue };
    });
  }, []);

  // 기존 행 셀 업데이트 (인라인 편집) - useCallback으로 메모이제이션
  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const order = tableData[rowIndex];
      if (!order) return;

      // Optimistic update
      const prevData = [...tableData];
      setTableData((old) =>
        old.map((row, idx) => (idx === rowIndex ? { ...row, [columnId]: value } : row))
      );

      try {
        const result = await updateOrder(order.id, { [columnId]: value });
        if (result.error) {
          // Rollback on error
          setTableData(prevData);
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          throw new Error(result.error);
        }

        toast({
          title: '수정 완료',
          description: '수주 정보가 수정되었습니다.',
        });
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, toast, router]
  );

  // 표시할 데이터 (신규 행 포함 + 계층 구조 변환)
  const displayData = React.useMemo(() => {
    // 1. 계층 구조로 변환 (부모-자식 관계 설정)
    const hierarchicalData = transformToHierarchical(tableData);

    // 2. 신규 행이 있으면 맨 앞에 추가
    if (newRowData) {
      return [newRowData as OrderWithDetails, ...hierarchicalData];
    }

    return hierarchicalData;
  }, [tableData, newRowData]);

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

  // 신규 행 저장 (낙관적 업데이트 적용)
  const handleSaveNewRow = async () => {
    if (!newRowData) return;

    // 필수 필드 검증
    if (!newRowData.contract_name?.trim()) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '계약명을 입력해주세요.',
      });
      return;
    }

    if (!newRowData.customer_id) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '고객을 선택해주세요.',
      });
      return;
    }

    setIsSavingNewRow(true);

    // 낙관적 업데이트: 즉시 테이블에 추가 (시각적 피드백)
    const optimisticOrder: OrderWithDetails = {
      ...(newRowData as OrderWithDetails),
      id: `optimistic-${Date.now()}`, // temp- 대신 optimistic- 사용 (편집 모드 스타일 방지)
      order_number: '(저장 중...)', // 시각적 피드백
    };

    // 1. 백업: 실패 시 복원용
    const backupNewRowData = { ...newRowData };

    // 2. 즉시 UI 업데이트: newRowData 제거 + tableData에 추가
    setNewRowData(null);
    setTableData((prev) => [optimisticOrder, ...prev]);

    try {
      const result = await createOrder({
        contract_type: (newRowData.contract_type || 'new') as 'new' | 'change',
        contract_status: (newRowData.contract_status || 'quotation') as 'quotation' | 'contract' | 'in_progress' | 'completed',
        business_type: (newRowData.business_type || 'civilian') as 'civilian' | 'government',
        pricing_type: (newRowData.pricing_type || 'total') as 'total' | 'unit_price',
        contract_name: newRowData.contract_name!,
        contract_date: newRowData.contract_date || new Date().toISOString().split('T')[0],
        contract_amount: newRowData.contract_amount || 0,
        customer_id: newRowData.customer_id!,
        verification_company_id: newRowData.verification_company_id || null,
        manager_id: newRowData.manager_id || null,
        parent_order_id: newRowData.parent_order_id || null,
        export_type: (newRowData.export_type || 'on_site') as 'on_site' | 'export',
        notes: newRowData.notes || null,
        pollutants: (newRowData.pollutants || []).map(p => ({
          pollutant_id: p.pollutant_id,
          concentration: typeof p.concentration === 'string' ? p.concentration : String(p.concentration),
          group_name: p.group_name || null,
        })),
        methods: (newRowData.methods || []).map(m => typeof m === 'string' ? m : m.method_id),
      });

      if (result.error) {
        // 3. 실패 시 롤백: optimistic 엔트리 제거, newRowData 복원
        setTableData((prev) => prev.filter((order) => order.id !== optimisticOrder.id));
        setNewRowData(backupNewRowData);

        toast({
          variant: 'destructive',
          title: '추가 실패',
          description: result.error,
        });
        return;
      }

      // 4. 성공 시: 서버 데이터로 교체 (router.refresh()가 자동 갱신)
      toast({
        title: '추가 완료',
        description: '새로운 수주가 추가되었습니다.',
      });

      router.refresh();
    } catch (error) {
      // 3. 에러 시 롤백
      setTableData((prev) => prev.filter((order) => order.id !== optimisticOrder.id));
      setNewRowData(backupNewRowData);

      toast({
        variant: 'destructive',
        title: '추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  };

  // 신규 행 취소
  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  // 오염물질 편집 다이얼로그 열기
  const handleEditPollutants = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForPollutant(order);
    setPollutantDialogOpen(true);
  }, []);

  // 정화방법 편집 다이얼로그 열기
  const handleEditMethods = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForMethod(order);
    setMethodDialogOpen(true);
  }, []);

  // 부모 계약 선택 다이얼로그 열기
  const handleOpenParentOrderDialog = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForParent(order);
    setParentOrderDialogOpen(true);
  }, []);

  // 첨부파일 관리 다이얼로그 열기
  const handleManageAttachments = React.useCallback((order: OrderWithDetails) => {
    setEditingOrderForAttachment(order);
    setAttachmentDialogOpen(true);
  }, []);

  // 첨부파일 변경 시 테이블 데이터 업데이트
  const handleAttachmentsChange = React.useCallback((orderId: string, attachments: AttachmentMetadata[]) => {
    // AttachmentMetadata를 string 배열로 변환 (path 필드만 추출)
    const attachmentPaths = attachments.map(a => a.path);
    setTableData((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, attachments: attachmentPaths } : order
      )
    );
  }, []);

  // 부모 계약 선택
  const handleSelectParentOrder = async (parentOrderId: string | null) => {
    if (!editingOrderForParent) return;

    // 새 행인 경우 (temp- prefix) - 로컬 상태만 업데이트
    if (editingOrderForParent.id?.startsWith('temp-')) {
      if (!newRowData) return;

      setNewRowData({
        ...newRowData,
        parent_order_id: parentOrderId,
      });

      toast({
        title: '부모 계약 설정',
        description: '부모 계약이 설정되었습니다. 저장 버튼을 눌러 수주를 완료하세요.',
      });

      setParentOrderDialogOpen(false);
      return;
    }

    // 기존 행인 경우 - DB에 즉시 저장
    try {
      const result = await updateOrder(editingOrderForParent.id, {
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
  };

  // 오염물질 저장
  const handleSavePollutants = async (orderId: string, pollutantsData: PollutantInput[]) => {
    // 새 행인 경우 (temp- prefix) - 로컬 상태만 업데이트
    if (orderId.startsWith('temp-')) {
      if (!newRowData) return;

      setNewRowData({
        ...newRowData,
        pollutants: pollutantsData.map(p => ({
          id: `temp-pollutant-${p.pollutant_id}`, // 임시 ID
          order_id: '', // 임시값 (저장 시 실제 order_id로 대체됨)
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

      setPollutantDialogOpen(false);
      return;
    }

    // 기존 행인 경우 - DB에 즉시 저장
    try {
      const result = await updateOrder(orderId, {
        pollutants: pollutantsData.map(p => ({
          pollutant_id: p.pollutant_id,
          concentration: p.concentration,
          group_name: p.group_name || null,
        })),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: '저장 완료',
        description: '오염물질 정보가 저장되었습니다.',
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
  };

  // 정화방법 저장
  const handleSaveMethods = async (orderId: string, methodIds: string[]) => {
    // 새 행인 경우 (temp- prefix) - 로컬 상태만 업데이트
    if (orderId.startsWith('temp-')) {
      if (!newRowData) return;

      setNewRowData({
        ...newRowData,
        methods: methodIds.map(methodId => ({
          id: `temp-method-${methodId}`, // 임시 ID
          order_id: '', // 임시값 (저장 시 실제 order_id로 대체됨)
          method_id: methodId,
          method: methods.find(m => m.id === methodId) || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      });

      toast({
        title: '정화방법 설정',
        description: '정화방법이 설정되었습니다. 저장 버튼을 눌러 수주를 완료하세요.',
      });

      setMethodDialogOpen(false);
      return;
    }

    // 기존 행인 경우 - DB에 즉시 저장
    try {
      const result = await updateOrder(orderId, {
        methods: methodIds,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: '저장 완료',
        description: '정화방법 정보가 저장되었습니다.',
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
  };

  // 선택된 행 삭제
  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedOrders = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedOrders.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택 오류',
        description: '삭제할 수주를 선택해주세요.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      // 각 수주 삭제 요청
      const results = await Promise.allSettled(selectedOrders.map((order) => deleteOrder(order.id)));

      // 실패한 요청 확인
      const failures = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
      );
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: '일부 삭제 실패',
          description: `${successes.length}건 삭제 성공, ${failures.length}건 실패`,
        });
      } else {
        toast({
          title: '삭제 완료',
          description: `${selectedOrders.length}건의 수주가 삭제되었습니다.`,
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

  // 컬럼 정의 - 통합 핸들러 사용
  const columns = React.useMemo(
    () =>
      createOrderColumns({
        customers,
        verificationCompanies,
        users,
        newOrders,
        handleUnifiedUpdate,
        onEditPollutants: handleEditPollutants,
        onEditMethods: handleEditMethods,
        onOpenParentOrderDialog: handleOpenParentOrderDialog,
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

  // 선택된 행 개수
  const selectedCount = Object.keys(rowSelection).length;

  // 모바일용 필터링된 데이터
  const filteredMobileData = React.useMemo(() => {
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

  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호' },
      { key: 'contract_name', header: '계약명' },
      {
        key: 'customer_id',
        header: '고객명',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일' },
      {
        key: 'contract_status',
        header: '상태',
        format: (value) => {
          const statusMap = {
            quotation: '견적',
            contract: '계약',
            in_progress: '진행',
            completed: '완료',
          };
          return statusMap[value as keyof typeof statusMap] || String(value);
        },
      },
      {
        key: 'contract_amount',
        header: '계약금액(원)',
        format: (value) => String(Number(value).toLocaleString()),
      },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호', width: '100px', align: 'center' },
      { key: 'contract_name', header: '계약명', width: '200px' },
      {
        key: 'customer_id',
        header: '고객명',
        width: '120px',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일', width: '100px', align: 'center' },
      {
        key: 'contract_status',
        header: '상태',
        width: '70px',
        align: 'center',
        format: (value) => {
          const statusMap = {
            quotation: '견적',
            contract: '계약',
            in_progress: '진행',
            completed: '완료',
          };
          const result = statusMap[value as keyof typeof statusMap] || String(value);
          return <>{result}</>;
        },
      },
      {
        key: 'contract_amount',
        header: '계약금액',
        width: '120px',
        align: 'right',
        format: (value) => <>{`${(Number(value) / 100000000).toFixed(2)}억원`}</>,
      },
    ],
    []
  );

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="contract_name"
          searchPlaceholder="계약명 검색..."
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
              onAdd={handleAddOrder}
              onSave={handleSaveNewRow}
              onCancel={handleCancelNewRow}
              onDelete={() => setDeleteDialogOpen(true)}
              exportButton={
                <ExportToExcel
                  data={tableData}
                  columns={exportColumns}
                  filename={`수주목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                  sheetName="수주"
                  buttonText="Excel 다운로드"
                />
              }
              printButton={
                <PrintTable
                  data={tableData}
                  columns={printColumns}
                  title="수주 목록"
                  subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                  buttonText="인쇄"
                />
              }
              addButtonText="수주 추가"
              deleteButtonText="삭제"
            />
          }
        />
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {/* 검색 입력 */}
        <input
          type="text"
          placeholder="계약명, 계약번호, 고객명 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />

        {/* 모바일 툴바 */}
        <div className="flex items-center gap-2 w-full">
          <CrudTableToolbar
            isMobile
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddOrder}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={
              <ExportToExcel
                data={tableData}
                columns={exportColumns}
                filename={`수주목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                sheetName="수주"
                buttonText="Excel 다운로드"
              />
            }
            printButton={
              <PrintTable
                data={tableData}
                columns={printColumns}
                title="수주 목록"
                subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                buttonText="인쇄"
              />
            }
            addButtonText="수주 추가"
          />
        </div>

        {/* 카드 리스트 */}
        {filteredMobileData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMobileData.map((order) => {
              const rowIndex = tableData.indexOf(order);
              const isSelected = rowSelection[rowIndex] === true;

              return (
                <MobileOrderCard
                  key={order.id}
                  order={order}
                  isSelected={isSelected}
                  onSelectChange={(checked) => {
                    setRowSelection((prev) => {
                      const newSelection = { ...prev };
                      if (checked) {
                        newSelection[rowIndex] = true;
                      } else {
                        delete newSelection[rowIndex];
                      }
                      return newSelection;
                    });
                  }}
                  onCardClick={() => handleEditPollutants(order)}
                />
              );
            })}
          </div>
        )}

        {/* 페이지네이션 정보 */}
        {filteredMobileData.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            총 {filteredMobileData.length}건
            {selectedCount > 0 && ` | ${selectedCount}건 선택됨`}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="수주 삭제"
        description={`선택한 ${selectedCount}건의 수주를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
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
        onSelect={handleSelectParentOrder}
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
