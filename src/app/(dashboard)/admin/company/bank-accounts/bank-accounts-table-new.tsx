'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
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
import type { BankAccount, Company } from '@/types';

// 회사 정보가 포함된 은행계좌 타입
type BankAccountWithCompany = BankAccount & {
  company: Pick<Company, 'id' | 'name'> | null;
};

interface BankAccountsTableNewProps {
  data: BankAccountWithCompany[];
  companies: Pick<Company, 'id' | 'name'>[];
}

export function BankAccountsTableNew({ data, companies }: BankAccountsTableNewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tableData, setTableData] = React.useState<BankAccountWithCompany[]>(data);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // 새 행 관리
  const [newRowData, setNewRowData] = React.useState<Partial<BankAccountWithCompany> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = React.useState(false);

  // 데이터가 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  // 셀 업데이트 핸들러
  const handleUpdateCell = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const bankAccount = tableData[rowIndex];
      if (!bankAccount) return;

      // 낙관적 업데이트
      setTableData((old) =>
        old.map((row, index) => {
          if (index === rowIndex) {
            // 금액 필드는 숫자로 변환
            if (columnId === 'initial_balance') {
              const numValue = parseFloat(value.replace(/,/g, '')) || 0;
              return {
                ...row,
                [columnId]: numValue,
              };
            }
            // company_id 업데이트 시 company 객체도 업데이트
            if (columnId === 'company_id') {
              const selectedCompany = companies.find((c) => c.id === value);
              return {
                ...row,
                company_id: value,
                company: selectedCompany || null,
              };
            }
            return {
              ...row,
              [columnId]: value,
            };
          }
          return row;
        })
      );

      // 서버 업데이트
      try {
        let updateData: Record<string, string | number>;

        if (columnId === 'initial_balance') {
          const numValue = parseFloat(value.replace(/,/g, '')) || 0;
          updateData = { [columnId]: numValue };
        } else {
          updateData = { [columnId]: value };
        }

        const result = await updateBankAccount(bankAccount.id, updateData);

        if (result.error) {
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          // 에러 발생 시 원래 값으로 되돌림
          setTableData(data);
          throw new Error(result.error);
        }

        toast({
          title: '수정 완료',
          description: '정보가 성공적으로 수정되었습니다.',
        });

        // 서버 데이터 새로고침
        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, data, companies, toast, router]
  );

  // 선택된 행 삭제
  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedBankAccounts = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedBankAccounts.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택 오류',
        description: '삭제할 은행계좌를 선택해주세요.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      // 각 은행계좌 삭제 요청
      const results = await Promise.allSettled(
        selectedBankAccounts.map((bankAccount) => deleteBankAccount(bankAccount.id))
      );

      // 실패한 요청 확인
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: '일부 삭제 실패',
          description: `${successes.length}개 삭제 성공, ${failures.length}개 실패`,
        });
      } else {
        toast({
          title: '삭제 완료',
          description: `${selectedBankAccounts.length}개의 은행계좌가 삭제되었습니다.`,
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
  }, [newRowData]);

  // 새 행 저장
  const handleSaveNewRow = async () => {
    if (!newRowData) return;

    // 필수 필드 검증
    if (!newRowData.company_id) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '회사는 필수 선택 항목입니다.',
      });
      return;
    }

    if (!newRowData.bank_name) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '은행명은 필수 입력 항목입니다.',
      });
      return;
    }

    if (!newRowData.account_number) {
      toast({
        variant: 'destructive',
        title: '입력 오류',
        description: '계좌번호는 필수 입력 항목입니다.',
      });
      return;
    }

    setIsSavingNewRow(true);

    try {
      // createBankAccount API 호출
      const result = await createBankAccount({
        company_id: newRowData.company_id!,
        bank_name: newRowData.bank_name!,
        account_number: newRowData.account_number!,
        initial_balance: newRowData.initial_balance || 0,
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '은행계좌 추가 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: '은행계좌 추가 완료',
        description: `${newRowData.bank_name} 계좌가 추가되었습니다.`,
      });

      // 새 행 초기화 및 새로고침
      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '은행계좌 추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  };

  // 새 행 취소
  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  // ESC 키로 신규 은행계좌 추가 취소
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && newRowData) {
        handleCancelNewRow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newRowData]);

  // 새 행이 있을 경우 테이블 데이터에 포함
  const displayData = React.useMemo(() => {
    if (newRowData) {
      return [newRowData as BankAccountWithCompany, ...tableData];
    }
    return tableData;
  }, [newRowData, tableData]);

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

  // 선택된 행 개수
  const selectedCount = Object.keys(rowSelection).length;

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
