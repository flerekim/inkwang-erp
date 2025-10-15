'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createColumns } from './columns';
import { updateDepartment, deleteDepartment, createDepartment } from '@/actions/departments';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Department } from '@/types';

interface DepartmentsTableProps {
  data: Department[];
}

export function DepartmentsTable({ data: initialData }: DepartmentsTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tableData, setTableData] = React.useState<Department[]>(initialData);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [newRowData, setNewRowData] = React.useState<Partial<Department> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = React.useState(false);

  React.useEffect(() => {
    setTableData(initialData);
  }, [initialData]);

  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const department = tableData[rowIndex];
      if (!department) return;

      setTableData((old) =>
        old.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row))
      );

      try {
        const result = await updateDepartment(department.id, { [columnId]: value });
        if (result.error) {
          toast({ variant: 'destructive', title: '수정 실패', description: result.error });
          setTableData(initialData);
          throw new Error(result.error);
        }
        toast({ title: '수정 완료', description: '부서 정보가 수정되었습니다.' });
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, initialData, toast, router]
  );

  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedDepts = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedDepts.length === 0) {
      toast({ variant: 'destructive', title: '선택 오류', description: '삭제할 부서를 선택해주세요.' });
      return;
    }

    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(selectedDepts.map((dept) => deleteDepartment(dept.id)));
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({ variant: 'destructive', title: '일부 삭제 실패', description: `${successes.length}개 삭제 성공, ${failures.length}개 실패` });
      } else {
        toast({ title: '삭제 완료', description: `${selectedDepts.length}개의 부서가 삭제되었습니다.` });
      }
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: '삭제 실패', description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAddDepartment = () => {
    if (newRowData) {
      toast({ variant: 'destructive', title: '추가 중인 부서가 있습니다', description: '먼저 현재 부서를 저장하거나 취소해주세요.' });
      return;
    }
    setNewRowData({
      id: `temp-${Date.now()}`,
      name: '',
      sort_order: tableData.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    if (!newRowData) return;
    setNewRowData({ ...newRowData, [field]: value });
  }, [newRowData]);

  const handleSaveNewRow = async () => {
    if (!newRowData || !newRowData.name) {
      toast({ variant: 'destructive', title: '입력 오류', description: '부서명은 필수 입력 항목입니다.' });
      return;
    }

    setIsSavingNewRow(true);
    try {
      const result = await createDepartment({
        name: newRowData.name!,
        sort_order: newRowData.sort_order || tableData.length + 1,
      });

      if (result.error) {
        toast({ variant: 'destructive', title: '부서 추가 실패', description: result.error });
        return;
      }

      toast({ title: '부서 추가 완료', description: `${newRowData.name}이(가) 추가되었습니다.` });
      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: '부서 추가 실패', description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' });
    } finally {
      setIsSavingNewRow(false);
    }
  };

  const handleCancelNewRow = () => setNewRowData(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && newRowData) handleCancelNewRow();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newRowData]);

  const displayData = React.useMemo(() => (newRowData ? [newRowData as Department, ...tableData] : tableData), [newRowData, tableData]);
  const columns = React.useMemo(() => createColumns({ handleUpdateCell, handleUpdateNewRow }), [handleUpdateCell, handleUpdateNewRow]);
  const selectedCount = Object.keys(rowSelection).length;

  const exportColumns = React.useMemo<ExportColumn<Department>[]>(() => [
    { key: 'name', header: '부서명' },
    { key: 'sort_order', header: '정렬순서' },
  ], []);

  const printColumns = React.useMemo<PrintColumn<Department>[]>(() => [
    { key: 'name', header: '부서명', width: '250px' },
    { key: 'sort_order', header: '정렬순서', width: '100px', align: 'center' },
  ], []);

  return (
    <>
      <DataTable
        columns={columns}
        data={displayData}
        searchKey="name"
        searchPlaceholder="부서명 검색..."
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
            onAdd={handleAddDepartment}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={<ExportToExcel data={tableData} columns={exportColumns} filename={`부서목록_${new Date().toISOString().split('T')[0]}.xlsx`} sheetName="부서" buttonText="Excel 다운로드" />}
            printButton={<PrintTable data={tableData} columns={printColumns} title="부서 목록" subtitle={`총 ${tableData.length}개 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`} buttonText="인쇄" />}
            addButtonText="부서 추가"
            deleteButtonText="삭제"
          />
        }
      />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDeleteSelected} title="부서 삭제" description={`선택한 ${selectedCount}개의 부서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`} isDeleting={isDeleting} />
    </>
  );
}
