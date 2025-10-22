'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableNotesCell } from '@/components/common/editable-notes-cell';
import type { BillingWithDetails, Customer, BillingOrderOption } from '@/types';

interface BillingColumnsProps {
  customers: Customer[];
  newOrders: BillingOrderOption[];
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

/**
 * 청구 관리 테이블 컬럼 정의 (인라인 편집 지원)
 *
 * 인라인 편집 가능 필드:
 * - 날짜: 청구일, 수금예정일
 * - Select: 계약명 (combobox), 고객명 (자동입력), 청구구분, 계산서
 * - Number: 청구금액 (소수점 없음)
 * - Text: 비고
 *
 * 특징:
 * - 계약명 선택 시 고객명 자동 입력
 * - 청구번호는 자동 생성 (읽기 전용)
 */
export function createBillingColumns({
  customers,
  newOrders,
  onUpdateCell,
}: BillingColumnsProps): ColumnDef<BillingWithDetails>[] {
  // 청구구분 옵션
  const billingTypeOptions = [
    { id: 'contract', name: '계약금' },
    { id: 'interim', name: '중도금' },
    { id: 'final', name: '잔금' },
  ];

  // 계산서 옵션
  const invoiceStatusOptions = [
    { id: 'issued', name: '발행' },
    { id: 'not_issued', name: '미발행' },
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

        // 새 행은 선택 불가 - 빈 div 반환
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
      minSize: 50,
      maxSize: 50,
    },
    // 청구번호 (자동 생성, 읽기 전용)
    {
      accessorKey: 'billing_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구번호" />,
      cell: ({ getValue }) => {
        const billingNumber = getValue<string>();
        return (
          <span className="text-sm font-medium text-muted-foreground">
            {billingNumber || '자동생성'}
          </span>
        );
      },
      enableSorting: true,
      size: 140,
    },
    // 청구일
    {
      accessorKey: 'billing_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구일" />,
      cell: ({ getValue, row }) => {
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="billing_date"
            onUpdate={onUpdateCell}

          />
        );
      },
      enableSorting: true,
      size: 120,
    },
    // 계약명 (신규 수주만 선택 가능)
    {
      accessorKey: 'order_id',
      header: '계약명',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.order_id}
            rowIndex={row.index}
            columnId="order_id"
            onUpdate={onUpdateCell}
            options={newOrders.map(order => ({ id: order.id, name: order.contract_name }))}
            type="combobox"
            placeholder="계약 선택"
            searchPlaceholder="계약 검색..."
            displayValue={row.original.order?.contract_name ||
              (isNewRow && newOrders.find(o => o.id === row.original.order_id)?.contract_name)}
            
          />
        );
      },
      enableSorting: false,
      size: 200,
    },
    // 고객명 (계약명 선택 시 자동 입력, 편집 가능)
    {
      accessorKey: 'customer_id',
      header: '고객명',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableSelectCell
            value={row.original.customer_id}
            rowIndex={row.index}
            columnId="customer_id"
            onUpdate={onUpdateCell}
            options={customers}
            type="combobox"
            placeholder="고객 선택"
            searchPlaceholder="고객 검색..."
            displayValue={row.original.customer?.name ||
              (isNewRow && customers.find(c => c.id === row.original.customer_id)?.name)}
          />
        );
      },
      enableSorting: false,
      size: 150,
    },
    // 청구구분 (계약금, 중도금, 잔금)
    {
      accessorKey: 'billing_type',
      header: '청구구분',
      cell: ({ row }) => {
        const billingType = row.getValue('billing_type') as string;

        const badgeVariant = (type: string) => {
          switch (type) {
            case 'contract': return 'default' as const;
            case 'interim': return 'secondary' as const;
            case 'final': return 'outline' as const;
            default: return 'outline' as const;
          }
        };

        const badgeClass = (type: string) => {
          switch (type) {
            case 'contract': return 'bg-blue-100 text-blue-700 hover:bg-blue-100/80';
            case 'interim': return 'bg-green-100 text-green-700 hover:bg-green-100/80';
            case 'final': return 'bg-purple-100 text-purple-700 hover:bg-purple-100/80';
            default: return '';
          }
        };

        const typeLabel = (type: string) => {
          switch (type) {
            case 'contract': return '계약금';
            case 'interim': return '중도금';
            case 'final': return '잔금';
            default: return type;
          }
        };

        return (
          <EditableSelectCell
            value={billingType}
            rowIndex={row.index}
            columnId="billing_type"
            onUpdate={onUpdateCell}
            options={billingTypeOptions}
            type="select"
            placeholder="청구구분"
            displayValue={
              <Badge variant={badgeVariant(billingType)} className={badgeClass(billingType)}>
                {typeLabel(billingType)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 120,
    },
    // 청구금액 (소수점 없음)
    {
      accessorKey: 'billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구금액" />,
      cell: ({ getValue, row }) => {
        const amount = getValue<number>();

        return (
          <EditableCell
            value={amount?.toString() || '0'}
            rowIndex={row.index}
            columnId="billing_amount"
            type="number"
            onUpdate={onUpdateCell}

            formatDisplay={(value) => {
              const numValue = Number(value || 0);
              return numValue.toLocaleString() + '원';
            }}
          />
        );
      },
      enableSorting: true,
      size: 150,
    },
    // 수금예정일
    {
      accessorKey: 'expected_payment_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금예정일" />,
      cell: ({ getValue, row }) => {
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="expected_payment_date"
            onUpdate={onUpdateCell}

          />
        );
      },
      enableSorting: true,
      size: 120,
    },
    // 계산서 (발행, 미발행)
    {
      accessorKey: 'invoice_status',
      header: '계산서',
      cell: ({ row }) => {
        const invoiceStatus = row.getValue('invoice_status') as string;

        const badgeVariant = (status: string) => {
          return status === 'issued' ? 'default' as const : 'outline' as const;
        };

        const badgeClass = (status: string) => {
          return status === 'issued'
            ? 'bg-green-100 text-green-700 hover:bg-green-100/80'
            : 'border-slate-300 text-slate-700';
        };

        const statusLabel = (status: string) => {
          return status === 'issued' ? '발행' : '미발행';
        };

        return (
          <EditableSelectCell
            value={invoiceStatus}
            rowIndex={row.index}
            columnId="invoice_status"
            onUpdate={onUpdateCell}
            options={invoiceStatusOptions}
            type="select"
            placeholder="계산서"
            displayValue={
              <Badge variant={badgeVariant(invoiceStatus)} className={badgeClass(invoiceStatus)}>
                {statusLabel(invoiceStatus)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
      size: 100,
    },
    // 비고 (더블클릭 편집 + Badge + Popover)
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;

        return (
          <EditableNotesCell
            notes={notes}
            onSave={async (value) => {
              await onUpdateCell(row.index, 'notes', value);
            }}
          />
        );
      },
      enableSorting: false,
      size: 150,
    },
  ];
}
