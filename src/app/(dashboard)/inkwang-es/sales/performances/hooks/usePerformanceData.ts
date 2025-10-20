import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getNewOrders } from '@/actions/performances';
import { getEmployees } from '@/actions/employees';
import { getCustomers } from '@/actions/customers';
import type { PerformanceWithDetails, NewOrderOption, User, Customer } from '@/types';

/**
 * usePerformanceData Hook
 *
 * 실적 테이블에 필요한 관련 데이터 로딩 및 모바일 UI 상태 관리
 *
 * @param initialData - 초기 실적 데이터 (displayData from useTableState)
 */
export function usePerformanceData(initialData: PerformanceWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [newOrders, setNewOrders] = useState<NewOrderOption[]>([]); // 신규계약 목록
  const [managers, setManagers] = useState<User[]>([]); // 인광이에스 소속 직원 (담당자)
  const [customers, setCustomers] = useState<Customer[]>([]); // 고객 목록

  // 모바일 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 모바일 편집 다이얼로그 상태
  const [editingPerformance, setEditingPerformance] = useState<PerformanceWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PerformanceWithDetails>>({});

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        // 신규계약 목록 로드
        const ordersResult = await getNewOrders();
        if (ordersResult.error) {
          throw new Error(ordersResult.error);
        }
        setNewOrders(ordersResult.data || []);

        // 인광이에스 소속 직원 로드
        const employeesResult = await getEmployees();
        if (employeesResult.error) {
          throw new Error(employeesResult.error);
        }

        // 인광이에스 소속 직원만 필터링
        const inkwangEmployees =
          employeesResult.data?.filter(
            (emp) => emp.company?.name === '인광이에스' && emp.employment_status === 'active'
          ) || [];
        setManagers(inkwangEmployees);

        // 고객 목록 로드
        const customersList = await getCustomers();
        setCustomers(customersList || []);
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

  // 모바일용 필터링된 데이터 (검색어 기반)
  const filteredMobileData = useMemo(() => {
    if (!searchQuery.trim()) {
      return initialData;
    }

    const query = searchQuery.toLowerCase();
    return initialData.filter((performance) => {
      return (
        performance.order?.order_number?.toLowerCase().includes(query) ||
        performance.order?.contract_name?.toLowerCase().includes(query) ||
        performance.order?.customer?.name?.toLowerCase().includes(query) ||
        performance.manager?.name?.toLowerCase().includes(query) ||
        performance.performance_type?.toLowerCase().includes(query) ||
        performance.unit?.toLowerCase().includes(query) ||
        performance.notes?.toLowerCase().includes(query)
      );
    });
  }, [initialData, searchQuery]);

  return {
    // 관계형 데이터
    newOrders,
    managers,
    customers,

    // 모바일 검색
    searchQuery,
    setSearchQuery,

    // 모바일 편집 다이얼로그
    editingPerformance,
    setEditingPerformance,
    editFormData,
    setEditFormData,

    // 필터링된 데이터
    filteredMobileData,
  };
}
