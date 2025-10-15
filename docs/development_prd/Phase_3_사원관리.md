# Phase 3: 관리자 모듈 - 사원관리

## 📋 개요
- **예상 기간**: 1.5주 (7-8일)
- **목표**: 인라인 편집 방식의 사원관리 시스템 구현
- **결과물**: 완전히 작동하는 사원 CRUD 기능 + TanStack Table 기반 인라인 편집
- **참고 문서**: [공통 컴포넌트 가이드](./Common_Components_Guide.md) - 재사용 가능한 컴포넌트 활용

## 🔑 핵심 개념
이 단계에서는 **공통 컴포넌트**를 최대한 활용하여 개발 속도를 높이고 코드 중복을 최소화합니다:
- `DataTable` 컴포넌트로 테이블 구조 재사용
- `EditableCell` 컴포넌트로 인라인 편집 구현
- `DeleteConfirmDialog` 컴포넌트로 삭제 확인
- `useKeyboardShortcuts` 훅으로 전역 단축키 구현
- `createCrudActions` 팩토리로 Server Actions 생성

---

## ✅ 체크리스트

### 1단계: Server Actions 구현
- [ ] 사원 목록 조회 Action
- [ ] 사원 생성 Action (Admin만)
- [ ] 사원 수정 Action (Admin + 본인)
- [ ] 사원 삭제 Action (Admin만)
- [ ] 에러 처리 및 검증

### 2단계: 데이터 테이블 컴포넌트
- [ ] TanStack Table 기본 설정
- [ ] 컬럼 정의
- [ ] 정렬 및 필터링
- [ ] 페이지네이션
- [ ] 검색 기능

### 3단계: 인라인 편집 구현
- [ ] 더블클릭으로 편집 모드 활성화
- [ ] 편집 가능한 셀 컴포넌트
- [ ] 실시간 유효성 검사
- [ ] 낙관적 업데이트 (Optimistic Update)
- [ ] 에러 복구
- [ ] 저장 상태 표시
- [ ] Tab/Shift+Tab으로 셀 간 이동

### 4단계: 사원 추가 UI
- [ ] 신규 사원 추가 버튼
- [ ] 인라인 추가 폼
- [ ] Supabase Auth 계정 자동 생성
- [ ] 사번 자동 생성

### 5단계: 권한 기반 기능 제한
- [ ] Admin: 모든 기능 가능
- [ ] User: 삭제 기능 제한
- [ ] UI 레벨 권한 제어
- [ ] Server Action 레벨 권한 검증

### 6단계: UX 향상
- [ ] 로딩 스켈레톤
- [ ] 에러 토스트
- [ ] 성공 피드백
- [ ] 키보드 단축키 (Enter, Esc, Tab)

### 7단계: 전역 단축키 구현
- [ ] F5: 데이터 새로고침
- [ ] F6: 새 행 추가
- [ ] F7: 선택한 행 삭제
- [ ] F8: 테이블 인쇄
- [ ] 단축키 도움말 표시

---

## 📚 상세 구현 가이드

### 1단계: Server Actions 구현

**`actions/employees.ts`**:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { userSchema } from '@/lib/validations';
import { getErrorMessage } from '@/lib/utils';
import type { UserInsert, UserUpdate } from '@/types';

// 사원 목록 조회
export async function getEmployees() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      *,
      department:departments(id, name),
      position:positions(id, name),
      company:companies(id, name)
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`사원 목록 조회 실패: ${error.message}`);
  }

  return data;
}

// 사원 생성 (관리자 전용)
export async function createEmployee(data: UserInsert) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  // 유효성 검사
  const validation = userSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    // 1. Supabase Auth에 사용자 생성
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: data.email,
        password: 'temporary123!', // 임시 비밀번호
        email_confirm: true,
        user_metadata: {
          name: data.name,
          department_id: data.department_id,
          position_id: data.position_id,
          role: data.role,
          hire_date: data.hire_date,
        },
      });

    if (authError) {
      return { error: `계정 생성 실패: ${authError.message}` };
    }

    // 2. users 테이블은 트리거로 자동 생성됨

    revalidatePath('/admin/employees');
    return { success: true, data: authData.user };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

