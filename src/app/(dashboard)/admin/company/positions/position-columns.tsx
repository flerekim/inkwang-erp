'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import type { Position } from '@/types';

interface PositionColumnsProps {
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  handleUpdateNewRow: (field: string, value: unknown) => void;
}

/**
 * 직급 정보 관리 테이블 컬럼 정의
 */
export function createPositionColumns({
  handleUpdateCell,
  handleUpdateNewRow,
}: PositionColumnsProps): ColumnDef<Position>[] {
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
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="직급명" />,
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
      size: 400,
      minSize: 300,
      maxSize: 600,
    },
    {
      accessorKey: 'sort_order',
      header: ({ column }) => <DataTableColumnHeader column={column} title="정렬순서" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const value = getValue<number>();
        return (
          <EditableCell
            value={value?.toString() || ''}
            rowIndex={row.index}
            columnId="sort_order"
            onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
      size: 120,
      minSize: 100,
      maxSize: 150,
    },
  ];
}
