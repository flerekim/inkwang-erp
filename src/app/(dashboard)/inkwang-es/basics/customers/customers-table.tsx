'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createColumns } from './columns';
import { updateCustomer, deleteCustomer, createCustomer } from '@/actions/customers';
import { useToast } from '@/hooks/use-toast';
import { useTableState } from '@/hooks/use-table-state';
import { useTableActions } from '@/hooks/use-table-actions';
import { formatBusinessNumber } from '@/lib/utils';
import type { Customer } from '@/types';

interface CustomersTableProps {
  data: Customer[];
}

export function CustomersTable({ data: initialData }: CustomersTableProps) {
  const { toast } = useToast();

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
  } = useTableState<Customer>(initialData);

  // createAction 래퍼: Partial<Customer>를 Omit<Customer, ...>로 변환
  const createCustomerWrapper = React.useCallback(
    async (data: Partial<Customer>) => {
      if (!data.name) {
        return { error: '고객명은 필수 입력 항목입니다.' };
      }
      return await createCustomer({
        name: data.name,
        customer_type: data.customer_type || '발주처',
        status: data.status || '거래중',
        business_number: data.business_number || null,
        representative_name: data.representative_name || null,
        phone: data.phone || null,
        email: data.email || null,
        manager_name: data.manager_name || null,
        notes: data.notes || null,
        sort_order: data.sort_order || 0,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const { handleUpdateCell, handleDeleteSelected: deleteSelectedAction, handleSaveNewRow: saveNewRowAction } = useTableActions<
    Customer,
    Omit<Customer, 'id' | 'created_at' | 'updated_at'>
  >({
    tableData,
    setTableData,
    originalData: initialData,
    updateAction: updateCustomer,
    deleteAction: deleteCustomer,
    createAction: createCustomerWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  const handleAddCustomer = () => {
    if (newRowData) {
      toast({ variant: 'destructive', title: '추가 중인 고객이 있습니다', description: '먼저 현재 고객을 저장하거나 취소해주세요.' });
      return;
    }
    setNewRowData({
      id: `temp-${Date.now()}`,
      name: '',
      customer_type: '발주처',
      status: '거래중',
      business_number: '',
      representative_name: '',
      phone: '',
      email: '',
      manager_name: '',
      notes: '',
      sort_order: tableData.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    if (!newRowData) return;
    setNewRowData({ ...newRowData, [field]: value });
  }, [newRowData, setNewRowData]);

  // 새 행 저장 (useTableActions 훅 활용 + customer-specific 로직)
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRowData) return;

    // Customer-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.name) {
        return { error: '고객명은 필수 입력 항목입니다.' };
      }
      return true;
    };

    // useTableActions의 saveNewRowAction 호출
    const preparedData = {
      name: newRowData.name!,
      customer_type: newRowData.customer_type || '발주처',
      status: newRowData.status || '거래중',
      business_number: newRowData.business_number || '',
      representative_name: newRowData.representative_name || '',
      phone: newRowData.phone || '',
      email: newRowData.email || '',
      manager_name: newRowData.manager_name || '',
      notes: newRowData.notes || '',
      sort_order: newRowData.sort_order || tableData.length + 1,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      // 성공 시 고객명 포함 메시지로 덮어쓰기
      toast({
        title: '고객 추가 완료',
        description: `${newRowData.name} 고객이 추가되었습니다.`,
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData, tableData.length]);

  const handleCancelNewRow = React.useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // ESC 키로 신규 고객 추가 취소
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && newRowData) handleCancelNewRow();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newRowData, handleCancelNewRow]);

  // 컬럼 정의
  const columns = React.useMemo(() => createColumns({ handleUpdateCell, handleUpdateNewRow }), [handleUpdateCell, handleUpdateNewRow]);

  const exportColumns = React.useMemo<ExportColumn<Customer>[]>(() => [
    { key: 'name', header: '고객명' },
    { key: 'customer_type', header: '고객구분' },
    { key: 'status', header: '거래상태' },
    { key: 'business_number', header: '사업자등록번호', format: (value) => formatBusinessNumber(value as string) },
    { key: 'representative_name', header: '대표자명' },
    { key: 'phone', header: '대표전화' },
    { key: 'email', header: '이메일' },
    { key: 'manager_name', header: '업체담당자' },
    { key: 'notes', header: '비고' },
  ], []);

  const printColumns = React.useMemo<PrintColumn<Customer>[]>(() => [
    { key: 'name', header: '고객명', width: '120px' },
    { key: 'customer_type', header: '고객구분', width: '100px' },
    { key: 'status', header: '거래상태', width: '80px' },
    { key: 'business_number', header: '사업자등록번호', width: '130px', format: (value) => formatBusinessNumber(value as string) },
    { key: 'representative_name', header: '대표자명', width: '100px' },
    { key: 'phone', header: '대표전화', width: '120px' },
  ], []);

  return (
    <>
      <DataTable
        columns={columns}
        data={displayData}
        searchKey="name"
        searchPlaceholder="고객명 검색..."
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
            onAdd={handleAddCustomer}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={<ExportToExcel data={tableData} columns={exportColumns} filename={`고객목록_${new Date().toISOString().split('T')[0]}.xlsx`} sheetName="고객" buttonText="Excel 다운로드" />}
            printButton={<PrintTable data={tableData} columns={printColumns} title="고객 목록" subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`} buttonText="인쇄" />}
            addButtonText="고객 추가"
            deleteButtonText="삭제"
          />
        }
      />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDeleteSelected} title="고객 삭제" description={`선택한 ${selectedCount}개의 고객을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`} isDeleting={isDeleting} />
    </>
  );
}