// 사원 수정
export async function updateEmployee(id: string, data: Partial<UserUpdate>) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Admin이거나 본인만 수정 가능
  if (currentUser?.role !== 'admin' && user.id !== id) {
    return { error: '권한이 없습니다' };
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { error: `수정 실패: ${error.message}` };
    }

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}

// 사원 삭제 (관리자 전용)
export async function deleteEmployee(id: string) {
  const supabase = await createClient();

  // 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: '인증이 필요합니다' };
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { error: '권한이 없습니다' };
  }

  try {
    // Auth 사용자 삭제 (users 테이블은 CASCADE로 자동 삭제)
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      return { error: `삭제 실패: ${error.message}` };
    }

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error) };
  }
}
```

---

### 2단계: 데이터 테이블 컴포넌트

**필수 shadcn 컴포넌트 추가 설치**:
```bash
pnpm dlx shadcn@latest add data-table
```

**`app/(dashboard)/admin/employees/page.tsx`**:
```typescript
import { getEmployees } from '@/actions/employees';
import { EmployeesTable } from './employees-table';
import { PageTransition } from '@/components/page-transition';
import { requireAdmin } from '@/lib/auth';

export default async function EmployeesPage() {
  // 관리자 권한 확인
  const currentUser = await requireAdmin();

  // 사원 목록 조회
  const employees = await getEmployees();

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">사원관리</h1>
          <p className="text-muted-foreground mt-2">
            전체 사원 정보를 관리합니다
          </p>
        </div>

        <EmployeesTable data={employees} currentUser={currentUser} />
      </div>
    </PageTransition>
  );
}
```

**`app/(dashboard)/admin/employees/employees-table.tsx`** (클라이언트 컴포넌트):
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
  type VisibilityState,
} from '@tanstack/react-table';
import { Plus, Search } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { EditableCell } from './editable-cell';
import { EmployeeActions } from './employee-actions';
import type { UserWithDetails, User } from '@/types';

interface EmployeesTableProps {
  data: UserWithDetails[];
  currentUser: User;
}

export function EmployeesTable({ data, currentUser }: EmployeesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // 컬럼 정의
  const columns: ColumnDef<UserWithDetails>[] = [
    {
      accessorKey: 'employee_number',
      header: '사번',
      cell: ({ row }) => (
        <span className="font-mono font-semibold">
          {row.getValue('employee_number')}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => (
        <EditableCell
          id={row.original.id}
          field="name"
          value={row.getValue('name')}
          type="text"
        />
      ),
    },
    {
      accessorKey: 'email',
      header: '이메일',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue('email')}
        </span>
      ),
    },
    {
      accessorKey: 'department',
      header: '부서',
      cell: ({ row }) => {
        const dept = row.original.department;
        return <span>{dept?.name || '-'}</span>;
      },
    },
    {
      accessorKey: 'position',
      header: '직급',
      cell: ({ row }) => {
        const pos = row.original.position;
        return <span>{pos?.name || '-'}</span>;
      },
    },
    {
      accessorKey: 'role',
      header: '권한',
      cell: ({ row }) => {
        const role = row.getValue('role') as string;
        return (
          <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
            {role === 'admin' ? '관리자' : '사용자'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'employment_status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('employment_status') as string;
        return (
          <Badge variant={status === 'active' ? 'default' : 'outline'}>
            {status === 'active' ? '재직' : '퇴사'}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <EmployeeActions employee={row.original} currentUser={currentUser} />
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      {/* 툴바 */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일 검색..."
              value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn('name')?.setFilterValue(event.target.value)
              }
              className="pl-10"
            />
          </div>
        </div>

        {currentUser.role === 'admin' && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            신규 사원 추가
          </Button>
        )}
      </div>

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
                  data-state={row.getIsSelected() && 'selected'}
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
          전체 {table.getFilteredRowModel().rows.length}명
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

### 3단계: 인라인 편집 구현

**`app/(dashboard)/admin/employees/editable-cell.tsx`**:
```typescript
'use client';

