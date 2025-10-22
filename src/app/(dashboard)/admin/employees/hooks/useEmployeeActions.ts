import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateEmployee, deleteEmployee, createEmployee } from '@/actions/employees';
import { useTableActions } from '@/hooks/use-table-actions';
import type { UserWithDetails, Company } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useEmployeeActions Hook
 *
 * 사원 테이블의 CRUD 작업과 비즈니스 로직 관리
 *
 * @param tableState - useTableState에서 반환된 상태 객체
 * @param companies - 회사 목록 (새 사원 추가 시 기본값 설정용)
 */
export function useEmployeeActions(
  tableState: UseTableStateReturn<UserWithDetails>,
  companies: Company[]
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    setTableData,
    rowSelection,
    setRowSelection,
    newRowData,
    setNewRowData,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  } = tableState;

  // createAction 래퍼: Partial<UserWithDetails>를 EmployeeFormData로 변환
  const createEmployeeWrapper = useCallback(
    async (data: Partial<UserWithDetails>) => {
      if (!data.name || !data.email || !data.company_id) {
        return { error: '이름, 이메일, 회사는 필수 입력 항목입니다.' };
      }
      const password =
        (data as Partial<UserWithDetails> & { password?: string }).password?.trim() ||
        'dlsrhkd114!';

      return await createEmployee({
        name: data.name,
        email: data.email,
        password,
        role: (data.role as 'admin' | 'user') || 'user',
        employment_status: (data.employment_status as 'active' | 'inactive') || 'active',
        hire_date: data.hire_date || new Date().toISOString().split('T')[0],
        company_id: data.company_id,
        department_id: data.department_id || undefined,
        position_id: data.position_id || undefined,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleDeleteSelected: deleteSelectedAction,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<UserWithDetails, Parameters<typeof createEmployee>[0]>({
    tableData,
    setTableData,
    originalData: tableState.tableData, // useTableState의 원본 데이터
    updateAction: updateEmployee as (
      id: string,
      data: Partial<UserWithDetails>
    ) => Promise<{ error?: string; success?: boolean }>,
    deleteAction: deleteEmployee,
    createAction: createEmployeeWrapper as (
      data: Parameters<typeof createEmployee>[0]
    ) => Promise<
      | { error?: string; success?: boolean; data?: UserWithDetails }
      | { data: UserWithDetails; error: null }
      | { data: null; error: string }
    >,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 사원 추가 (인라인 방식)
  const handleAddEmployee = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 사원이 있습니다',
        description: '먼저 현재 사원을 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<UserWithDetails> & { password?: string } = {
      id: tempId,
      employee_number: '자동생성',
      name: '',
      email: '',
      password: '', // 초기 비밀번호 필드
      role: 'user',
      employment_status: 'active',
      hire_date: new Date().toISOString().split('T')[0],
      company_id: companies[0]?.id || '',
      department_id: null,
      position_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNewRowData(newRow);
  }, [newRowData, companies, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;
      setNewRowData({ ...newRowData, [field]: value });
    },
    [newRowData, setNewRowData]
  );

  // 새 행 저장 (useTableActions 훅 활용 + employee-specific 로직)
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // Employee-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.name || !data.email || !data.company_id) {
        return { error: '이름, 이메일, 회사는 필수 입력 항목입니다.' };
      }
      return true;
    };

    // 비밀번호 결정: 입력값이 있으면 사용, 없으면 기본값
    const password =
      (newRowData as Partial<UserWithDetails> & { password?: string }).password?.trim() ||
      'dlsrhkd114!';

    // useTableActions의 saveNewRowAction 호출
    const preparedData = {
      name: newRowData.name!,
      email: newRowData.email!,
      password: password,
      role: newRowData.role as 'admin' | 'user',
      employment_status: newRowData.employment_status as 'active' | 'inactive',
      hire_date: newRowData.hire_date!,
      company_id: newRowData.company_id!,
      department_id: newRowData.department_id || undefined,
      position_id: newRowData.position_id || undefined,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      // 성공 시 비밀번호 정보 포함 메시지로 덮어쓰기
      toast({
        title: '사원 추가 완료',
        description: `${newRowData.name}님이 추가되었습니다. 초기 비밀번호: ${password}`,
      });
      setNewRowData(null);
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  // 모바일 편집 저장
  const handleSaveMobileEdit = useCallback(
    async (
      editingEmployee: UserWithDetails | null,
      editFormData: Partial<UserWithDetails>
    ) => {
      if (!editingEmployee) return { success: false };

      try {
        const result = await updateEmployee(editingEmployee.id, editFormData);

        if (result.error) {
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          return { success: false };
        }

        toast({
          title: '수정 완료',
          description: '사원 정보가 수정되었습니다.',
        });

        router.refresh();
        return { success: true };
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '수정 실패',
          description:
            error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
        return { success: false };
      }
    },
    [toast, router]
  );

  return {
    // CRUD 작업
    handleUpdateCell,
    handleDeleteSelected,
    handleAddEmployee,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
    handleSaveMobileEdit,
  };
}
