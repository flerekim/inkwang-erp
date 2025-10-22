import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getNewOrdersForBilling } from '@/actions/billings';
import type { BillingWithDetails, BillingOrderOption, Customer } from '@/types';

/**
 * useBillingData Hook
 *
 * 청구 테이블에 필요한 관련 데이터 로딩 및 상태 관리
 *
 * @param displayData - 초기 청구 데이터 (displayData from useTableState)
 */
export function useBillingData(displayData: BillingWithDetails[]) {
  const { toast } = useToast();

  // 신규 수주 목록 상태 (contract_type = 'new'인 수주만)
  const [newOrders, setNewOrders] = useState<BillingOrderOption[]>([]);

  // 모바일 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 신규 수주 목록 로드 (마운트 시 1회)
  useEffect(() => {
    const loadNewOrders = async () => {
      try {
        const result = await getNewOrdersForBilling();

        if (result.error) {
          toast({
            variant: 'destructive',
            title: '신규 수주 목록 로드 실패',
            description: result.error,
          });
          return;
        }

        setNewOrders(result.data || []);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    };

    loadNewOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  // 모바일용 필터링된 데이터 (검색어 기반)
  const filteredMobileData = useMemo(() => {
    if (!searchQuery.trim()) {
      return displayData;
    }

    const query = searchQuery.toLowerCase();
    return displayData.filter((billing) => {
      return (
        billing.billing_number?.toLowerCase().includes(query) ||
        billing.order?.contract_name?.toLowerCase().includes(query) ||
        billing.customer?.name?.toLowerCase().includes(query) ||
        billing.billing_type?.toLowerCase().includes(query) ||
        billing.invoice_status?.toLowerCase().includes(query)
      );
    });
  }, [displayData, searchQuery]);

  // 고객 목록 추출 (중복 제거)
  const customers = useMemo(() => {
    const customerMap = new Map<string, Customer>();

    displayData.forEach((billing) => {
      if (billing.customer) {
        customerMap.set(billing.customer.id, billing.customer as Customer);
      }
    });

    return Array.from(customerMap.values());
  }, [displayData]);

  return {
    newOrders,
    customers,
    searchQuery,
    setSearchQuery,
    filteredMobileData,
  };
}
