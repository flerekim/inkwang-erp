'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { createEmployeeColumns } from './employee-columns';
import { MobileEmployeeCard } from './mobile-employee-card';
import { MobileEditDialog } from './mobile-edit-dialog';
import { useTableState } from '@/hooks/use-table-state';
import { useEmployeeData } from './hooks/useEmployeeData';
import { useEmployeeActions } from './hooks/useEmployeeActions';
import { EmployeeToolbar } from './components/EmployeeToolbar';
import type { UserWithDetails, User } from '@/types';

interface EmployeesTableNewProps {
  data: UserWithDetails[];
  currentUser: User;
}

export function EmployeesTableNew({ data, currentUser }: EmployeesTableNewProps) {
  // 테이블 상태 관리
  const tableState = useTableState<UserWithDetails>(data);
  const {
    rowSelection,
    setRowSelection,
    deleteDialogOpen,
    setDeleteDialogOpen,
    newRowData,
    selectedCount,
    displayData,
    tableData,
    isDeleting,
    isSavingNewRow,
  } = tableState;

  // 사원 관련 데이터 및 모바일 UI 상태
  const {
    companies,
    departments,
    positions,
    searchQuery,
    setSearchQuery,
    editingEmployee,
    setEditingEmployee,
    editFormData,
    setEditFormData,
    filteredMobileData,
  } = useEmployeeData(displayData);

  // 사원 CRUD 작업
  const {
    handleUpdateCell,
    handleDeleteSelected,
    handleAddEmployee,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
    handleSaveMobileEdit,
  } = useEmployeeActions(tableState, companies);

  // 모바일 편집 다이얼로그 열기
  const handleOpenEditDialog = React.useCallback(
    (employee: UserWithDetails) => {
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
    },
    [setEditingEmployee, setEditFormData]
  );

  // 모바일 편집 저장
  const handleSaveEdit = React.useCallback(async () => {
    const result = await handleSaveMobileEdit(editingEmployee, editFormData);
    if (result.success) {
      setEditingEmployee(null);
      setEditFormData({});
    }
  }, [handleSaveMobileEdit, editingEmployee, editFormData, setEditingEmployee, setEditFormData]);

  // 모바일 편집 취소
  const handleCancelEdit = React.useCallback(() => {
    setEditingEmployee(null);
    setEditFormData({});
  }, [setEditingEmployee, setEditFormData]);

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
  }, [newRowData, handleCancelNewRow]);

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
          enableColumnPinning={true}
          enableColumnVisibility={true}
          enablePageSizeSelection={true}
          enablePageJump={true}
          toolbar={
            <EmployeeToolbar
              tableData={tableData}
              isAddingNew={!!newRowData}
              isSaving={isSavingNewRow}
              selectedCount={selectedCount}
              isDeleting={isDeleting}
              onAdd={handleAddEmployee}
              onSave={handleSaveNewRow}
              onCancel={handleCancelNewRow}
              onDelete={() => setDeleteDialogOpen(true)}
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
          <EmployeeToolbar
            isMobile
            tableData={tableData}
            isAddingNew={!!newRowData}
            isSaving={isSavingNewRow}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onAdd={handleAddEmployee}
            onSave={handleSaveNewRow}
            onCancel={handleCancelNewRow}
            onDelete={() => setDeleteDialogOpen(true)}
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
