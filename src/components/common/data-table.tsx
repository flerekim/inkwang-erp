'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type ExpandedState,
  type OnChangeFn,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// 정렬 가능한 헤더 컴포넌트
interface DataTableColumnHeaderProps {
  column: {
    getCanSort: () => boolean;
    toggleSorting: (desc?: boolean) => void;
    getIsSorted: () => false | 'asc' | 'desc';
  };
  title: string;
}

export function DataTableColumnHeader({
  column,
  title,
}: DataTableColumnHeaderProps) {
  if (!column.getCanSort()) {
    return <div>{title}</div>;
  }

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="-ml-3 h-8 data-[state=open]:bg-accent"
    >
      <span>{title}</span>
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  // Row Selection 관련
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  // 툴바 커스텀
  toolbar?: React.ReactNode;
  // Row 클릭 이벤트
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '검색...',
  pageSize = 10,
  enableRowSelection = false,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  toolbar,
  onRowClick,
  onRowDoubleClick,
}: DataTableProps<TData, TValue>) {
  // 테이블 상태
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  // Row Selection 상태 (외부 제어 또는 내부 제어)
  const rowSelection = externalRowSelection !== undefined ? externalRowSelection : internalRowSelection;
  const onRowSelectionChange =
    externalOnRowSelectionChange !== undefined ? externalOnRowSelectionChange : setInternalRowSelection;

  // 테이블 인스턴스 생성
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      expanded,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange,
    onExpandedChange: setExpanded,
    getSubRows: (row: TData) => {
      // TanStack Table의 서브행 기능: row에 children 속성이 있으면 반환
      return (row as TData & { children?: TData[] }).children;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* 검색 입력 및 툴바 */}
      {(searchKey || toolbar) && (
        <div className="flex items-center justify-between gap-2">
          {/* 검색 */}
          {searchKey && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={
                  (table.getColumn(searchKey)?.getFilterValue() as string) ?? globalFilter
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (searchKey) {
                    table.getColumn(searchKey)?.setFilterValue(value);
                  } else {
                    setGlobalFilter(value);
                  }
                }}
                className="pl-8"
              />
            </div>
          )}

          {/* 커스텀 툴바 (버튼 등) */}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-muted/90">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-muted/90">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-semibold"
                    style={{
                      width: `${header.getSize()}px`,
                      minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : undefined,
                      maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  onDoubleClick={() => onRowDoubleClick?.(row.original)}
                  className={onRowClick || onRowDoubleClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        width: `${cell.column.getSize()}px`,
                        minWidth: cell.column.columnDef.minSize ? `${cell.column.columnDef.minSize}px` : undefined,
                        maxWidth: cell.column.columnDef.maxSize ? `${cell.column.columnDef.maxSize}px` : undefined,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          전체 {table.getFilteredRowModel().rows.length}개 중{' '}
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}
          개 표시
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <div className="text-sm">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
