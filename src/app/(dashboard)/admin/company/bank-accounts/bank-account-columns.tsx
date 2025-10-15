'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import type { BankAccount, Company } from '@/types';

// 회사 정보가 포함된 은행계좌 타입
type BankAccountWithCompany = BankAccount & {
  company: Pick<Company, 'id' | 'name'> | null;
};

interface BankAccountColumnsProps {
  companies: Pick<Company, 'id' | 'name'>[];
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

/**
 * 은행계좌 정보 관리 테이블 컬럼 정의
 */
export function createBankAccountColumns({
  companies,
  handleUpdateCell,
  handleUpdateNewRow,
}: BankAccountColumnsProps): ColumnDef<BankAccountWithCompany>[] {
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
      size: 20,
      minSize: 20,
      maxSize: 20,
    },
    {
      accessorKey: 'company',
      header: ({ column }) => <DataTableColumnHeader column={column} title="회사" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const companyId = row.original.company_id || '';
        const companyName = row.original.company?.name || '';

        return (
          <EditableSelectCell
            value={companyId}
            displayValue={companyName}
            rowIndex={row.index}
            columnId="company_id"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={companies.map((c) => ({ id: c.id, name: c.name }))}
            type="combobox"
            searchPlaceholder="회사 검색..."
            emptyText="회사를 찾을 수 없습니다"
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'bank_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="은행명" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="bank_name"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'account_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계좌번호" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="account_number"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'initial_balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="초기잔액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const value = getValue<number>();
        return (
          <EditableCell
            value={value?.toLocaleString() || '0'}
            rowIndex={row.index}
            columnId="initial_balance"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'current_balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="현재잔액" />,
      cell: ({ getValue }) => {
        const value = getValue<number>();
        return <div className="px-2 py-1">{value?.toLocaleString() || '0'}</div>;
      },
      enableSorting: true,
    },
  ];
}
