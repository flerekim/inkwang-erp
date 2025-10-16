'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createEmployeeColumns } from './employee-columns';
import { MobileEmployeeCard } from './mobile-employee-card';
import { MobileEditDialog } from './mobile-edit-dialog';
import {
  updateEmployee,
  getDepartments,
  getPositions,
  getCompanies,
  deleteEmployee,
  createEmployee,
} from '@/actions/employees';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useTableState } from '@/hooks/use-table-state';
import { useTableActions } from '@/hooks/use-table-actions';
import type { UserWithDetails, Department, Position, Company, User } from '@/types';

interface EmployeesTableNewProps {
  data: UserWithDetails[];
  currentUser: User;
}

export function EmployeesTableNew({ data, currentUser }: EmployeesTableNewProps) {
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
  } = useTableState<UserWithDetails>(data);

  // 모바일 검색
  const [searchQuery, setSearchQuery] = React.useState('');

  // 모바일 편집 다이얼로그
  const [editingEmployee, setEditingEmployee] = React.useState<UserWithDetails | null>(null);
  const [editFormData, setEditFormData] = React.useState<Partial<UserWithDetails>>({});

  // 관계형 데이터 로드
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [positions, setPositions] = React.useState<Position[]>([]);
  React.useEffect(() => {
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

  // createAction 래퍼: Partial<UserWithDetails>를 EmployeeFormData로 변환
  const createEmployeeWrapper = React.useCallback(
    async (data: Partial<UserWithDetails>) => {
      if (!data.name || !data.email || !data.company_id) {
        return { error: '이름, 이메일, 회사는 필수 입력 항목입니다.' };
      }
      const password = (data as Partial<UserWithDetails> & { password?: string }).password?.trim() || 'dlsrhkd114!';

      return await createEmployee({
        name: data.name,
        email: data.email,
        password,
        role: data.role as 'admin' | 'user' || 'user',
        employment_status: data.employment_status as 'active' | 'inactive' || 'active',
        hire_date: data.hire_date || new Date().toISOString().split('T')[0],
        company_id: data.company_id,
        department_id: data.department_id || undefined,
        position_id: data.position_id || undefined,
      });
    },
    []
  );

  // CRUD 액션 훅 사용
  const { handleUpdateCell, handleDeleteSelected: deleteSelectedAction, handleSaveNewRow: saveNewRowAction } = useTableActions<
    UserWithDetails,
    Parameters<typeof createEmployee>[0]
  >({
    tableData,
    setTableData,
    originalData: data,
    updateAction: updateEmployee as (id: string, data: Partial<UserWithDetails>) => Promise<{ error?: string; success?: boolean }>,
    deleteAction: deleteEmployee,
    createAction: createEmployeeWrapper as (data: Parameters<typeof createEmployee>[0]) => Promise<
      | { error?: string; success?: boolean; data?: UserWithDetails }
      | { data: UserWithDetails; error: null }
      | { data: null; error: string }
    >,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = React.useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 사원 추가 (인라인 방식)
  const handleAddEmployee = () => {
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
  };

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = React.useCallback((field: string, value: unknown) => {
    if (!newRowData) return;
    setNewRowData({ ...newRowData, [field]: value });
  }, [newRowData, setNewRowData]);

  // 새 행 저장 (useTableActions 훅 활용 + employee-specific 로직)
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRowData) return;

    // Employee-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.name || !data.email || !data.company_id) {
        return { error: '이름, 이메일, 회사는 필수 입력 항목입니다.' };
      }
      return true;
    };

    // 비밀번호 결정: 입력값이 있으면 사용, 없으면 기본값
    const password = (newRowData as Partial<UserWithDetails> & { password?: string }).password?.trim() || 'dlsrhkd114!';

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
  const handleCancelNewRow = () => {
    setNewRowData(null);
  };

  // 모바일 편집 다이얼로그 열기
  const handleOpenEditDialog = (employee: UserWithDetails) => {
    setEditingEmployee(employee);
    setEditFormData({
      name: employee.name,
      email: employee.email,
      company_id: employee.company_id,
      department_id: employee.department_id,
      position_id: employee.position_id,
      role: employee.role,
      employment_status: employee.employment_status,
      hire_date: employee.hire_date,
    });
  };

  // 모바일 편집 저장
  const handleSaveEdit = async () => {
    if (!editingEmployee) return;

    try {
      const result = await updateEmployee(editingEmployee.id, editFormData);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '수정 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: '수정 완료',
        description: '사원 정보가 수정되었습니다.',
      });

      setEditingEmployee(null);
      setEditFormData({});
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '수정 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    }
  };

  // 모바일 편집 취소
  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setEditFormData({});
  };

  // ESC 키로 신규 사원 추가 취소
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

  // 모바일용 필터링된 데이터 (displayData는 useTableState에서 제공)
  const filteredMobileData = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return displayData;
    }

    const query = searchQuery.toLowerCase();
    return displayData.filter((employee) => {
      return (
        employee.name?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.employee_number?.toLowerCase().includes(query) ||
        employee.company?.name?.toLowerCase().includes(query) ||
        employee.department?.name?.toLowerCase().includes(query) ||
        employee.position?.name?.toLowerCase().includes(query)
      );
    });
  }, [displayData, searchQuery]);

  // 컬럼 정의
  const columns = React.useMemo(
    () =>
      createEmployeeColumns({
        companies,
        departments,
        positions,
        currentUser,
        handleUpdateCell,
        handleUpdateNewRow,
      }),
    [companies, departments, positions, currentUser, handleUpdateCell, handleUpdateNewRow]
  );

  // Excel 내보내기 컬럼 정의 (selectedCount는 useTableState에서 제공)
  const exportColumns = React.useMemo<ExportColumn<UserWithDetails>[]>(
    () => [
      { key: 'employee_number', header: '사번' },
      { key: 'name', header: '이름' },
      { key: 'email', header: '이메일' },
      {
        key: 'company_id',
        header: '회사',
        format: (_, row) => row.company?.name || '',
      },
      {
        key: 'department_id',
        header: '부서',
        format: (_, row) => row.department?.name || '',
      },
      {
        key: 'position_id',
        header: '직급',
        format: (_, row) => row.position?.name || '',
      },
      {
        key: 'role',
        header: '권한',
        format: (value) => (value === 'admin' ? '관리자' : '사용자'),
      },
      { key: 'hire_date', header: '입사일' },
      {
        key: 'employment_status',
        header: '상태',
        format: (value) => (value === 'active' ? '재직' : '퇴사'),
      },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<UserWithDetails>[]>(
    () => [
      { key: 'employee_number', header: '사번', width: '100px', align: 'center' },
      { key: 'name', header: '이름', width: '100px' },
      { key: 'email', header: '이메일', width: '180px' },
      {
        key: 'company_id',
        header: '회사',
        width: '120px',
        format: (_, row) => row.company?.name || '',
      },
      {
        key: 'department_id',
        header: '부서',
        width: '100px',
        format: (_, row) => row.department?.name || '',
      },
      {
        key: 'position_id',
        header: '직급',
        width: '80px',
        format: (_, row) => row.position?.name || '',
      },
      {
        key: 'role',
        header: '권한',
        width: '80px',
        align: 'center',
        format: (value) => (value === 'admin' ? '관리자' : '사용자'),
      },
      { key: 'hire_date', header: '입사일', width: '100px', align: 'center' },
      {
        key: 'employment_status',
        header: '상태',
        width: '70px',
        align: 'center',
        format: (value) => (value === 'active' ? '재직' : '퇴사'),
      },
    ],
    []
  );

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={displayData}
          searchKey="name"
          searchPlaceholder="이름, 이메일 검색..."
          pageSize={10}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          enableFuzzyFilter={true}
          enableColumnResizing={true}
          columnResizeMode="onChange"
          enablePageSizeSelection={true}
          enablePageJump={true}
          toolbar={
            <CrudTableToolbar
              isAddingNew={!!newRowData}
              isSaving={isSavingNewRow}
              selectedCount={selectedCount}
              isDeleting={isDeleting}
              onAdd={handleAddEmployee}
              onSave={handleSaveNewRow}
              onCancel={handleCancelNewRow}
              onDelete={() => setDeleteDialogOpen(true)}
              exportButton={
                <ExportToExcel
                  data={tableData}
                  columns={exportColumns}
                  filename={`사원목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                  sheetName="사원"
                  buttonText="Excel 다운로드"
                />
              }
              printButton={
                <PrintTable
                  data={tableData}
                  columns={printColumns}
                  title="사원 목록"
                  subtitle={`총 ${tableData.length}명 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                  buttonText="인쇄"
                />
              }
              addButtonText="사원 추가"
              deleteButtonText="삭제"
            />
          }
        />
      </div>

      {/* 모바일: 카드 뷰 */}
      <div className="md:hidden space-y-4">
        {/* 모바일 검색창 */}
        <div className="relative">
          <input
            type="text"
            placeholder="이름, 이메일 검색..."
            className="w-full px-4 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 모바일 툴바 */}
        <div className="flex items-center gap-2 w-full">
          <CrudTableToolbar
            isMobile
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddEmployee}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
            exportButton={
              <ExportToExcel
                data={tableData}
                columns={exportColumns}
                filename={`사원목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                sheetName="사원"
                buttonText="Excel 다운로드"
              />
            }
            printButton={
              <PrintTable
                data={tableData}
                columns={printColumns}
                title="사원 목록"
                subtitle={`총 ${tableData.length}명 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                buttonText="인쇄"
              />
            }
            addButtonText="사원 추가"
            deleteButtonText="삭제"
          />
        </div>

        {/* 모바일 카드 리스트 */}
        <div className="space-y-3">
          {filteredMobileData.length > 0 ? (
            filteredMobileData.map((employee) => (
              <MobileEmployeeCard
                key={employee.id}
                employee={employee}
                isSelected={rowSelection[displayData.indexOf(employee)] || false}
                onSelectChange={(checked) => {
                  const index = displayData.indexOf(employee);
                  setRowSelection((prev) => {
                    if (checked) {
                      return { ...prev, [index]: true };
                    } else {
                      const newSelection = { ...prev };
                      delete newSelection[index];
                      return newSelection;
                    }
                  });
                }}
                onCardClick={() => handleOpenEditDialog(employee)}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 모바일 페이지네이션 */}
        {filteredMobileData.length > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-2">
            전체 {filteredMobileData.length}명
            {selectedCount > 0 && ` (${selectedCount}명 선택)`}
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="사원 삭제"
        description={`선택한 ${selectedCount}명의 사원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />

      {/* 모바일 편집 다이얼로그 */}
      <MobileEditDialog
        employee={editingEmployee}
        formData={editFormData}
        companies={companies}
        departments={departments}
        positions={positions}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        onFormChange={setEditFormData}
      />
    </>
  );
}
