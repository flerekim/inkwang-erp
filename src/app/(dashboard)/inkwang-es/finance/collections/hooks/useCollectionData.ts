import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getBillingsForCollection, getBankAccountsForCollection } from '@/actions/collections';
import type { CollectionWithDetails, BillingCollectionStatus, BankAccount } from '@/types';

/**
 * useCollectionData Hook
 *
 * 수금 테이블에 필요한 관련 데이터 로딩
 */
export function useCollectionData(displayData: CollectionWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [billingStatuses, setBillingStatuses] = useState<BillingCollectionStatus[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[]>([]);

  // 관계형 데이터 로드 (displayData 변경 시 청구 상태 갱신)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [billingsData, bankAccountsData] = await Promise.all([
          getBillingsForCollection(),
          getBankAccountsForCollection(),
        ]);
        setBillingStatuses(billingsData);
        setBankAccounts(bankAccountsData);
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
  }, [displayData]); // displayData가 변경될 때마다 청구 상태 갱신

  return {
    billingStatuses,
    bankAccounts,
  };
}