import * as React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateEmployee } from '@/actions/employees';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  id: string;
  field: string;
  value: string;
  type?: 'text' | 'email' | 'date';
  onTabNext?: () => void;
  onTabPrev?: () => void;
}

export function EditableCell({
  id,
  field,
  value,
  type = 'text',
  onTabNext,
  onTabPrev,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 더블클릭으로 편집 모드 활성화
  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(value);
    // 다음 렌더링 사이클에 포커스
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  // 저장
  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    // 낙관적 업데이트: UI 먼저 업데이트
    const result = await updateEmployee(id, { [field]: editValue });

    setIsLoading(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: '수정 실패',
        description: result.error,
      });
      setEditValue(value); // 원래 값으로 복구
    } else {
      toast({
        title: '수정 완료',
        description: '정보가 성공적으로 수정되었습니다.',
      });
    }

    setIsEditing(false);
  };

  // 취소
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  // 키보드 이벤트 (Enter, Escape, Tab)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      if (e.shiftKey) {
        onTabPrev?.(); // Shift+Tab: 이전 셀
      } else {
        onTabNext?.(); // Tab: 다음 셀
      }
    }
  };

  // 외부 값 변경 시 동기화
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave} // 포커스 아웃 시 자동 저장
          disabled={isLoading}
          className="h-8 w-full min-w-[120px] border-primary"
        />
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 text-green-600" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        'cursor-pointer px-2 py-1 rounded hover:bg-accent transition-colors min-h-[32px] flex items-center',
        'group-hover:ring-1 group-hover:ring-primary/20',
        'select-none' // 더블클릭 시 텍스트 선택 방지
      )}
      title="더블클릭하여 편집"
    >
      {value || '-'}
    </div>
  );
}
```

**`app/(dashboard)/admin/employees/employee-actions.tsx`**:
```typescript
'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteEmployee } from '@/actions/employees';
import { useToast } from '@/hooks/use-toast';
import type { UserWithDetails, User } from '@/types';
import * as React from 'react';

interface EmployeeActionsProps {
  employee: UserWithDetails;
  currentUser: User;
}

export function EmployeeActions({
  employee,
  currentUser,
}: EmployeeActionsProps) {
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  // Admin만 삭제 가능
  const canDelete = currentUser.role === 'admin';

  const handleDelete = async () => {
    setIsDeleting(true);

    const result = await deleteEmployee(employee.id);

    setIsDeleting(false);
    setShowDeleteAlert(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: result.error,
      });
    } else {
      toast({
        title: '삭제 완료',
        description: '사원 정보가 삭제되었습니다.',
      });
    }
  };

  if (!canDelete) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{employee.name}</strong> 사원을 정말 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### 7단계: 전역 단축키 구현

**`hooks/use-keyboard-shortcuts.ts`** (전역 단축키 커스텀 훅):
```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface KeyboardShortcutsOptions {
  onRefresh?: () => void;
  onAddRow?: () => void;
  onDeleteRow?: () => void;
  onPrint?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onRefresh,
  onAddRow,
  onDeleteRow,
  onPrint,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F5: 새로고침
      if (e.key === 'F5') {
        e.preventDefault();
        if (onRefresh) {
          onRefresh();
          toast({
            title: '새로고침',
            description: '데이터를 새로고침했습니다.',
          });
        }
      }

      // F6: 행 추가
      if (e.key === 'F6') {
        e.preventDefault();
        if (onAddRow) {
          onAddRow();
          toast({
            title: '행 추가',
            description: '새로운 행을 추가합니다.',
          });
        }
      }

      // F7: 선택행 삭제
      if (e.key === 'F7') {
        e.preventDefault();
        if (onDeleteRow) {
          onDeleteRow();
        }
      }

      // F8: 인쇄
      if (e.key === 'F8') {
        e.preventDefault();
        if (onPrint) {
          onPrint();
        } else {
          window.print();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onRefresh, onAddRow, onDeleteRow, onPrint, toast]);
}
```

