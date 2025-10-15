'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createColumns } from './columns';
import { updateBankAccount, deleteBankAccount, createBankAccount } from '@/actions/bank-accounts';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Company } from '@/types';

type BankAccountWithCompany = {
  id: string;
  bank_name: string;
  account_number: string;
  initial_balance: number;
  current_balance: number;
  company_id: string;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string };
};

interface BankAccountsTableProps {
  data: BankAccountWithCompany[];
  companies: Company[];
}

export function BankAccountsTable({ data: initialData, companies }: BankAccountsTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tableData, setTableData] = React.useState<BankAccountWithCompany[]>(initialData);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [newRowData, setNewRowData] = React.useState<Partial<BankAccountWithCompany> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = React.useState(false);

  React.useEffect(() => {
    setTableData(initialData);
  }, [initialData]);

  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string | number) => {
      const account = tableData[rowIndex];
      if (!account) return;

      setTableData((old) =>
        old.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row))
      );

      try {
        const result = await updateBankAccount(account.id, { [columnId]: value });
        if (result.error) {
          toast({ variant: 'destructive', title: '수정 실패', description: result.error });
          setTableData(initialData);
          throw new Error(result.error);
        }
        toast({ title: '수정 완료', description: '계좌 정보가 수정되었습니다.' });
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, initialData, toast, router]
  );

  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedAccounts = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedAccounts.length === 0) {
      toast({ variant: 'destructive', title: '선택 오류', description: '삭제할 계좌를 선택해주세요.' });
      return;
    }

    setIsDeleting(true);
    try {
      const results = await Promise.allSettled(selectedAccounts.map((acc) => deleteBankAccount(acc.id)));
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({ variant: 'destructive', title: '일부 삭제 실패', description: `${successes.length}개 삭제 성공, ${failures.length}개 실패` });
      } else {
        toast({ title: '삭제 완료', description: `${selectedAccounts.length}개의 계좌가 삭제되었습니다.` });
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

  const handleAddAccount = () => {
    if (newRowData) {
      toast({ variant: 'destructive', title: '추가 중인 계좌가 있습니다', description: '먼저 현재 계좌를 저장하거나 취소해주세요.' });
      return;
    }
    setNewRowData({
      id: `temp-${Date.now()}`,
      bank_name: '',
      account_number: '',
      initial_balance: 0,
      current_balance: 0,
      company_id: companies[0]?.id || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company: { id: companies[0]?.id || '', name: companies[0]?.name || '' },
    });
  };

  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    if (!newRowData) return;
    if (field === 'company_id') {
      const company = companies.find((c) => c.id === value);
      const companyId = value as string;
      setNewRowData({ ...newRowData, company_id: companyId, company: { id: companyId, name: company?.name || '' } });
    } else {
      setNewRowData({ ...newRowData, [field]: value });
    }
  }, [newRowData, companies]);

  const handleSaveNewRow = async () => {
    if (!newRowData || !newRowData.bank_name || !newRowData.account_number || !newRowData.company_id) {
      toast({ variant: 'destructive', title: '입력 오류', description: '은행명, 계좌번호, 회사는 필수 입력 항목입니다.' });
      return;
    }

    setIsSavingNewRow(true);
    try {
      const result = await createBankAccount({
        bank_name: newRowData.bank_name!,
        account_number: newRowData.account_number!,
        initial_balance: newRowData.initial_balance || 0,
        company_id: newRowData.company_id!,
      });

      if (result.error) {
        toast({ variant: 'destructive', title: '계좌 추가 실패', description: result.error });
        return;
      }

      toast({ title: '계좌 추가 완료', description: `${newRowData.bank_name} 계좌가 추가되었습니다.` });
      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: '계좌 추가 실패', description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다' });
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

  const displayData = React.useMemo(() => (newRowData ? [newRowData as BankAccountWithCompany, ...tableData] : tableData), [newRowData, tableData]);
  const columns = React.useMemo(() => createColumns({ companies, handleUpdateCell, handleUpdateNewRow }), [companies, handleUpdateCell, handleUpdateNewRow]);
  const selectedCount = Object.keys(rowSelection).length;

  const exportColumns = React.useMemo<ExportColumn<BankAccountWithCompany>[]>(() => [
    { key: 'bank_name', header: '은행명' },
    { key: 'account_number', header: '계좌번호' },
    { key: 'company_id', header: '회사', format: (_, row) => row.company?.name || '' },
    { key: 'initial_balance', header: '초기잔액' },
    { key: 'current_balance', header: '현재잔액' },
  ], []);

  const printColumns = React.useMemo<PrintColumn<BankAccountWithCompany>[]>(() => [
    { key: 'bank_name', header: '은행명', width: '120px' },
    { key: 'account_number', header: '계좌번호', width: '150px' },
    { key: 'company_id', header: '회사', width: '120px', format: (_, row) => row.company?.name || '' },
    { key: 'current_balance', header: '현재잔액', width: '150px', align: 'right', format: (value) => `₩${(value as number).toLocaleString()}` },
  ], []);

  return (
    <>
      <DataTable
        columns={columns}
        data={displayData}
        searchKey="bank_name"
        searchPlaceholder="은행명 검색..."
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
            onAdd={handleAddAccount}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={<ExportToExcel data={tableData} columns={exportColumns} filename={`계좌목록_${new Date().toISOString().split('T')[0]}.xlsx`} sheetName="계좌" buttonText="Excel 다운로드" />}
            printButton={<PrintTable data={tableData} columns={printColumns} title="은행계좌 목록" subtitle={`총 ${tableData.length}개 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`} buttonText="인쇄" />}
            addButtonText="계좌 추가"
            deleteButtonText="삭제"
          />
        }
      />
      <DeleteConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDeleteSelected} title="계좌 삭제" description={`선택한 ${selectedCount}개의 계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`} isDeleting={isDeleting} />
    </>
  );
}
