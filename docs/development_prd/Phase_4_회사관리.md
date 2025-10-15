# Phase 4: 관리자 모듈 - 회사관리

## 📋 개요
- **예상 기간**: 1.5주 (7-8일)
- **목표**: 회사, 부서, 직급, 은행계좌 관리 시스템 구현
- **결과물**: 4개의 하위 모듈 완성 (공통 컴포넌트 재사용)
- **참고 문서**: [공통 컴포넌트 가이드](./Common_Components_Guide.md) - 모든 하위 모듈에서 공통 컴포넌트 활용

## 🔑 핵심 개념
Phase 3에서 구현한 **공통 컴포넌트**를 모든 하위 모듈에서 재사용하여 일관된 UX 제공:
- **회사 관리**: `DataTable` + `EditableCell` + `DeleteConfirmDialog`
- **부서 관리**: `SortableTable` (드래그 앤 드롭 정렬)
- **직급 관리**: `SortableTable` (드래그 앤 드롭 정렬)
- **은행계좌 관리**: `DataTable` + `EditableCell`
- **전체 모듈**: `useKeyboardShortcuts` 훅으로 F5-F8 단축키 통일

---

## ✅ 체크리스트

### 1단계: 공통 컴포넌트 확인
- [ ] `DataTable` 컴포넌트 준비 완료 (Phase 3에서 구현)
- [ ] `EditableCell` 컴포넌트 준비 완료 (Phase 3에서 구현)
- [ ] `DeleteConfirmDialog` 컴포넌트 준비 완료 (Phase 3에서 구현)
- [ ] `SortableTable` 컴포넌트 준비 완료 (공통 컴포넌트 가이드 참고)
- [ ] `useKeyboardShortcuts` 훅 준비 완료 (Phase 3에서 구현)

### 2단계: 회사 정보 관리
- [ ] 회사 목록 테이블
- [ ] 인라인 편집 (회사명, 사업자등록번호, 정렬순서)
- [ ] 회사 추가/삭제
- [ ] 사업자등록번호 검증

### 3단계: 부서 관리
- [ ] 부서 목록 테이블
- [ ] 드래그 앤 드롭 정렬
- [ ] 부서 추가/수정/삭제
- [ ] 부서 사용 여부 확인

### 4단계: 직급 관리
- [ ] 직급 목록 테이블
- [ ] 드래그 앤 드롭 정렬
- [ ] 직급 추가/수정/삭제
- [ ] 직급 사용 여부 확인

### 5단계: 은행계좌 관리
- [ ] 계좌 목록 테이블
- [ ] 계좌 추가/수정/삭제
- [ ] 잔액 표시 (포맷팅)
- [ ] 회사별 필터링

### 6단계: 네비게이션 및 레이아웃
- [ ] 회사관리 서브 메뉴
- [ ] 탭 네비게이션
- [ ] 브레드크럼 표시
- [ ] 모든 하위 모듈에 단축키 적용 (F5-F8)

---

## 📚 상세 구현 가이드

### 1단계: 공통 컴포넌트 리팩토링

**`components/tables/data-table.tsx`** (제네릭 버전):
```typescript
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '검색...',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="space-y-4">
      {/* 검색 */}
      {searchKey && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="pl-10"
          />
        </div>
      )}

      {/* 테이블 */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                  className="group hover:bg-muted/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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
          전체 {table.getFilteredRowModel().rows.length}개
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

### 2단계: 회사 정보 관리

**`actions/companies.ts`**:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { companySchema } from '@/lib/validations';
import { getErrorMessage } from '@/lib/utils';
import type { CompanyInsert, CompanyUpdate } from '@/types';

export async function getCompanies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`조회 실패: ${error.message}`);
  return data;
}

export async function createCompany(data: CompanyInsert) {
  const supabase = await createClient();

  const validation = companySchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    const { error } = await supabase.from('companies').insert(data);
    if (error) return { error: `생성 실패: ${error.message}` };

    revalidatePath('/admin/company/companies');
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function updateCompany(id: string, data: Partial<CompanyUpdate>) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('companies')
      .update(data)
      .eq('id', id);

    if (error) return { error: `수정 실패: ${error.message}` };

    revalidatePath('/admin/company/companies');
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

export async function deleteCompany(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) return { error: `삭제 실패: ${error.message}` };

    revalidatePath('/admin/company/companies');
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
```

**`app/(dashboard)/admin/company/companies/page.tsx`**:
```typescript
import { getCompanies } from '@/actions/companies';
import { CompaniesTable } from './companies-table';
import { PageTransition } from '@/components/page-transition';
import { requireAdmin } from '@/lib/auth';

export default async function CompaniesPage() {
  await requireAdmin();
  const companies = await getCompanies();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">회사 정보 관리</h1>
          <p className="text-muted-foreground mt-2">
            회사 정보를 관리합니다
          </p>
        </div>
        <CompaniesTable data={companies} />
      </div>
    </PageTransition>
  );
}
```

---

### 3-4단계: 부서 및 직급 관리

부서와 직급은 거의 동일한 구조이므로 공통 컴포넌트를 재사용합니다.