**`app/(dashboard)/admin/employees/page.tsx`** (전역 단축키 사용):
```typescript
'use client';

import { useState, useCallback } from 'react';
import { getEmployees } from '@/actions/employees';
import { EmployeesTable } from './employees-table';
import { PageTransition } from '@/components/page-transition';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter } from 'next/navigation';

export default function EmployeesPage() {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isAddingRow, setIsAddingRow] = useState(false);

  // F5: 새로고침
  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // F6: 행 추가
  const handleAddRow = useCallback(() => {
    setIsAddingRow(true);
  }, []);

  // F7: 선택행 삭제
  const handleDeleteRow = useCallback(() => {
    if (selectedRows.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택된 행이 없습니다',
        description: '삭제할 행을 먼저 선택해주세요.',
      });
      return;
    }
    // 삭제 확인 다이얼로그 표시
    // ...
  }, [selectedRows]);

  // F8: 인쇄
  const handlePrint = useCallback(() => {
    // 인쇄 미리보기 모달 열기 또는 window.print()
    window.print();
  }, []);

  // 전역 단축키 활성화
  useKeyboardShortcuts({
    onRefresh: handleRefresh,
    onAddRow: handleAddRow,
    onDeleteRow: handleDeleteRow,
    onPrint: handlePrint,
    enabled: true,
  });

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">사원관리</h1>
            <p className="text-muted-foreground mt-2">
              전체 사원 정보를 관리합니다
            </p>
          </div>

          {/* 단축키 도움말 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div><kbd className="px-2 py-1 bg-muted rounded">F5</kbd> 새로고침</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">F6</kbd> 행추가</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">F7</kbd> 삭제</div>
            <div><kbd className="px-2 py-1 bg-muted rounded">F8</kbd> 인쇄</div>
          </div>
        </div>

        <EmployeesTable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          isAddingRow={isAddingRow}
          onAddRowComplete={() => setIsAddingRow(false)}
        />
      </div>
    </PageTransition>
  );
}
```

**`components/keyboard-shortcuts-help.tsx`** (단축키 도움말 컴포넌트):
```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { key: 'F5', description: '데이터 새로고침' },
    { key: 'F6', description: '새로운 행 추가' },
    { key: 'F7', description: '선택한 행 삭제' },
    { key: 'F8', description: '테이블 인쇄' },
    { key: 'Enter', description: '편집 완료 및 저장' },
    { key: 'Escape', description: '편집 취소' },
    { key: 'Tab', description: '다음 셀로 이동' },
    { key: 'Shift+Tab', description: '이전 셀로 이동' },
    { key: '더블클릭', description: '셀 편집 모드 활성화' },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Keyboard className="mr-2 h-4 w-4" />
          단축키
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
          <DialogDescription>
            다음 단축키를 사용하여 빠르게 작업할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between"
            >
              <kbd className="px-3 py-1.5 text-sm font-semibold bg-muted rounded border">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🧪 테스트 시나리오

### 기능 테스트
1. ✅ 사원 목록 표시 확인
2. ✅ 검색 기능 테스트
3. ✅ 정렬 기능 테스트
4. ✅ 인라인 편집 테스트 (이름, 부서, 직급 등)
5. ✅ 권한별 기능 확인 (Admin/User)
6. ✅ 삭제 기능 테스트 (Admin만)
7. ✅ 에러 처리 확인

### UX 테스트
1. ✅ 로딩 상태 표시
2. ✅ 성공/실패 토스트 메시지
3. ✅ 키보드 네비게이션 (Enter, Esc)
4. ✅ 호버 효과
5. ✅ 반응형 디자인

---

## 🎉 Phase 3 완료 체크리스트

- [ ] ✅ Server Actions 구현 및 테스트
- [ ] ✅ TanStack Table 기반 데이터 테이블 구현
- [ ] ✅ 인라인 편집 기능 정상 작동
- [ ] ✅ 사원 추가 기능 구현
- [ ] ✅ 사원 삭제 기능 구현 (Admin만)
- [ ] ✅ 권한 기반 UI 제어 확인
- [ ] ✅ 에러 처리 및 토스트 알림 확인
- [ ] ✅ 키보드 단축키 작동 확인

---

**작성일**: 2025년 9월 30일
**Phase**: 3/6
**다음 Phase**: [Phase_4_회사관리.md](./Phase_4_회사관리.md)