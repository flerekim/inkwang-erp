'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useToast } from '@/hooks/use-toast';

export interface ExportColumn<T = Record<string, unknown>> {
  /** 데이터 필드명 */
  key: keyof T | string;
  /** Excel 헤더에 표시될 이름 */
  header: string;
  /** 값을 포맷팅하는 함수 (옵션) */
  format?: (value: unknown, row: T) => string | number;
}

export interface ExportToExcelProps<T = Record<string, unknown>> {
  /** 내보낼 데이터 배열 */
  data: T[];
  /** Excel 컬럼 정의 */
  columns: ExportColumn<T>[];
  /** Excel 파일명 (기본값: 'export.xlsx') */
  filename?: string;
  /** 시트 이름 (기본값: 'Sheet1') */
  sheetName?: string;
  /** 버튼 텍스트 (기본값: 'Excel 다운로드') */
  buttonText?: string;
  /** 버튼 크기 */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  /** 버튼 variant */
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** 버튼 className */
  className?: string;
  /** 아이콘만 표시할지 여부 */
  iconOnly?: boolean;
  /** 내보내기 전 콜백 */
  onBeforeExport?: () => boolean | Promise<boolean>;
  /** 내보내기 후 콜백 */
  onAfterExport?: () => void;
}

/**
 * Excel 다운로드 공통 컴포넌트
 *
 * @example
 * ```tsx
 * const columns: ExportColumn<User>[] = [
 *   { key: 'name', header: '이름' },
 *   { key: 'email', header: '이메일' },
 *   {
 *     key: 'role',
 *     header: '권한',
 *     format: (value) => value === 'admin' ? '관리자' : '사용자'
 *   },
 * ];
 *
 * <ExportToExcel
 *   data={users}
 *   columns={columns}
 *   filename="사원목록.xlsx"
 *   sheetName="사원"
 * />
 * ```
 */
export function ExportToExcel<T = Record<string, unknown>>({
  data,
  columns,
  filename = 'export.xlsx',
  sheetName = 'Sheet1',
  buttonText = 'Excel 다운로드',
  buttonSize = 'sm',
  buttonVariant = 'outline',
  className,
  iconOnly = false,
  onBeforeExport,
  onAfterExport,
}: ExportToExcelProps<T>) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = React.useCallback(async () => {
    try {
      setIsExporting(true);

      // 내보내기 전 콜백 실행
      if (onBeforeExport) {
        const shouldContinue = await onBeforeExport();
        if (!shouldContinue) {
          setIsExporting(false);
          return;
        }
      }

      // 데이터 검증
      if (!data || data.length === 0) {
        toast({
          variant: 'destructive',
          title: '내보내기 실패',
          description: '내보낼 데이터가 없습니다.',
        });
        setIsExporting(false);
        return;
      }

      // Excel 데이터 준비
      const excelData = data.map((row) => {
        const excelRow: Record<string, unknown> = {};
        columns.forEach((col) => {
          const rowData = row as Record<string, unknown>;
          const value = rowData[col.key as string];
          excelRow[col.header] = col.format ? col.format(value, row) : value;
        });
        return excelRow;
      });

      // 워크시트 생성
      const ws = utils.json_to_sheet(excelData);

      // 컬럼 너비 자동 조정
      const colWidths = columns.map((col) => {
        const headerLength = col.header.length;
        const maxDataLength = Math.max(
          ...excelData.map((row) => {
            const value = row[col.header];
            return value ? String(value).length : 0;
          })
        );
        return { wch: Math.max(headerLength, maxDataLength) + 2 };
      });
      ws['!cols'] = colWidths;

      // 워크북 생성 및 시트 추가
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, sheetName);

      // 파일 다운로드
      writeFile(wb, filename);

      toast({
        title: '내보내기 완료',
        description: `${filename} 파일이 다운로드되었습니다.`,
      });

      // 내보내기 후 콜백 실행
      if (onAfterExport) {
        onAfterExport();
      }
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        variant: 'destructive',
        title: '내보내기 실패',
        description: error instanceof Error ? error.message : '파일 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsExporting(false);
    }
  }, [data, columns, filename, sheetName, onBeforeExport, onAfterExport, toast]);

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || !data || data.length === 0}
      size={buttonSize}
      variant={buttonVariant}
      className={className}
    >
      <FileDown className="h-4 w-4" />
      {!iconOnly && <span className="ml-2">{buttonText}</span>}
    </Button>
  );
}