**드래그 앤 드롭 라이브러리 설치**:
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**`components/tables/sortable-table.tsx`** (드래그 앤 드롭 지원):
```typescript
'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

function SortableRow({ id, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-12">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}

interface SortableTableProps<T extends { id: string; sort_order: number }> {
  data: T[];
  onReorder: (items: T[]) => Promise<void>;
  renderRow: (item: T) => React.ReactNode;
  headers: string[];
}

export function SortableTable<T extends { id: string; sort_order: number }>({
  data,
  onReorder,
  renderRow,
  headers,
}: SortableTableProps<T>) {
  const [items, setItems] = React.useState(data);

  React.useEffect(() => {
    setItems(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map(
        (item, index) => ({
          ...item,
          sort_order: index,
        })
      );

      setItems(newItems);
      await onReorder(newItems);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableRow key={item.id} id={item.id}>
                  {renderRow(item)}
                </SortableRow>
              ))}
            </SortableContext>
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}
```

---

### 5단계: 은행계좌 관리

**`actions/bank-accounts.ts`**:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { bankAccountSchema } from '@/lib/validations';
import type { BankAccountInsert, BankAccountUpdate } from '@/types';

export async function getBankAccounts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*, company:companies(id, name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`조회 실패: ${error.message}`);
  return data;
}

export async function createBankAccount(data: BankAccountInsert) {
  const supabase = await createClient();

  const validation = bankAccountSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    const { error } = await supabase.from('bank_accounts').insert({
      ...data,
      current_balance: data.initial_balance, // 초기 잔액 = 현재 잔액
    });

    if (error) return { error: `생성 실패: ${error.message}` };

    revalidatePath('/admin/company/bank-accounts');
    return { success: true };
  } catch (error) {
    return { error: String(error) };
  }
}

export async function updateBankAccount(
  id: string,
  data: Partial<BankAccountUpdate>
) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('bank_accounts')
      .update(data)
      .eq('id', id);

    if (error) return { error: `수정 실패: ${error.message}` };

    revalidatePath('/admin/company/bank-accounts');
    return { success: true };
  } catch (error) {
    return { error: String(error) };
  }
}

export async function deleteBankAccount(id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', id);

    if (error) return { error: `삭제 실패: ${error.message}` };

    revalidatePath('/admin/company/bank-accounts');
    return { success: true };
  } catch (error) {
    return { error: String(error) };
  }
}
```

**금액 포맷팅 사용**:
```typescript
import { formatCurrency } from '@/lib/utils';

// 테이블에서 사용
<TableCell>{formatCurrency(account.current_balance)}</TableCell>
```

---

### 6단계: 네비게이션 및 레이아웃

**`app/(dashboard)/admin/company/layout.tsx`**:
```typescript
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: '회사 정보', href: '/admin/company/companies' },
  { label: '부서 관리', href: '/admin/company/departments' },
  { label: '직급 관리', href: '/admin/company/positions' },
  { label: '은행계좌', href: '/admin/company/bank-accounts' },
];

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="border-b">
        <nav className="flex space-x-2">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent hover:border-primary transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
```

---

### 7단계: 엑셀 유사 인터랙션 적용

**모든 하위 모듈(회사, 부서, 직급, 은행계좌)에 Phase 3에서 구현한 기능 재사용:**

#### 1. 더블클릭 인라인 편집
Phase 3의 `EditableCell` 컴포넌트를 모든 테이블에 적용하여 셀 더블클릭 시 즉시 편집 가능하도록 구현

#### 2. 전역 단축키
Phase 3의 `useKeyboardShortcuts` 훅을 각 페이지에서 재사용:
```typescript
// 회사관리, 부서관리, 직급관리, 은행계좌 페이지 모두 동일하게 적용
useKeyboardShortcuts({
  onRefresh: () => router.refresh(),
  onAddRow: () => setIsAddingRow(true),
  onDeleteRow: handleDeleteSelected,
  onPrint: () => window.print(),
  enabled: true,
});
```

#### 3. 키보드 네비게이션
- **Tab/Shift+Tab**: 셀 간 이동 (편집 모드에서)
- **Enter**: 편집 완료 및 저장
- **Escape**: 편집 취소 및 복구

#### 4. 드래그 앤 드롭 정렬과 단축키 통합
부서 및 직급 관리에서 드래그 앤 드롭으로 `sort_order` 변경 시:
- 변경사항을 즉시 DB에 반영 (낙관적 업데이트)
- F5로 정렬 순서 새로고침
- Ctrl+Z로 정렬 되돌리기 (선택사항)

#### 5. 단축키 도움말
모든 페이지 우측 상단에 `KeyboardShortcutsHelp` 컴포넌트 배치

---

## 🧪 테스트 시나리오

### 기능 테스트
1. ✅ 회사 정보 CRUD
2. ✅ 부서 CRUD 및 드래그 앤 드롭 정렬
3. ✅ 직급 CRUD 및 드래그 앤 드롭 정렬
4. ✅ 은행계좌 CRUD 및 금액 포맷팅
5. ✅ 공통 컴포넌트 재사용 확인

### UX 테스트
1. ✅ 탭 네비게이션
2. ✅ 드래그 앤 드롭 부드러운 애니메이션
3. ✅ 인라인 편집 반응성
4. ✅ 에러 처리 및 토스트

---

## 🎉 Phase 4 완료 체크리스트

- [ ] ✅ 공통 컴포넌트 리팩토링 완료
- [ ] ✅ 회사 정보 관리 구현
- [ ] ✅ 부서 관리 구현 (드래그 앤 드롭 포함)
- [ ] ✅ 직급 관리 구현 (드래그 앤 드롭 포함)
- [ ] ✅ 은행계좌 관리 구현
- [ ] ✅ 탭 네비게이션 구현
- [ ] ✅ 모든 기능 테스트 완료

---

**작성일**: 2025년 9월 30일
**Phase**: 4/6
**다음 Phase**: [Phase_5_UI_UX_PWA.md](./Phase_5_UI_UX_PWA.md)