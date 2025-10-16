'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EmployeeActions } from './employee-actions';
import type { UserWithDetails, Department, Position, Company, User } from '@/types';

interface EmployeeColumnsProps {
  companies: Company[];
  departments: Department[];
  positions: Position[];
  currentUser: User;
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

/**
 * 사원 관리 테이블 컬럼 정의
 */
export function createEmployeeColumns({
  companies,
  departments,
  positions,
  currentUser,
  handleUpdateCell,
  handleUpdateNewRow,
}: EmployeeColumnsProps): ColumnDef<UserWithDetails>[] {
  // 권한 옵션
  const roleOptions = [
    { id: 'admin', name: '관리자' },
    { id: 'user', name: '사용자' },
  ];

  // 상태 옵션
  const statusOptions = [
    { id: 'active', name: '재직' },
    { id: 'inactive', name: '퇴사' },
  ];

  return [
    // 체크박스 컬럼
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        if (isNewRow) return null; // 새 행은 선택 불가

        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="행 선택"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
      minSize: 50,
      maxSize: 50,
    },
    {
      accessorKey: 'employee_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="사번" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{row.getValue('employee_number')}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="이름" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="name"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="이메일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        if (isNewRow) {
          return (
            <EditableCell
              value={getValue<string>() || ''}
              rowIndex={row.index}
              columnId="email"
              onUpdate={async (idx, field, value) => handleUpdateNewRow(field, value)}
              className="border border-primary/50"
            />
          );
        }
        return <span className="text-sm">{getValue<string>()}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'password',
      header: '비밀번호',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const originalWithPassword = row.original as UserWithDetails & { password?: string };
        return (
          <EditableCell
            value={(isNewRow ? originalWithPassword.password : '') || ''}
            rowIndex={row.index}
            columnId="password"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            type="password"
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'company_id',
      header: '회사',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.company_id}
            rowIndex={row.index}
            columnId="company_id"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={companies}
            type="combobox"
            placeholder="회사 선택"
            searchPlaceholder="회사 검색..."
            displayValue={row.original.company?.name || (isNewRow ? companies.find(c => c.id === row.original.company_id)?.name : undefined)}
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'department_id',
      header: '부서',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.department_id}
            rowIndex={row.index}
            columnId="department_id"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={departments}
            type="combobox"
            placeholder="부서 선택"
            searchPlaceholder="부서 검색..."
            displayValue={row.original.department?.name || (isNewRow && row.original.department_id ? departments.find(d => d.id === row.original.department_id)?.name : undefined)}
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'position_id',
      header: '직급',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.position_id}
            rowIndex={row.index}
            columnId="position_id"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={positions}
            type="combobox"
            placeholder="직급 선택"
            searchPlaceholder="직급 검색..."
            displayValue={row.original.position?.name || (isNewRow && row.original.position_id ? positions.find(p => p.id === row.original.position_id)?.name : undefined)}
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'role',
      header: '권한',
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={role}
            rowIndex={row.index}
            columnId="role"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={roleOptions}
            type="select"
            placeholder="권한 선택"
            displayValue={
              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                {role === 'admin' ? '관리자' : '사용자'}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'hire_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="입사일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="hire_date"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'employment_status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('employment_status') as string;
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={status}
            rowIndex={row.index}
            columnId="employment_status"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={statusOptions}
            type="select"
            placeholder="상태 선택"
            displayValue={
              <Badge variant={status === 'active' ? 'default' : 'outline'}>
                {status === 'active' ? '재직' : '퇴사'}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    // Actions 컬럼 (모듈 권한 관리, 삭제)
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        if (isNewRow) return null; // 새 행은 액션 버튼 없음

        return (
          <EmployeeActions
            employee={row.original}
            currentUser={currentUser}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 60,
      minSize: 60,
      maxSize: 60,
    },
  ];
}
