'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableNotesCell } from '@/components/common/editable-notes-cell';
import { formatNumber } from '@/lib/utils';
import type { PerformanceWithDetails, NewOrderOption, User, Customer } from '@/types';

interface PerformanceColumnsProps {
  newOrders: NewOrderOption[];
  managers: User[];
  customers: Customer[];
  handleUnifiedUpdate: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

/**
 * 실적관리 테이블 컬럼 정의 (인라인 편집 지원)
 */
export function createPerformanceColumns({
  newOrders,
  managers,
  handleUnifiedUpdate,
}: PerformanceColumnsProps): ColumnDef<PerformanceWithDetails>[] {
  // 단위 옵션
  const unitOptions = [
    { id: 'ton', name: 'Ton' },
    { id: 'unit', name: '대' },
    { id: 'm3', name: 'm³' },
  ];

  return [
    // 체크박스 컬럼
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');

        if (isNewRow) {
          return <div className="w-5" />;
        }

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
    },

    // 실적구분 (예정/확정)
    {
      accessorKey: 'performance_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="실적구분" />,
      cell: ({ row }) => {
        const value = row.original.performance_type;
        const isConfirmed = value === 'confirmed';

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              handleUnifiedUpdate(row.index, 'performance_type', isConfirmed ? 'planned' : 'confirmed')
            }
            className="h-7 px-2"
          >
            <Badge variant={isConfirmed ? 'default' : 'secondary'}>
              {isConfirmed ? '확정' : '예정'}
            </Badge>
          </Button>
        );
      },
      size: 100,
    },

    // 계약명 (combobox로 신규계약 선택)
    {
      accessorKey: 'order_id',
      id: 'contract_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약명" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const orderId = row.original.order_id;
        const contractName = row.original.order?.contract_name;

        // 새 행: combobox로 계약 선택
        if (isNewRow) {
          const selectedOrder = newOrders.find((o) => o.id === orderId);
          return (
            <EditableSelectCell
              value={orderId}
              rowIndex={row.index}
              columnId="order_id"
              onUpdate={handleUnifiedUpdate}
              options={newOrders.map((o) => ({ id: o.id, name: o.contract_name }))}
              type="combobox"
              placeholder="계약명 선택"
              displayValue={<span className="truncate">{selectedOrder?.contract_name || '선택'}</span>}
            />
          );
        }

        // 기존 행: 읽기 전용
        return <span className="truncate">{contractName || '-'}</span>;
      },
      size: 200,
    },

    // 고객명 (계약 선택 시 자동 표시, 읽기 전용)
    {
      accessorKey: 'order.customer.name',
      id: 'customer_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="고객명" />,
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const orderId = row.original.order_id;
        const customerName = row.original.order?.customer?.name;

        // 새 행: 선택된 계약의 고객명 자동 표시
        if (isNewRow) {
          const selectedOrder = newOrders.find((o) => o.id === orderId);
          return <span className="text-muted-foreground">{selectedOrder?.customer_name || '-'}</span>;
        }

        // 기존 행: 읽기 전용
        return <span>{customerName || '-'}</span>;
      },
      size: 150,
    },

    // 실적일
    {
      accessorKey: 'performance_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="실적일" />,
      cell: ({ row }) => {
        const date = row.original.performance_date;

        return (
          <EditableDateCell
            value={date}
            rowIndex={row.index}
            columnId="performance_date"
            onUpdate={handleUnifiedUpdate}
          />
        );
      },
      size: 130,
    },

    // 단위
    {
      accessorKey: 'unit',
      header: ({ column }) => <DataTableColumnHeader column={column} title="단위" />,
      cell: ({ row }) => {
        const unit = row.original.unit;
        const unitLabel = unitOptions.find((opt) => opt.id === unit)?.name || unit;

        return (
          <EditableSelectCell
            value={unit}
            rowIndex={row.index}
            columnId="unit"
            onUpdate={handleUnifiedUpdate}
            options={unitOptions}
            type="select"
            placeholder="단위"
            displayValue={<span>{unitLabel}</span>}
          />
        );
      },
      size: 100,
    },

    // 수량
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수량" />,
      cell: ({ row }) => {
        const quantity = row.original.quantity;
        // 문자열 또는 숫자를 숫자로 변환 후 toFixed 적용
        const quantityValue = typeof quantity === 'number'
          ? quantity
          : parseFloat(String(quantity || 0));

        return (
          <div className="text-right">
            <EditableCell
              value={quantityValue.toFixed(2)}
              rowIndex={row.index}
              columnId="quantity"
              onUpdate={handleUnifiedUpdate}
              className="font-mono"
            />
          </div>
        );
      },
      size: 120,
    },

    // 단가
    {
      accessorKey: 'unit_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="단가" />,
      cell: ({ row }) => {
        const unitPrice = row.original.unit_price;

        return (
          <div className="text-right">
            <EditableCell
              value={formatNumber(unitPrice || 0)}
              rowIndex={row.index}
              columnId="unit_price"
              onUpdate={handleUnifiedUpdate}
              className="font-mono"
            />
          </div>
        );
      },
      size: 130,
    },

    // 실적금액
    {
      accessorKey: 'performance_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="실적금액" />,
      cell: ({ row }) => {
        const amount = row.original.performance_amount;

        return (
          <div className="text-right">
            <EditableCell
              value={formatNumber(amount || 0)}
              rowIndex={row.index}
              columnId="performance_amount"
              onUpdate={handleUnifiedUpdate}
              className="font-mono font-semibold"
            />
          </div>
        );
      },
      size: 150,
    },

    // 담당자
    {
      accessorKey: 'manager_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="담당자" />,
      cell: ({ row }) => {
        const managerId = row.original.manager_id;
        const managerName = row.original.manager?.name;

        return (
          <EditableSelectCell
            value={managerId || ''}
            rowIndex={row.index}
            columnId="manager_id"
            onUpdate={handleUnifiedUpdate}
            options={[
              { id: '', name: '미지정' },
              ...managers.map((m) => ({ id: m.id, name: m.name })),
            ]}
            type="combobox"
            placeholder="담당자"
            displayValue={<span>{managerName || '미지정'}</span>}
          />
        );
      },
      size: 120,
    },

    // 비고
    {
      accessorKey: 'notes',
      header: ({ column }) => <DataTableColumnHeader column={column} title="비고" />,
      cell: ({ row }) => {
        const notes = row.original.notes;

        return (
          <EditableNotesCell
            notes={notes || null}
            onSave={async (value: string) => {
              await handleUnifiedUpdate(row.index, 'notes', value);
            }}
          />
        );
      },
      size: 200,
    },
  ];
}
