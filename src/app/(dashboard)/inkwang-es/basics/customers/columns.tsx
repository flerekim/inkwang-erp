'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { formatBusinessNumber } from '@/lib/utils';
import type { Customer } from '@/types';

interface CreateColumnsOptions {
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

export function createColumns({ handleUpdateCell, handleUpdateNewRow }: CreateColumnsOptions): ColumnDef<Customer>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="행 선택"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 20,
      minSize: 20,
      maxSize: 20,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="고객명" />,
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
      accessorKey: 'customer_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="고객구분" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.customer_type}
            rowIndex={row.index}
            columnId="customer_type"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={[
              { id: '발주처', name: '발주처' },
              { id: '검증업체', name: '검증업체' },
              { id: '외상매입처', name: '외상매입처' },
              { id: '기타', name: '기타' },
            ]}
            type="combobox"
            placeholder="고객구분 선택"
            searchPlaceholder="고객구분 검색..."
            displayValue={row.original.customer_type}
          />
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="거래상태" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.status}
            rowIndex={row.index}
            columnId="status"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            options={[
              { id: '거래중', name: '거래중' },
              { id: '중단', name: '중단' },
            ]}
            type="select"
            placeholder="거래상태 선택"
            displayValue={row.original.status}
          />
        );
      },
    },
    {
      accessorKey: 'business_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="사업자등록번호" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        const rawValue = getValue<string>() || '';
        const displayValue = formatBusinessNumber(rawValue);

        return (
          <EditableCell
            value={displayValue}
            rowIndex={row.index}
            columnId="business_number"
            onUpdate={async (idx, field, value) => {
              // 하이픈 제거하고 숫자만 저장
              const cleanedValue = value.replace(/\D/g, '');
              if (isNewRow) {
                handleUpdateNewRow(field, cleanedValue);
              } else {
                await handleUpdateCell(idx, field, cleanedValue);
              }
            }}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
    {
      accessorKey: 'representative_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="대표자명" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="representative_name"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => <DataTableColumnHeader column={column} title="대표전화" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="phone"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="이메일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="email"
            type="email"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
    {
      accessorKey: 'manager_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="업체담당자" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="manager_name"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
    },
    {
      accessorKey: 'notes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="비고" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="notes"
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
        return isNewRow ? (
          <EditableCell
            value={String(getValue<number>() || '')}
            rowIndex={row.index}
            columnId="sort_order"
            onUpdate={async (idx, field, value) => {
              const numValue = parseInt(value, 10) || 0;
              handleUpdateNewRow(field, numValue);
            }}
            type="number"
            className="border border-primary/50"
          />
        ) : (
          <div className="font-mono">{getValue<number>()}</div>
        );
      },
    },
  ];
}
