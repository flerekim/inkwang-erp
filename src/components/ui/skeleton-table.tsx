/**
 * SkeletonTable 컴포넌트
 * @description 데이터 로딩 중 표시할 스켈레톤 테이블
 * @note Tailwind CSS v4 및 shadcn/ui Skeleton 사용
 */

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SkeletonTableProps {
  /** 표시할 행 수 (기본값: 5) */
  rows?: number;
  /** 표시할 열 수 (기본값: 4) */
  columns?: number;
}

/**
 * 로딩 상태를 나타내는 스켈레톤 테이블 컴포넌트
 */
export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
