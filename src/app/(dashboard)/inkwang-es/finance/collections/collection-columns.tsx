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
import type { CollectionWithDetails, BillingCollectionStatus, BankAccount } from '@/types';

interface CollectionColumnsProps {
  billingStatuses: BillingCollectionStatus[];
  bankAccounts: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'>[];
  onUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
}

export function createCollectionColumns({
  billingStatuses,
  bankAccounts,
  onUpdateCell,
}: CollectionColumnsProps): ColumnDef<CollectionWithDetails>[] {
  // 수금방법 옵션
  const collectionMethodOptions = [
    { id: 'bank_transfer', name: '계좌이체' },
    { id: 'other', name: '기타' },
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
    // 청구번호 (Combobox - 상세 정보 표시)
    {
      accessorKey: 'billing_id',
      header: '청구번호',
      cell: ({ row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const billingId = row.original.billing_id;
        const status = billingStatuses.find(s => s.billing_id === billingId);

        return (
          <EditableSelectCell
            value={billingId}
            rowIndex={row.index}
            columnId="billing_id"
            onUpdate={onUpdateCell}
            options={billingStatuses.map(s => ({
              id: s.billing_id,
              name: `${s.billing_number} ${s.contract_name}`,
              renderItem: (
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-sm">{s.billing_number}</span>
                    <Badge variant="outline" className="text-xs">
                      {s.customer_name}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {s.contract_name}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>총 청구: <span className="font-medium text-foreground">{s.billing_amount.toLocaleString()}원</span></span>
                    <span>기수금: <span className="font-medium text-blue-600">{s.collected_amount.toLocaleString()}원</span></span>
                    <span>잔액: <span className="font-medium text-orange-600">{s.remaining_amount.toLocaleString()}원</span></span>
                  </div>
                </div>
              ),
            }))}
            type="combobox"
            placeholder="청구 선택"
            searchPlaceholder="청구번호 또는 계약명으로 검색..."
            displayValue={
              row.original.billing?.billing_number ||
              (isNewRow && billingId && status && (
                <Badge variant="outline" className="font-mono">
                  {status.billing_number}
                </Badge>
              ))
            }
          />
        );
      },
      enableSorting: false,
    },
    // 계약명 (선택한 청구의 계약명 자동 입력, 읽기 전용)
    {
      header: '계약명',
      cell: ({ row }) => {
        const contractName = row.original.billing?.order?.contract_name || '-';
        return (
          <div className="text-sm" title="선택한 청구의 계약명 (자동 입력)">
            {contractName}
          </div>
        );
      },
      enableSorting: false,
    },
    // 수금예정일 (선택한 청구의 수금예정일 자동 입력, 읽기 전용)
    {
      header: '수금예정일',
      cell: ({ row }) => {
        const expectedDate = row.original.billing?.expected_payment_date;
        const displayDate = expectedDate
          ? new Date(expectedDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : '-';
        return (
          <div className="text-sm" title="선택한 청구의 수금예정일 (자동 입력)">
            {displayDate}
          </div>
        );
      },
      enableSorting: false,
    },
    // 수금일
    {
      accessorKey: 'collection_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금일" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableDateCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="collection_date"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: true,
    },
    // 수금액
    {
      accessorKey: 'collection_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="수금액" />,
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        const amount = getValue<number>();

        return (
          <EditableCell
            value={amount?.toString() || '0'}
            rowIndex={row.index}
            columnId="collection_amount"
            type="number"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            formatDisplay={(value) => {
              const num = Number(value || 0);
              return num.toLocaleString() + '원';
            }}
          />
        );
      },
      enableSorting: true,
    },
    // 수금방법
    {
      accessorKey: 'collection_method',
      header: '수금방법',
      cell: ({ row }) => {
        const method = row.getValue('collection_method') as string;

        const getBadgeVariant = (m: string) => {
          return m === 'bank_transfer' ? 'default' : 'outline';
        };

        const getLabel = (m: string) => {
          return m === 'bank_transfer' ? '계좌이체' : '기타';
        };

        return (
          <EditableSelectCell
            value={method}
            rowIndex={row.index}
            columnId="collection_method"
            onUpdate={onUpdateCell}
            options={collectionMethodOptions}
            type="select"
            placeholder="수금방법"
            displayValue={
              <Badge variant={getBadgeVariant(method)}>
                {getLabel(method)}
              </Badge>
            }
          />
        );
      },
      enableSorting: false,
    },
    // 입금자
    {
      accessorKey: 'depositor',
      header: '입금자',
      cell: ({ getValue, row }) => {
        const isNewRow = row.original.id?.startsWith('temp-');
        return (
          <EditableCell
            value={getValue<string>() || ''}
            rowIndex={row.index}
            columnId="depositor"
            type="text"
            onUpdate={onUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
          />
        );
      },
      enableSorting: false,
    },
    // 은행명
    {
      accessorKey: 'bank_account_id',
      header: '은행명',
      cell: ({ row }) => {
        const method = row.original.collection_method;
        const bankAccountId = row.original.bank_account_id;
        const bankName = row.original.bank_name || row.original.bank_account?.bank_name;

        // 계좌이체가 아니면 null 가능
        if (method !== 'bank_transfer') {
          return <div className="text-sm text-muted-foreground">-</div>;
        }

        return (
          <EditableSelectCell
            value={bankAccountId || ''}
            rowIndex={row.index}
            columnId="bank_account_id"
            onUpdate={onUpdateCell}
            options={bankAccounts.map(ba => ({
              id: ba.id,
              name: ba.bank_name,
            }))}
            type="combobox"
            placeholder="은행 선택"
            searchPlaceholder="은행 검색..."
            displayValue={bankName}
          />
        );
      },
      enableSorting: false,
    },
    // 계좌번호 (읽기 전용)
    {
      accessorKey: 'account_number',
      header: '계좌번호',
      cell: ({ row }) => {
        const method = row.original.collection_method;
        const accountNumber = row.original.account_number || row.original.bank_account?.account_number;

        if (method !== 'bank_transfer') {
          return <div className="text-sm text-muted-foreground">-</div>;
        }

        return (
          <div className="text-sm" title="은행명 선택 시 자동 입력 (읽기 전용)">
            {accountNumber || '-'}
          </div>
        );
      },
      enableSorting: false,
    },
    // 비고 (Badge + Popover)
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
    },
  ];
}
