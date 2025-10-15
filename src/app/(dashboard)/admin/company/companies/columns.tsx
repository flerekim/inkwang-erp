'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { EditableCell } from '@/components/common/editable-cell';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { formatBusinessNumber } from '@/lib/utils';
import type { Company } from '@/types';

interface CreateColumnsOptions {
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

/**
 * 회사 정보 테이블 컬럼 정의
 * - DB에 실제로 존재하는 필드만 사용
 */
export function createColumns({ handleUpdateCell, handleUpdateNewRow }: CreateColumnsOptions): ColumnDef<Company>[] {
  return [
    // 체크박스 컬럼
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
    // 회사명
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="회사명" />,
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
    // 사업자등록번호
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
    // 정렬순서
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
