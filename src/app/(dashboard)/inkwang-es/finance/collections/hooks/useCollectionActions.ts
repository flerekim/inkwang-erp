import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createCollection, updateCollection } from '@/actions/collections';
import type { CollectionWithDetails, CollectionFormData, BillingCollectionStatus, BankAccount } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useCollectionActions Hook
 *
 * 수금 테이블의 CRUD 작업 관리
 */
export function useCollectionActions(
  tableState: UseTableStateReturn<CollectionWithDetails>,
  billingStatuses: BillingCollectionStatus[],
  bankAccounts: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[]
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    newRowData,
    setNewRowData,
    setIsSavingNewRow,
  } = tableState;

  // 수금 추가 (인라인 방식)
  const handleAddCollection = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 수금이 있습니다',
        description: '현재 추가 중인 수금을 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const defaultBillingId = billingStatuses[0]?.billing_id || '';
    const defaultBilling = billingStatuses[0];

    const newRow: Partial<CollectionWithDetails> = {
      id: tempId,
      billing_id: defaultBillingId,
      collection_date: new Date().toISOString().split('T')[0],
      collection_amount: 0,
      collection_method: 'bank_transfer',
      bank_account_id: null,
      bank_name: null,
      account_number: null,
      depositor: defaultBilling?.contract_name || '',
      notes: null,
    };

    setNewRowData(newRow);
  }, [newRowData, billingStatuses, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;

      // billing_id 변경 시 입금자 자동 설정
      if (field === 'billing_id') {
        const selectedBilling = billingStatuses.find(b => b.billing_id === value);
        if (selectedBilling) {
          setNewRowData({
            ...newRowData,
            billing_id: value as string,
            depositor: selectedBilling.contract_name,
          });
          return;
        }
      }

      // bank_account_id 변경 시 은행명, 계좌번호 자동 설정
      if (field === 'bank_account_id') {
        const selectedBankAccount = bankAccounts.find(ba => ba.id === value);
        if (selectedBankAccount) {
          setNewRowData({
            ...newRowData,
            bank_account_id: value as string,
            bank_name: selectedBankAccount.bank_name,
            account_number: selectedBankAccount.account_number,
          });
          return;
        }
      }

      // collection_method 변경 시 은행 정보 초기화
      if (field === 'collection_method') {
        if (value === 'other') {
          setNewRowData({
            ...newRowData,
            collection_method: value as 'bank_transfer' | 'other',
            bank_account_id: null,
            bank_name: null,
            account_number: null,
          });
          return;
        }
      }

      // 타입 변환 처리
      let processedValue = value;
      if (field === 'collection_amount') {
        processedValue = typeof value === 'string' ? Number(value) || 0 : value;
      }

      setNewRowData({ ...newRowData, [field]: processedValue });
    },
    [newRowData, billingStatuses, bankAccounts, setNewRowData]
  );

  // 새 행 저장
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    if (!newRowData.billing_id) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '청구를 선택해주세요.',
      });
      return;
    }

    if (!newRowData.collection_amount || newRowData.collection_amount <= 0) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '수금액을 입력해주세요. (0보다 커야 합니다)',
      });
      return;
    }

    if (newRowData.collection_method === 'bank_transfer' && !newRowData.bank_account_id) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: '계좌이체 시 은행계좌를 선택해주세요.',
      });
      return;
    }

    const formData: CollectionFormData = {
      billing_id: newRowData.billing_id,
      collection_date: newRowData.collection_date || new Date().toISOString().split('T')[0],
      collection_amount: newRowData.collection_amount || 0,
      collection_method: (newRowData.collection_method || 'bank_transfer') as 'bank_transfer' | 'other',
      bank_account_id: newRowData.bank_account_id || null,
      bank_name: newRowData.bank_name || null,
      account_number: newRowData.account_number || null,
      depositor: newRowData.depositor || '',
      notes: newRowData.notes || null,
    };

    setIsSavingNewRow(true);

    try {
      const result = await createCollection(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: '추가 완료',
        description: '새로운 수금이 추가되었습니다.',
      });

      setNewRowData(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSavingNewRow(false);
    }
  }, [newRowData, toast, setNewRowData, setIsSavingNewRow, router]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 셀 업데이트
  const handleUpdateCell = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const collection = tableData[rowIndex];
      if (!collection || collection.id?.startsWith('temp-')) return;

      try {
        // bank_account_id 변경 시 은행명, 계좌번호 자동 설정
        if (columnId === 'bank_account_id') {
          const selectedBankAccount = bankAccounts.find(ba => ba.id === value);
          if (selectedBankAccount) {
            const result = await updateCollection(collection.id, {
              bank_account_id: value,
              bank_name: selectedBankAccount.bank_name,
              account_number: selectedBankAccount.account_number,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            toast({
              title: '저장 완료',
              description: '수금 정보가 업데이트되었습니다.',
            });

            router.refresh();
            return;
          }
        }

        // collection_method 변경 시 은행 정보 초기화
        if (columnId === 'collection_method') {
          if (value === 'other') {
            const result = await updateCollection(collection.id, {
              collection_method: value as 'bank_transfer' | 'other',
              bank_account_id: null,
              bank_name: null,
              account_number: null,
            });

            if (result.error) {
              throw new Error(result.error);
            }

            toast({
              title: '저장 완료',
              description: '수금 정보가 업데이트되었습니다.',
            });

            router.refresh();
            return;
          }
        }

        // 일반 필드 업데이트
        const updateData: Partial<CollectionFormData> = {
          [columnId]: value,
        };

        const result = await updateCollection(collection.id, updateData);

        if (result.error) {
          throw new Error(result.error);
        }

        toast({
          title: '저장 완료',
          description: '수금 정보가 업데이트되었습니다.',
        });

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    },
    [tableData, bankAccounts, toast, router]
  );

  return {
    handleUpdateCell,
    handleAddCollection,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  };
}
