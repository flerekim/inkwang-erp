'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import type { ReceivableWithDetails } from '@/types';

interface ReceivableToolbarProps {
  table: Table<ReceivableWithDetails>;
  onRefresh?: () => void;
}

export function ReceivableToolbar({ table, onRefresh }: ReceivableToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Excel/Print용 데이터 및 컬럼 변환 (메모이제이션)
  const exportData = React.useMemo(() => {
    const rows = table.getFilteredRowModel().rows.map((row) => ({
      계약명: row.original.contract_name || '',
      고객명: row.original.customer_name || '',
      채권금액: row.original.billing_amount || 0,
      잔액: row.original.remaining_amount || 0,
      상태:
        row.original.status === 'pending'
          ? '미수'
          : row.original.status === 'partial'
          ? '부분수금'
          : '수금완료',
      분류:
        row.original.classification === 'normal'
          ? '정상'
          : row.original.classification === 'overdue_long'
          ? '장기'
          : row.original.classification === 'bad_debt'
          ? '부실'
          : '대손',
      경과일: `${row.original.days_overdue || 0}일`,
      담당자: row.original.manager_name || '',
      청구일: row.original.billing_date || '',
      최종수금일: row.original.last_collection_date || '',
      회수활동: row.original.activity_count ? '내역있음' : '내역없음',
    }));

    const columns = [
      { header: '계약명', key: '계약명' },
      { header: '고객명', key: '고객명' },
      { header: '채권금액', key: '채권금액' },
      { header: '잔액', key: '잔액' },
      { header: '상태', key: '상태' },
      { header: '분류', key: '분류' },
      { header: '경과일', key: '경과일' },
      { header: '담당자', key: '담당자' },
      { header: '청구일', key: '청구일' },
      { header: '최종수금일', key: '최종수금일' },
      { header: '회수활동', key: '회수활동' },
    ];

    return { data: rows, columns };
  }, [table]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {/* 검색 필터 */}
        <Input
          placeholder="계약명, 고객명으로 검색..."
          value={(table.getColumn('contract_name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('contract_name')?.setFilterValue(event.target.value)
          }
          className="h-9 w-[250px] lg:w-[300px]"
        />

        {/* 필터 초기화 버튼 */}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-9 px-2 lg:px-3">
            초기화
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

        {/* 새로고침 버튼 */}
        {onRefresh && (
          <Button variant="ghost" onClick={onRefresh} className="h-9 px-2 lg:px-3">
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        )}
      </div>

      {/* 우측 액션 버튼 */}
      <div className="flex items-center space-x-2">
        {/* Excel 내보내기 */}
        <ExportToExcel
          data={exportData.data}
          columns={exportData.columns}
          filename={`채권관리_${new Date().toISOString().split('T')[0]}`}
        />

        {/* 인쇄 */}
        <PrintTable
          title="채권 관리 목록"
          data={exportData.data}
          columns={exportData.columns}
        />
      </div>
    </div>
  );
}
