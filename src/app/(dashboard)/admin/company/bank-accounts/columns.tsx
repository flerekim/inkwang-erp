'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { DataTableColumnHeader } from '@/components/common/data-table';
import type { Company } from '@/types';

type BankAccountWithCompany = {
  id: string;
  bank_name: string;
  account_number: string;
  initial_balance: number;
  current_balance: number;
  company_id: string;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string };
};

interface CreateColumnsOptions {
  companies: Company[];
  handleUpdateCell: (rowIndex: number, columnId: string, value: string | number) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

export function createColumns({ companies, handleUpdateCell, handleUpdateNewRow }: CreateColumnsOptions): ColumnDef<BankAccountWithCompany>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)} aria-label="모두 선택" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="행 선택" />,
      enableSorting: false,
      enableHiding: false,
      size: 20,
      minSize: 20,
      maxSize: 20,
    },
    {
      accessorKey: 'company_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="회사" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
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
            displayValue={row.original.company?.name || (isNewRow && row.original.company_id ? companies.find(c => c.id === row.original.company_id)?.name : undefined)}
          />
        );
      },
    },
    {
      accessorKey: 'bank_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="은행명" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
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
    },
    {
      accessorKey: 'account_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계좌번호" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
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
    },
    {
      accessorKey: 'initial_balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="초기잔액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return isNewRow ? (
          <EditableCell
            value={String(getValue<number>() || '')}
            rowIndex={row.index}
            columnId="initial_balance"
            onUpdate={async (idx, field, value) => handleUpdateNewRow(field, parseFloat(value) || 0)}
            type="number"
            className="border border-primary/50"
          />
        ) : (
          <div className="text-right">₩{(getValue<number>()).toLocaleString()}</div>
        );
      },
    },
    {
      accessorKey: 'current_balance',
      header: ({ column }) => <DataTableColumnHeader column={column} title="현재잔액" />,
      cell: ({ row }) => {
        return <div className="text-right font-semibold">₩{(row.getValue('current_balance') as number).toLocaleString()}</div>;
      },
    },
  ];
}
