'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from '@/components/common/editable-cell';
import { DataTableColumnHeader } from '@/components/common/data-table';
import type { Department } from '@/types';

interface CreateColumnsOptions {
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

export function createColumns({ handleUpdateCell, handleUpdateNewRow }: CreateColumnsOptions): ColumnDef<Department>[] {
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
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="부서명" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
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
    },
    {
      accessorKey: 'sort_order',
      header: ({ column }) => <DataTableColumnHeader column={column} title="정렬순서" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={String(getValue<number>() || '')}
            rowIndex={row.index}
            columnId="sort_order"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, parseInt(value, 10) || 0) : handleUpdateCell}
            type="number"
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
  ];
}
