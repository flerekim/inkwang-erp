'use client';

import * as React from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Printer, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface PrintColumn<T = any> {
  /** 데이터 필드명 */
  key: keyof T | string;
  /** 테이블 헤더에 표시될 이름 */
  header: string;
  /** 값을 포맷팅하는 함수 (옵션) */
  format?: (value: unknown, row: T) => React.ReactNode;
  /** 컬럼 너비 (옵션) */
  width?: string;
  /** 텍스트 정렬 (옵션) */
  align?: 'left' | 'center' | 'right';
}

export interface PrintTableProps<T = any> {
  /** 인쇄할 데이터 배열 */
  data: T[];
  /** 테이블 컬럼 정의 */
  columns: PrintColumn<T>[];
  /** 문서 제목 (페이지 상단에 표시) */
  title?: string;
  /** 부제목 또는 설명 */
  subtitle?: string;
  /** 버튼 텍스트 (기본값: '인쇄') */
  buttonText?: string;
  /** 버튼 크기 */
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  /** 버튼 variant */
  buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** 버튼 className */
  className?: string;
  /** 아이콘만 표시할지 여부 */
  iconOnly?: boolean;
  /** 인쇄 전 콜백 */
  onBeforePrint?: () => void;
  /** 인쇄 후 콜백 */
  onAfterPrint?: () => void;
  /** 추가 헤더 컨텐츠 (옵션) */
  headerContent?: React.ReactNode;
  /** 추가 푸터 컨텐츠 (옵션) */
  footerContent?: React.ReactNode;
}

/**
 * 테이블 인쇄 공통 컴포넌트
 *
 * @example
 * ```tsx
 * const columns: PrintColumn<User>[] = [
 *   { key: 'name', header: '이름', width: '200px' },
 *   { key: 'email', header: '이메일', width: '250px' },
 *   {
 *     key: 'role',
 *     header: '권한',
 *     format: (value) => value === 'admin' ? '관리자' : '사용자',
 *     align: 'center'
 *   },
 * ];
 *
 * <PrintTable
 *   data={users}
 *   columns={columns}
 *   title="사원 목록"
 *   subtitle="2025년 1월 기준"
 * />
 * ```
 */
export function PrintTable<T = any>({
  data,
  columns,
  title,
  subtitle,
  buttonText = '인쇄',
  buttonSize = 'sm',
  buttonVariant = 'outline',
  className,
  iconOnly = false,
  onBeforePrint,
  onAfterPrint,
  headerContent,
  footerContent,
}: PrintTableProps<T>) {
  const { toast } = useToast();
  const printRef = React.useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait');
  const [printTimestamp, setPrintTimestamp] = React.useState<string>('');

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: title || 'print',
    onBeforePrint: async () => {
      if (onBeforePrint) {
        onBeforePrint();
      }
    },
    onAfterPrint: () => {
      if (onAfterPrint) {
        onAfterPrint();
      }
      // 인쇄 후 알림은 제거 (사용자가 이미 인쇄 대화상자를 통해 작업을 완료했으므로)
    },
    onPrintError: (error) => {
      console.error('Print error:', error);
      toast({
        variant: 'destructive',
        title: '인쇄 실패',
        description: '인쇄 중 오류가 발생했습니다.',
      });
    },
  });

  // 세로 인쇄
  const handlePortraitPrint = () => {
    setOrientation('portrait');
    setPrintTimestamp(new Date().toLocaleString('ko-KR'));
    setTimeout(() => handlePrint(), 100);
  };

  // 가로 인쇄
  const handleLandscapePrint = () => {
    setOrientation('landscape');
    setPrintTimestamp(new Date().toLocaleString('ko-KR'));
    setTimeout(() => handlePrint(), 100);
  };

  // 데이터 검증
  const canPrint = data && data.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={!canPrint}
            size={buttonSize}
            variant={buttonVariant}
            className={className}
          >
            <Printer className="h-4 w-4" />
            {!iconOnly && <span className="ml-2">{buttonText}</span>}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handlePortraitPrint}>
            <Printer className="mr-2 h-4 w-4" />
            세로로 인쇄
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLandscapePrint}>
            <Printer className="mr-2 h-4 w-4" />
            가로로 인쇄
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 인쇄용 컨텐츠 (화면에 표시되지 않음) */}
      <div className="absolute -left-[9999px] opacity-0 pointer-events-none">
        <div ref={printRef}>
          <style>
            {`
              @media print {
                @page {
                  size: A4 ${orientation === 'landscape' ? 'landscape' : 'portrait'};
                  margin: 20mm;
                }

                body {
                  font-family: 'Malgun Gothic', '맑은 고딕', sans-serif;
                  color: #000;
                  background: #fff;
                }

                .print-container {
                  width: 100%;
                }

                .print-header {
                  margin-bottom: 20px;
                  text-align: center;
                }

                .print-title {
                  font-size: 24px;
                  font-weight: bold;
                  margin-bottom: 8px;
                }

                .print-subtitle {
                  font-size: 14px;
                  color: #666;
                  margin-bottom: 16px;
                }

                .print-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
                }

                .print-table th,
                .print-table td {
                  border: 1px solid #ddd;
                  padding: 8px 12px;
                  font-size: 12px;
                }

                .print-table th {
                  background-color: #f5f5f5;
                  font-weight: bold;
                  text-align: left;
                }

                .print-footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #ddd;
                  font-size: 10px;
                  color: #666;
                  text-align: center;
                }

                /* 페이지 나누기 방지 */
                .print-table tr {
                  page-break-inside: avoid;
                }
              }
            `}
          </style>

          <div className="print-container">
            {/* 헤더 */}
            <div className="print-header">
              {title && <div className="print-title">{title}</div>}
              {subtitle && <div className="print-subtitle">{subtitle}</div>}
              {headerContent && <div>{headerContent}</div>}
            </div>

            {/* 테이블 */}
            <table className="print-table">
              <thead>
                <tr>
                  {columns.map((col, index) => (
                    <th
                      key={index}
                      style={{
                        width: col.width,
                        textAlign: col.align || 'left',
                      }}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col, colIndex) => {
                      const rowData = row as Record<string, unknown>;
                      const value = rowData[col.key as string];
                      const formattedValue = col.format ? col.format(value, row) : (value as React.ReactNode);

                      return (
                        <td
                          key={colIndex}
                          style={{
                            textAlign: col.align || 'left',
                          }}
                        >
                          {formattedValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 푸터 */}
            {footerContent && <div className="print-footer">{footerContent}</div>}

            {/* 기본 푸터 (날짜) */}
            {!footerContent && printTimestamp && (
              <div className="print-footer">
                인쇄일시: {printTimestamp}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
