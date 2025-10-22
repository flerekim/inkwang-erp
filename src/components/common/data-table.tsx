'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
  type ExpandedState,
  type ColumnSizingState,
  type ColumnPinningState,
  type OnChangeFn,
  type FilterFn,
  type SortingFn,
  type Column,
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
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, ChevronsLeft, ChevronsRight, X, Settings2 } from 'lucide-react';

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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Column Pinning 스타일 헬퍼 (TanStack Table 공식 패턴)
function getCommonPinningStyles<TData>(column: Column<TData>): React.CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeftPinnedColumn = isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinnedColumn = isPinned === 'right' && column.getIsFirstColumn('right');

  return {
    position: isPinned ? 'sticky' : 'relative',
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    opacity: isPinned ? 0.95 : 1,
    zIndex: isPinned ? 1 : 0,
    // 고정된 컬럼 경계에 그림자 효과
    boxShadow: isLastLeftPinnedColumn
      ? '-4px 0 4px -4px rgba(0, 0, 0, 0.1) inset'
      : isFirstRightPinnedColumn
      ? '4px 0 4px -4px rgba(0, 0, 0, 0.1) inset'
      : undefined,
  };
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
    return <div className="font-medium">{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="
        -ml-3 h-8 group
        data-[state=open]:bg-accent
        hover:bg-gradient-to-r hover:from-muted/50 hover:to-transparent
        transition-all duration-200
      "
    >
      <span className="font-medium">{title}</span>
      {sorted === 'asc' ? (
        <ArrowUp className="
          ml-2 h-4 w-4
          text-primary
          animate-in slide-in-from-bottom-1 duration-300
          group-hover:translate-y-[-2px]
          transition-transform
        " />
      ) : sorted === 'desc' ? (
        <ArrowDown className="
          ml-2 h-4 w-4
          text-primary
          animate-in slide-in-from-top-1 duration-300
          group-hover:translate-y-[2px]
          transition-transform
        " />
      ) : (
        <ArrowUpDown className="
          ml-2 h-4 w-4 opacity-50
          group-hover:opacity-100
          group-hover:scale-110
          transition-all duration-200
        " />
      )}
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
  columnResizeDirection?: 'ltr' | 'rtl';

  // 컬럼 고정 (Pinning)
  enableColumnPinning?: boolean;
  columnPinning?: ColumnPinningState;
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>;

  // 컬럼 가시성 (Visibility)
  enableColumnVisibility?: boolean;

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

  // Row 클래스명 커스터마이징
  getRowClassName?: (row: TData) => string;
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
  columnResizeMode = 'onChange',
  columnResizeDirection = 'ltr',
  enableColumnPinning = false,
  columnPinning: externalColumnPinning,
  onColumnPinningChange: externalOnColumnPinningChange,
  enableColumnVisibility = false,
  enableFuzzyFilter = false,
  enablePageSizeSelection = false,
  pageSizeOptions = [10, 20, 30, 50, 100],
  enablePageJump = false,
  isLoading = false,
  error = null,
  emptyMessage,
  getRowClassName,
}: DataTableProps<TData, TValue>) {
  // 테이블 상태
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [internalColumnPinning, setInternalColumnPinning] = React.useState<ColumnPinningState>({});

  // 페이지 리셋 방지 (TanStack Table 공식 패턴)
  const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

  // Row Selection 상태 (외부 제어 또는 내부 제어)
  const rowSelection = externalRowSelection !== undefined ? externalRowSelection : internalRowSelection;
  const onRowSelectionChange =
    externalOnRowSelectionChange !== undefined ? externalOnRowSelectionChange : setInternalRowSelection;

  // Column Pinning 상태 (외부 제어 또는 내부 제어)
  const columnPinning = externalColumnPinning !== undefined ? externalColumnPinning : internalColumnPinning;
  const onColumnPinningChange =
    externalOnColumnPinningChange !== undefined ? externalOnColumnPinningChange : setInternalColumnPinning;

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
      columnPinning,
    },
    enableRowSelection,
    enableSubRowSelection: true,  // 부모 선택 시 자식도 자동 선택
    enableColumnResizing,
    columnResizeMode,
    columnResizeDirection,
    enableColumnPinning,
    autoResetPageIndex, // 페이지 리셋 방지
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange,
    onExpandedChange: setExpanded,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange,
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
      {(searchKey || toolbar || enableColumnVisibility) && (
        <div className="flex items-center justify-between gap-2">
          {/* 검색 */}
          {searchKey && (
            <div className="relative flex-1 max-w-sm group">
              <Search className="
                absolute left-2 top-2.5 h-4 w-4 text-muted-foreground
                group-focus-within:text-primary
                group-focus-within:scale-110
                transition-all duration-200
              " />
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
                className="
                  pl-8
                  focus-visible:ring-2 focus-visible:ring-primary/20
                  focus-visible:border-primary
                  focus-visible:shadow-lg focus-visible:shadow-primary/10
                  transition-all duration-200
                "
              />
            </div>
          )}

          {/* 커스텀 툴바 (버튼 등) + 컬럼 가시성 */}
          <div className="flex items-center gap-2">
            {toolbar}
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto h-8">
                    <Settings2 className="mr-2 h-4 w-4" />
                    컬럼 설정
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {table
                    .getAllColumns()
                    .filter(
                      (column) =>
                        typeof column.accessorFn !== 'undefined' && column.getCanHide()
                    )
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-md border overflow-auto">
        <Table
          className="w-full"
          style={{
            width: '100%',
            tableLayout: 'fixed',
          }}
        >
          {/* 고성능 컬럼 크기 조절: colgroup 사용 (TanStack Table 공식 패턴) */}
          {enableColumnResizing && (
            <colgroup>
              {table.getAllLeafColumns().map((column) => (
                <col
                  key={column.id}
                  style={{
                    width: column.getSize(),
                    minWidth: column.columnDef.minSize,
                    maxWidth: column.columnDef.maxSize,
                  }}
                />
              ))}
            </colgroup>
          )}
          <TableHeader className="
            bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5
            backdrop-blur-xl backdrop-saturate-150
            border-b-2 border-primary/20
            relative
            before:absolute before:inset-0
            before:bg-gradient-to-b before:from-white/20 before:to-transparent
            before:rounded-t-lg before:pointer-events-none
            transition-all duration-300
          "
          style={{ boxShadow: 'var(--glass-shadow)' }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-primary/5 transition-colors duration-200">
                {headerGroup.headers.map((header) => {
                  const pinningStyles = enableColumnPinning ? getCommonPinningStyles(header.column) : {};

                  const isResizing = header.column.getIsResizing();

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'font-semibold relative transition-colors',
                        isResizing && 'bg-primary/5 border-x-2 border-primary'
                      )}
                      style={{
                        // colgroup이 width를 제어하므로 여기서는 pinning 스타일만 적용
                        ...pinningStyles,
                      }}
                    >

                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}

                      {/* 컬럼 리사이저 (TanStack Table 공식 패턴) */}
                      {enableColumnResizing && header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className={cn(
                            'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none',
                            'transition-all duration-200',
                            'hover:w-2',
                            'hover:bg-gradient-to-b hover:from-primary/0 hover:via-primary/80 hover:to-primary/0',
                            'hover:shadow-[0_0_8px_rgba(59,130,246,0.6)]',
                            'active:w-2.5 active:bg-primary',
                            header.column.getIsResizing() && [
                              'w-2.5',
                              'bg-gradient-to-b from-primary/0 via-primary to-primary/0',
                              'shadow-[0_0_12px_rgba(59,130,246,0.8)]',
                              'animate-pulse',
                            ]
                          )}
                          style={{
                            backgroundSize: header.column.getIsResizing() ? '100% 200%' : undefined,
                            animation: header.column.getIsResizing()
                              ? 'gradient-slide 2s ease infinite'
                              : undefined,
                          }}
                          title="드래그: 크기 조절 | 더블클릭: 자동 크기"
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton UI로 부드러운 로딩 경험
              Array.from({ length: pageSize }).map((_, idx) => (
                <TableRow key={idx}>
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx}>
                      <div className="relative h-4 w-full rounded-md bg-muted/50 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
                  className={cn(
                    'transition-colors',
                    row.getIsSelected() && 'bg-primary/5 border-l-4 border-primary',
                    'hover:bg-muted/50 hover:shadow-sm',
                    (onRowClick || onRowDoubleClick) && 'cursor-pointer',
                    getRowClassName?.(row.original)
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const pinningStyles = enableColumnPinning ? getCommonPinningStyles(cell.column) : {};

                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          // colgroup이 width를 제어하므로 여기서는 pinning 스타일만 적용
                          ...pinningStyles,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16"
                >
                  <div className="
                    flex flex-col items-center justify-center gap-6
                    text-center
                  ">
                    {/* 애니메이션 아이콘 */}
                    <div className="
                      relative
                      w-24 h-24
                      rounded-full
                      bg-gradient-to-br from-primary/10 via-primary/5 to-transparent
                      flex items-center justify-center
                      animate-bounce-gentle
                    ">
                      <div className="
                        absolute inset-0
                        rounded-full
                        bg-gradient-to-r from-primary/20 to-primary/10
                        animate-pulse
                      " />
                      <span className="
                        text-5xl
                        relative z-10
                        filter drop-shadow-lg
                      ">
                        📊
                      </span>
                    </div>

                    {/* 메시지 */}
                    <div className="space-y-2">
                      <h3 className="
                        text-lg font-semibold
                        bg-gradient-to-r from-foreground to-foreground/70
                        bg-clip-text text-transparent
                      ">
                        {emptyMessage || '데이터가 없습니다'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        아직 등록된 데이터가 없어요. 첫 번째 데이터를 추가해보세요!
                      </p>
                    </div>

                    {/* CTA 버튼 (toolbar에 추가 버튼이 있는 경우만 표시) */}
                    {toolbar && (
                      <div className="
                        group
                        px-6 py-3
                        rounded-xl
                        bg-gradient-to-r from-primary/10 to-primary/5
                        border border-primary/20
                        hover:from-primary/20 hover:to-primary/10
                        hover:border-primary/30
                        hover:shadow-lg hover:shadow-primary/20
                        hover:-translate-y-0.5
                        active:translate-y-0
                        transition-all duration-200
                        cursor-default
                      ">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="
                            group-hover:text-primary
                            transition-colors duration-200
                          ">
                            👆
                          </span>
                          <span className="
                            group-hover:text-primary
                            transition-colors duration-200
                          ">
                            상단의 &apos;추가&apos; 버튼을 클릭하세요
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      <div className="
        flex flex-col sm:flex-row items-center justify-between gap-4
        p-4 rounded-xl
        bg-gradient-to-r from-background/80 via-background/60 to-background/80
        backdrop-blur-md
        border border-border/50
        shadow-lg shadow-black/5
      ">
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
            className="
              hover:bg-primary/10
              hover:border-primary/50
              hover:shadow-md hover:shadow-primary/20
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* 이전 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="
              hover:bg-primary/10
              hover:border-primary/50
              hover:shadow-md hover:shadow-primary/20
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
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
            className="
              hover:bg-primary/10
              hover:border-primary/50
              hover:shadow-md hover:shadow-primary/20
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* 마지막 페이지 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            className="
              hover:bg-primary/10
              hover:border-primary/50
              hover:shadow-md hover:shadow-primary/20
              hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:translate-y-0
            "
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
