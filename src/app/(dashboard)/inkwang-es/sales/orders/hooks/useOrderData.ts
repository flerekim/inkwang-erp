import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getCustomers,
  getVerificationCompanies,
  getUsers,
  getNewOrders,
  getPollutants,
  getMethods,
} from '@/actions/orders';
import type { OrderWithDetails, Customer, UserSelectOption, Pollutant, Method } from '@/types';

/**
 * useOrderData Hook
 *
 * 수주 테이블에 필요한 관련 데이터 로딩 및 다이얼로그 상태 관리
 *
 * @param displayData - 초기 수주 데이터 (displayData from useTableState)
 */
export function useOrderData(displayData: OrderWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [verificationCompanies, setVerificationCompanies] = useState<Customer[]>([]);
  const [users, setUsers] = useState<UserSelectOption[]>([]);
  const [newOrders, setNewOrders] = useState<Array<{ id: string; order_number: string; contract_name: string }>>([]);
  const [pollutants, setPollutants] = useState<Pollutant[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);

  // 모바일 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 다이얼로그 상태
  const [pollutantDialogOpen, setPollutantDialogOpen] = useState(false);
  const [editingOrderForPollutant, setEditingOrderForPollutant] = useState<OrderWithDetails | null>(null);

  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [editingOrderForMethod, setEditingOrderForMethod] = useState<OrderWithDetails | null>(null);

  const [parentOrderDialogOpen, setParentOrderDialogOpen] = useState(false);
  const [editingOrderForParent, setEditingOrderForParent] = useState<OrderWithDetails | null>(null);

  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [editingOrderForAttachment, setEditingOrderForAttachment] = useState<OrderWithDetails | null>(null);

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [customersData, verificationData, usersData, newOrdersData, pollutantsData, methodsData] = await Promise.all([
          getCustomers(),
          getVerificationCompanies(),
          getUsers(),
          getNewOrders(),
          getPollutants(),
          getMethods(),
        ]);
        setCustomers(customersData);
        setVerificationCompanies(verificationData);
        setUsers(usersData);
        setNewOrders(newOrdersData);
        setPollutants(pollutantsData);
        setMethods(methodsData);
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
      return displayData;
    }

    const query = searchQuery.toLowerCase();
    return displayData.filter((order) => {
      return (
        order.order_number?.toLowerCase().includes(query) ||
        order.contract_name?.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.manager?.name?.toLowerCase().includes(query) ||
        order.contract_status?.toLowerCase().includes(query)
      );
    });
  }, [displayData, searchQuery]);

  return {
    // 관계형 데이터
    customers,
    verificationCompanies,
    users,
    newOrders,
    pollutants,
    methods,

    // 모바일 검색
    searchQuery,
    setSearchQuery,

    // 오염물질 다이얼로그
    pollutantDialogOpen,
    setPollutantDialogOpen,
    editingOrderForPollutant,
    setEditingOrderForPollutant,

    // 정화방법 다이얼로그
    methodDialogOpen,
    setMethodDialogOpen,
    editingOrderForMethod,
    setEditingOrderForMethod,

    // 부모 계약 선택 다이얼로그
    parentOrderDialogOpen,
    setParentOrderDialogOpen,
    editingOrderForParent,
    setEditingOrderForParent,

    // 첨부파일 관리 다이얼로그
    attachmentDialogOpen,
    setAttachmentDialogOpen,
    editingOrderForAttachment,
    setEditingOrderForAttachment,

    // 필터링된 데이터
    filteredMobileData,
  };
}
