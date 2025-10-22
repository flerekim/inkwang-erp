import * as React from 'react';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import type { UserWithDetails } from '@/types';

interface EmployeeToolbarProps {
  isMobile?: boolean;
  tableData: UserWithDetails[];
  isAddingNew: boolean;
  isSaving: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onAdd: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

/**
 * EmployeeToolbar 컴포넌트
 *
 * 사원 테이블의 데스크톱/모바일 툴바 UI
 */
export function EmployeeToolbar({
  isMobile = false,
  tableData,
  isAddingNew,
  isSaving,
  selectedCount,
  isDeleting,
  onAdd,
  onSave,
  onCancel,
  onDelete,
}: EmployeeToolbarProps) {
  // Excel 내보내기 컬럼 정의
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
    <CrudTableToolbar
      isMobile={isMobile}
      isAddingNew={isAddingNew}
      isSaving={isSaving}
      selectedCount={selectedCount}
      isDeleting={isDeleting}
      onAdd={onAdd}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={onDelete}
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
  );
}
