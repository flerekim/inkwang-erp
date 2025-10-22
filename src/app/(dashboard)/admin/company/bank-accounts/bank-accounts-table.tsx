'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createBankAccountColumns } from './bank-account-columns';
import {
  updateBankAccount,
  deleteBankAccount,
  createBankAccount,
} from '@/actions/bank-accounts';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useTableState } from '@/hooks/use-table-state';
import { useTableActions } from '@/hooks/use-table-actions';
import type { BankAccount, Company } from '@/types';

// 회사 정보가 포함된 은행계좌 타입
type BankAccountWithCompany = BankAccount & {
  company: Pick<Company, 'id' | 'name'> | null;
};

interface BankAccountsTableProps {
  data: BankAccountWithCompany[];
  companies: Pick<Company, 'id' | 'name'>[];
}

export function BankAccountsTable({ data, companies }: BankAccountsTableProps) {
  const { toast } = useToast();
  const router = useRouter();

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
  } = useTableState<BankAccountWithCompany>(data);

  // createAction 래퍼: Partial<BankAccountWithCompany>를 createBankAccount의 올바른 타입으로 변환
  const createBankAccountWrapper = React.useCallback(
    async (data: Partial<BankAccountWithCompany>) => {
      if (!data.company_id) {
        return { error: '회사는 필수 선택 항목입니다.' };
      }
      if (!data.bank_name) {
        return { error: '은행명은 필수 입력 항목입니다.' };
      }
      if (!data.account_number) {
        return { error: '계좌번호는 필수 입력 항목입니다.' };
      }
      return await createBankAccount({
        company_id: data.company_id,
        bank_name: data.bank_name,
        account_number: data.account_number,
        initial_balance: data.initial_balance || 0,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const { handleUpdateCell: updateCellAction, handleDeleteSelected: deleteSelectedAction, handleSaveNewRow: saveNewRowAction } = useTableActions<
    BankAccountWithCompany,
    Omit<BankAccount, 'id' | 'current_balance' | 'created_at' | 'updated_at'>
  >({
    tableData,
    setTableData,
    originalData: data,
    updateAction: updateBankAccount,
    deleteAction: deleteBankAccount,
    createAction: createBankAccountWrapper,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // BankAccount-specific 셀 업데이트 래퍼 (initial_balance 타입 변환 + company_id 처리)
  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      // initial_balance는 number로 변환하고, 낙관적 업데이트에도 반영
      if (columnId === 'initial_balance') {
        const numValue = parseFloat(value.replace(/,/g, '')) || 0;
        const row = tableData[rowIndex];
        if (!row) return;

        // 낙관적 업데이트 (number로 변환)
        setTableData((old) =>
          old.map((r, idx) => (idx === rowIndex ? { ...r, initial_balance: numValue } : r))
        );

        // 서버 업데이트
        try {
          const result = await updateBankAccount(row.id, { initial_balance: numValue });

          if (result.error) {
            setTableData(data); // 롤백
            toast({
              variant: 'destructive',
              title: '수정 실패',
              description: result.error,
            });
            throw new Error(result.error);
          }

          toast({
            title: '수정 완료',
            description: '정보가 성공적으로 수정되었습니다.',
          });

          router.refresh();
        } catch (error) {
          throw error;
        }
      } else if (columnId === 'company_id') {
        // company_id 업데이트 시 company 객체도 함께 업데이트
        const row = tableData[rowIndex];
        if (!row) return;

        const selectedCompany = companies.find((c) => c.id === value);

        // 낙관적 업데이트 (company 객체도 함께)
        setTableData((old) =>
          old.map((r, idx) =>
            idx === rowIndex
              ? { ...r, company_id: value, company: selectedCompany || null }
              : r
          )
        );

        // 서버 업데이트
        try {
          const result = await updateBankAccount(row.id, { company_id: value });

          if (result.error) {
            setTableData(data); // 롤백
            toast({
              variant: 'destructive',
              title: '수정 실패',
              description: result.error,
            });
            throw new Error(result.error);
          }

          toast({
            title: '수정 완료',
            description: '정보가 성공적으로 수정되었습니다.',
          });

          router.refresh();
        } catch (error) {
          throw error;
        }
      } else {
        // 일반 필드는 Hook의 기본 로직 사용
        await updateCellAction(rowIndex, columnId, value);
      }
    },
    // updateBankAccount는 imported Server Action이므로 의존성 배열에 포함 불필요
    // setTableData는 React의 setState 함수이므로 의존성 배열에 포함 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableData, data, companies, updateCellAction, toast, router]
  );

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 은행계좌 추가 (인라인 방식)
  const handleAddBankAccount = () => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 은행계좌가 있습니다',
        description: '먼저 현재 은행계좌를 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<BankAccountWithCompany> = {
      id: tempId,
      company_id: companies[0]?.id || '',
      company: companies[0] || null,
      bank_name: '',
      account_number: '',
      initial_balance: 0,
      current_balance: 0,
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

  // 새 행 저장 (useTableActions 훅 활용 + bank-account-specific 로직)
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRowData) return;

    // BankAccount-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.company_id) {
        return { error: '회사는 필수 선택 항목입니다.' };
      }
      if (!data.bank_name) {
        return { error: '은행명은 필수 입력 항목입니다.' };
      }
      if (!data.account_number) {
        return { error: '계좌번호는 필수 입력 항목입니다.' };
      }
      return true;
    };

    // useTableActions의 saveNewRowAction 호출
    const preparedData = {
      company_id: newRowData.company_id!,
      bank_name: newRowData.bank_name!,
      account_number: newRowData.account_number!,
      initial_balance: newRowData.initial_balance || 0,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      // 성공 시 은행명 포함 메시지로 덮어쓰기
      toast({
        title: '은행계좌 추가 완료',
        description: `${newRowData.bank_name} 계좌가 추가되었습니다.`,
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData]);

  // 새 행 취소
  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  // ESC 키로 신규 은행계좌 추가 취소
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
    // handleCancelNewRow는 단순 setState 호출이므로 의존성 배열에 포함 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newRowData]);

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createBankAccountColumns({
        companies,
        handleUpdateCell,
        handleUpdateNewRow,
      }),
    [companies, handleUpdateCell, handleUpdateNewRow]
  );

  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<BankAccountWithCompany>[]>(
    () => [
      {
        key: 'company',
        header: '회사',
        format: (_, row) => row.company?.name || '',
      },
      { key: 'bank_name', header: '은행명' },
      { key: 'account_number', header: '계좌번호' },
      { key: 'initial_balance', header: '초기잔액' },
      { key: 'current_balance', header: '현재잔액' },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<BankAccountWithCompany>[]>(
    () => [
      {
        key: 'company',
        header: '회사',
        width: '150px',
        format: (_, row) => <>{row.company?.name || ''}</>,
      },
      { key: 'bank_name', header: '은행명', width: '120px' },
      { key: 'account_number', header: '계좌번호', width: '150px', align: 'center' },
      {
        key: 'initial_balance',
        header: '초기잔액',
        width: '120px',
        align: 'right',
        format: (value) => <>{typeof value === 'number' ? value.toLocaleString() : '0'}</>,
      },
      {
        key: 'current_balance',
        header: '현재잔액',
        width: '120px',
        align: 'right',
        format: (value) => <>{typeof value === 'number' ? value.toLocaleString() : '0'}</>,
      },
    ],
    []
  );

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
            onAdd={handleAddBankAccount}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={
              <ExportToExcel
                data={tableData}
                columns={exportColumns}
                filename={`은행계좌목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                sheetName="은행계좌"
                buttonText="Excel 다운로드"
              />
            }
            printButton={
              <PrintTable
                data={tableData}
                columns={printColumns}
                title="은행계좌 목록"
                subtitle={`총 ${tableData.length}개 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                buttonText="인쇄"
              />
            }
            addButtonText="은행계좌 추가"
            deleteButtonText="삭제"
          />
        }
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="은행계좌 삭제"
        description={`선택한 ${selectedCount}개의 은행계좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />
    </>
  );
}
