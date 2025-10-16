'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type ExpandedState,
  type ColumnSizingState,
  type OnChangeFn,
  type FilterFn,
  type SortingFn,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  useReactTable,
  sortingFns,
} from '@tanstack/react-table';
import { rankItem, compareItems, type RankingInfo } from '@tanstack/match-sorter-utils';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Loader2, ChevronsLeft, ChevronsRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useSkipper } from '@/hooks/use-skipper';

// FilterMeta 타입 (rankItem의 반환 타입)
interface FilterMeta {
  itemRank?: RankingInfo;
}

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

  // 컬럼 크기 조절
  enableColumnResizing?: boolean;
  columnResizeMode?: 'onChange' | 'onEnd';

  // 퍼지 검색 활성화
  enableFuzzyFilter?: boolean;

  // 페이지네이션 개선
  enablePageSizeSelection?: boolean;
  pageSizeOptions?: number[];
  enablePageJump?: boolean;

  // 로딩 및 에러 상태
  isLoading?: boolean;
  error?: Error | null;
  emptyMessage?: string;
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
  enableColumnResizing = false,
  columnResizeMode = 'onEnd',
  enableFuzzyFilter = false,
  enablePageSizeSelection = false,
  pageSizeOptions = [10, 20, 30, 50, 100],
  enablePageJump = false,
  isLoading = false,
  error = null,
  emptyMessage,
}: DataTableProps<TData, TValue>) {
  // 테이블 상태
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});

  // 페이지 리셋 방지 (TanStack Table 공식 패턴)
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  // Row Selection 상태 (외부 제어 또는 내부 제어)
  const rowSelection = externalRowSelection !== undefined ? externalRowSelection : internalRowSelection;
  const onRowSelectionChange =
    externalOnRowSelectionChange !== undefined ? externalOnRowSelectionChange : setInternalRowSelection;

  // 퍼지 필터 함수 (컴포넌트 내부에 정의하여 TData 타입 공유)
  const fuzzyFilter = React.useMemo<FilterFn<TData>>(
    () => (row, columnId, value, addMeta) => {
      const itemRank = rankItem(row.getValue(columnId), value as string);
      addMeta({ itemRank });
      return itemRank.passed;
    },
    []
  );

  // 퍼지 정렬 함수 (컴포넌트 내부에 정의하여 TData 타입 공유)
  const fuzzySort = React.useMemo<SortingFn<TData>>(
    () => (rowA, rowB, columnId) => {
      let dir = 0;
      if (rowA.columnFiltersMeta[columnId]) {
        const metaA = rowA.columnFiltersMeta[columnId] as FilterMeta;
        const metaB = rowB.columnFiltersMeta[columnId] as FilterMeta;
        // compareItems는 undefined를 허용하지 않으므로 체크 필요
        if (metaA?.itemRank && metaB?.itemRank) {
          dir = compareItems(metaA.itemRank, metaB.itemRank);
        }
      }
      return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir;
    },
    []
  );

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
      columnSizing,
    },
    enableRowSelection,
    enableColumnResizing,
    columnResizeMode,
    autoResetPageIndex, // 페이지 리셋 방지
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange,
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    getSubRows: (row: TData) => {
      // TanStack Table의 서브행 기능: row에 children 속성이 있으면 반환
      return (row as TData & { children?: TData[] }).children;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    // 퍼지 필터링
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    globalFilterFn: enableFuzzyFilter ? fuzzyFilter : undefined,
    sortingFns: {
      fuzzySort: fuzzySort,
    },
    // 메타 데이터: EditableCell에서 사용
    meta: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updateData: (_rowIndex: number, _columnId: string, _value: string) => {
        skipAutoResetPageIndex(); // 편집 중 페이지 유지
        // 실제 데이터 업데이트는 외부에서 처리 (EditableCell의 onUpdate 콜백)
      },
    },
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
                    className="font-semibold relative"
                    style={{
                      width: `${header.getSize()}px`,
                      minWidth: header.column.columnDef.minSize ? `${header.column.columnDef.minSize}px` : undefined,
                      maxWidth: header.column.columnDef.maxSize ? `${header.column.columnDef.maxSize}px` : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}

                    {/* 컬럼 리사이저 */}
                    {enableColumnResizing && header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={cn(
                          'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                          'hover:bg-primary/50 active:bg-primary',
                          header.column.getIsResizing() && 'bg-primary'
                        )}
                      />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>데이터를 불러오는 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="text-destructive">
                    <p className="font-semibold">⚠️ 오류가 발생했습니다</p>
                    <p className="text-sm mt-1">{error.message}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage || '데이터가 없습니다.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* 왼쪽: 데이터 개수 및 페이지 크기 선택 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>
            전체 {table.getFilteredRowModel().rows.length}개 중{' '}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
            개 표시
          </div>

          {/* 페이지 크기 선택 */}
          {enablePageSizeSelection && (
            <div className="flex items-center gap-2">
              <span>페이지당</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>개씩</span>
            </div>
          )}

          {/* Row Selection 피드백 */}
          {enableRowSelection && Object.keys(rowSelection).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {table.getFilteredSelectedRowModel().rows.length}개 선택됨
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.resetRowSelection()}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
                선택 해제
              </Button>
            </div>
          )}
        </div>

        {/* 오른쪽: 페이지 네비게이션 */}
        <div className="flex items-center gap-2">
          {/* 첫 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* 이전 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* 페이지 정보 및 직접 점프 */}
          {enablePageJump ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                min={1}
                max={table.getPageCount()}
                className="h-8 w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">/ {table.getPageCount()}</span>
            </div>
          ) : (
            <div className="text-sm min-w-[100px] text-center">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </div>
          )}

          {/* 다음 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* 마지막 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
