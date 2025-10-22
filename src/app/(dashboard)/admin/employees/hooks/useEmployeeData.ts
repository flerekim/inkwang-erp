import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getCompanies, getDepartments, getPositions } from '@/actions/employees';
import type { UserWithDetails, Company, Department, Position } from '@/types';

/**
 * useEmployeeData Hook
 *
 * 사원 테이블에 필요한 관련 데이터 로딩 및 모바일 UI 상태 관리
 *
 * @param initialData - 초기 사원 데이터 (displayData from useTableState)
 */
export function useEmployeeData(initialData: UserWithDetails[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // 모바일 검색 상태
  const [searchQuery, setSearchQuery] = useState('');

  // 모바일 편집 다이얼로그 상태
  const [editingEmployee, setEditingEmployee] = useState<UserWithDetails | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<UserWithDetails>>({});

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [comps, depts, poss] = await Promise.all([
          getCompanies(),
          getDepartments(),
          getPositions(),
        ]);
        setCompanies(comps);
        setDepartments(depts);
        setPositions(poss);
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
    return initialData.filter((employee) => {
      return (
        employee.name?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.employee_number?.toLowerCase().includes(query) ||
        employee.company?.name?.toLowerCase().includes(query) ||
        employee.department?.name?.toLowerCase().includes(query) ||
        employee.position?.name?.toLowerCase().includes(query)
      );
    });
  }, [initialData, searchQuery]);

  return {
    // 관계형 데이터
    companies,
    departments,
    positions,

    // 모바일 검색
    searchQuery,
    setSearchQuery,

    // 모바일 편집 다이얼로그
    editingEmployee,
    setEditingEmployee,
    editFormData,
    setEditFormData,

    // 필터링된 데이터
    filteredMobileData,
  };
}
