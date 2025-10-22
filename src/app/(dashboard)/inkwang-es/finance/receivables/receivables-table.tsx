'use client';

import * as React from 'react';
import { useMemo, useState, useCallback } from 'react';
import { DataTable } from '@/components/common/data-table';
import { ReceivableDetailDialog } from './components/ReceivableDetailDialog';
import { createReceivableColumns } from './receivable-columns';
import { useReceivableData } from './hooks/useReceivableData';
import { useReceivableActions } from './hooks/useReceivableActions';
import type { ReceivableWithDetails } from '@/types';

interface ReceivablesTableProps {
  data: ReceivableWithDetails[];
}

export function ReceivablesTable({ data }: ReceivablesTableProps) {
  // 훅 사용
  const { displayData } = useReceivableData(data);
  const { handleWriteOff } = useReceivableActions();

  // 상세 다이얼로그 상태
  const [selectedReceivable, setSelectedReceivable] = useState<ReceivableWithDetails | null>(
    null
  );
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // 상세보기 핸들러
  const handleViewDetail = useCallback((receivable: ReceivableWithDetails) => {
    setSelectedReceivable(receivable);
    setDetailDialogOpen(true);
  }, []);

  // 메모이제이션된 데이터
  const memoizedData = useMemo(() => displayData, [displayData]);

  // 메모이제이션된 컬럼
  const columns = useMemo(
    () =>
      createReceivableColumns({
        onViewDetail: handleViewDetail,
        onWriteOff: handleWriteOff,
      }),
    [handleWriteOff, handleViewDetail]
  );

  return (
    <>
      <DataTable
        data={memoizedData}
        columns={columns}
        enableColumnResizing
        columnResizeMode="onChange"
      />

      {/* 상세 다이얼로그 */}
      <ReceivableDetailDialog
        receivable={selectedReceivable}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
}
