'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createCompanyColumns } from './company-columns';
import {
  updateCompany,
  deleteCompany,
  createCompany,
} from '@/actions/companies';
import { useToast } from '@/hooks/use-toast';
import { useTableState } from '@/hooks/use-table-state';
import { useTableActions } from '@/hooks/use-table-actions';
import type { Company } from '@/types';

interface CompaniesTableProps {
  data: Company[];
}

export function CompaniesTable({ data }: CompaniesTableProps) {
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
  } = useTableState<Company>(data);

  // createAction 래퍼: Partial<Company>를 Omit<Company, 'id' | ...>로 변환
  const createCompanyWrapper = React.useCallback(
    async (data: Partial<Company>) => {
      if (!data.name) {
        return { error: '회사명은 필수 입력 항목입니다.' };
      }
      return await createCompany({
        name: data.name,
        business_number: data.business_number || null,
        sort_order: data.sort_order || 0,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const { handleUpdateCell, handleDeleteSelected: deleteSelectedAction, handleSaveNewRow: saveNewRowAction } = useTableActions<
    Company,
    Omit<Company, 'id' | 'created_at' | 'updated_at'>
  >({
    tableData,
    setTableData,
    originalData: data,
    updateAction: updateCompany,
    deleteAction: deleteCompany,
    createAction: createCompanyWrapper,
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

  // 회사 추가 (인라인 방식)
  const handleAddCompany = () => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 회사가 있습니다',
        description: '먼저 현재 회사를 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<Company> = {
      id: tempId,
      name: '',
      business_number: null,
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

  // 새 행 저장 (useTableActions 훅 활용 + company-specific 로직)
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRowData) return;

    // Company-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.name) {
        return { error: '회사명은 필수 입력 항목입니다.' };
      }
      return true;
    };

    // useTableActions의 saveNewRowAction 호출
    const preparedData = {
      name: newRowData.name!,
      business_number: newRowData.business_number || null,
      sort_order: newRowData.sort_order || (tableData.length + 1) * 10,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      // 성공 시 회사명 포함 메시지로 덮어쓰기
      toast({
        title: '회사 추가 완료',
        description: `${newRowData.name}이(가) 추가되었습니다.`,
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData, tableData.length]);

  // 새 행 취소
  const handleCancelNewRow = React.useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // ESC 키로 신규 회사 추가 취소
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
  }, [newRowData, handleCancelNewRow]);

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createCompanyColumns({
        handleUpdateCell,
        handleUpdateNewRow,
      }),
    [handleUpdateCell, handleUpdateNewRow]
  );

  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<Company>[]>(
    () => [
      { key: 'name', header: '회사명' },
      {
        key: 'business_number',
        header: '사업자번호',
        format: (value) => typeof value === 'string' && value ? value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '',
      },
      { key: 'sort_order', header: '정렬순서' },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<Company>[]>(
    () => [
      { key: 'name', header: '회사명', width: '200px' },
      {
        key: 'business_number',
        header: '사업자번호',
        width: '150px',
        align: 'center',
        format: (value) => <>{typeof value === 'string' && value ? value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : ''}</>,
      },
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
        searchPlaceholder="회사명 검색..."
        pageSize={10}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableFuzzyFilter={true}
        enableColumnResizing={true}
        columnResizeMode="onChange"
        enableColumnPinning={true}
        enableColumnVisibility={true}
        enablePageSizeSelection={true}
        enablePageJump={true}
        toolbar={
          <CrudTableToolbar
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddCompany}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={
              <ExportToExcel
                data={tableData}
                columns={exportColumns}
                filename={`회사목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                sheetName="회사"
                buttonText="Excel 다운로드"
              />
            }
            printButton={
              <PrintTable
                data={tableData}
                columns={printColumns}
                title="회사 목록"
                subtitle={`총 ${tableData.length}개 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                buttonText="인쇄"
              />
            }
            addButtonText="회사 추가"
            deleteButtonText="삭제"
          />
        }
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="회사 삭제"
        description={`선택한 ${selectedCount}개의 회사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
