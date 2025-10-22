'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table';
import {
  FileText,
  FileX,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import type { ReceivableWithDetails } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ReceivableColumnsProps {
  onViewDetail: (receivable: ReceivableWithDetails) => void;
  onWriteOff?: (receivable: ReceivableWithDetails) => void;
}

export function createReceivableColumns({
  onViewDetail,
  onWriteOff,
}: ReceivableColumnsProps): ColumnDef<ReceivableWithDetails>[] {
  return [
    // 계약명 (청구관리와 연동)
    {
      accessorKey: 'contract_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약명" />,
      cell: ({ row }) => (
        <Button
          variant="link"
          onClick={() => onViewDetail(row.original)}
          className="h-auto p-0 font-normal text-left max-w-[300px] hover:underline"
        >
          <span className="line-clamp-2">{row.original.contract_name}</span>
        </Button>
      ),
      size: 300,
      minSize: 200,
      enableSorting: true,
    },

    // 고객명
    {
      accessorKey: 'customer_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="고객명" />,
      cell: ({ row }) => (
        <div className="font-medium">{row.original.customer_name || '-'}</div>
      ),
      size: 150,
      minSize: 120,
      enableSorting: true,
    },

    // 채권금액 (청구금액)
    {
      accessorKey: 'billing_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="채권금액" />,
      cell: ({ row }) => (
        <div className="text-right font-mono">
          {row.original.billing_amount ? formatCurrency(row.original.billing_amount) : '-'}
        </div>
      ),
      size: 130,
      minSize: 110,
      enableSorting: true,
    },

    // 잔액 (미수금)
    {
      accessorKey: 'remaining_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="잔액" />,
      cell: ({ row }) => {
        const remaining = row.original.remaining_amount || 0;
        const isOverdue = remaining > 0;

        return (
          <div
            className={`text-right font-mono font-semibold ${
              isOverdue ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {formatCurrency(remaining)}
          </div>
        );
      },
      size: 130,
      minSize: 110,
      enableSorting: true,
    },

    // 상태 (미수, 부분수금, 수금완료)
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
      cell: ({ row }) => {
        const status = row.original.status;

        let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'default';
        let icon = <Clock className="h-3 w-3" />;
        let label = '미수';

        switch (status) {
          case 'pending':
            badgeVariant = 'destructive';
            icon = <XCircle className="h-3 w-3" />;
            label = '미수';
            break;
          case 'partial':
            badgeVariant = 'outline';
            icon = <Clock className="h-3 w-3" />;
            label = '부분수금';
            break;
          case 'completed':
            badgeVariant = 'secondary';
            icon = <CheckCircle className="h-3 w-3" />;
            label = '수금완료';
            break;
        }

        return (
          <Badge variant={badgeVariant} className="gap-1">
            {icon}
            {label}
          </Badge>
        );
      },
      size: 110,
      minSize: 100,
      enableSorting: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    // 분류 (정상, 장기, 부실, 대손)
    {
      accessorKey: 'classification',
      header: ({ column }) => <DataTableColumnHeader column={column} title="분류" />,
      cell: ({ row }) => {
        const classification = row.original.classification;

        let badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' = 'default';
        let icon = <CheckCircle className="h-3 w-3" />;
        let label = '정상';

        switch (classification) {
          case 'normal':
            badgeVariant = 'default';
            icon = <CheckCircle className="h-3 w-3" />;
            label = '정상';
            break;
          case 'overdue_long':
            badgeVariant = 'outline';
            icon = <AlertTriangle className="h-3 w-3" />;
            label = '장기';
            break;
          case 'bad_debt':
            badgeVariant = 'destructive';
            icon = <AlertCircle className="h-3 w-3" />;
            label = '부실';
            break;
          case 'written_off':
            badgeVariant = 'secondary';
            icon = <FileX className="h-3 w-3" />;
            label = '대손';
            break;
        }

        return (
          <Badge variant={badgeVariant} className="gap-1">
            {icon}
            {label}
          </Badge>
        );
      },
      size: 100,
      minSize: 90,
      enableSorting: true,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },

    // 경과일 (청구일 ~ 오늘)
    {
      accessorKey: 'days_overdue',
      header: ({ column }) => <DataTableColumnHeader column={column} title="경과일" />,
      cell: ({ row }) => {
        const daysOverdue = row.original.days_overdue || 0;

        let colorClass = 'text-green-600';
        if (daysOverdue > 180) {
          colorClass = 'text-red-600';
        } else if (daysOverdue > 90) {
          colorClass = 'text-orange-600';
        }

        return (
          <div className={`text-right font-mono font-semibold ${colorClass}`}>
            {daysOverdue}일
          </div>
        );
      },
      size: 100,
      minSize: 80,
      enableSorting: true,
    },

    // 담당자
    {
      accessorKey: 'manager_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="담당자" />,
      cell: ({ row }) => <div>{row.original.manager_name || '-'}</div>,
      size: 100,
      minSize: 80,
      enableSorting: true,
    },

    // 청구일
    {
      accessorKey: 'billing_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="청구일" />,
      cell: ({ row }) => (
        <div className="text-center font-mono">{row.original.billing_date || '-'}</div>
      ),
      size: 110,
      minSize: 100,
      enableSorting: true,
    },

    // 최종수금일
    {
      accessorKey: 'last_collection_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="최종수금일" />,
      cell: ({ row }) => (
        <div className="text-center font-mono">{row.original.last_collection_date || '-'}</div>
      ),
      size: 120,
      minSize: 110,
      enableSorting: true,
    },

    // 회수활동 (배지 표시 - 클릭하여 상세보기)
    {
      accessorKey: 'activity_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="회수활동" />,
      cell: ({ row }) => {
        const activityCount = row.original.activity_count || 0;

        if (activityCount > 0) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetail(row.original)}
              className="h-auto p-1"
            >
              <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
                <FileText className="h-3 w-3" />
                내역있음 ({activityCount})
              </Badge>
            </Button>
          );
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(row.original)}
            className="h-auto p-1"
          >
            <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-accent">
              <FileX className="h-3 w-3" />
              내역없음 (추가)
            </Badge>
          </Button>
        );
      },
      size: 130,
      minSize: 110,
      enableSorting: true,
    },

    // 액션 (대손처리 버튼)
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => {
        const classification = row.original.classification;
        const isWrittenOff = classification === 'written_off';

        if (isWrittenOff || !onWriteOff) {
          return null;
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWriteOff(row.original)}
            className="h-8 px-2 text-xs"
          >
            대손처리
          </Button>
        );
      },
      size: 100,
      minSize: 90,
      enableSorting: false,
    },
  ];
}
