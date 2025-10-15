/**
 * 테이블 엑셀 내보내기 훅
 *
 * 테이블 데이터를 엑셀 파일로 내보내는 공통 로직
 */

'use client';

import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, type ExportColumn } from '@/lib/export-utils';
import type { BaseEntity } from '@/types/table';

interface UseTableExportConfig<T extends BaseEntity> {
  /** 내보낼 데이터 */
  data: T[];
  /** 파일명 접두사 (예: '사원목록', '회사목록') */
  filenamePrefix: string;
  /** 내보낼 컬럼 설정 */
  columns: ExportColumn<T>[];
}

/**
 * 테이블 엑셀 내보내기 훅
 */
export function useTableExport<T extends BaseEntity>(
  config: UseTableExportConfig<T>
) {
  const { data, filenamePrefix, columns } = config;
  const { toast } = useToast();

  /**
   * 엑셀 파일로 내보내기
   */
  const handleExport = useCallback(() => {
    const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}`;
    exportToExcel(data, columns, filename);

    toast({
      title: '내보내기 완료',
      description: `${data.length}개 항목이 Excel 파일로 저장되었습니다.`,
    });
  }, [data, columns, filenamePrefix, toast]);

  return { handleExport };
}
