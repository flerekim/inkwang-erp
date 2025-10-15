# 수주관리 기능 상세 PRD - Part 3: Frontend 구현 가이드

> **작성일**: 2025-01-11
> **대상**: 인광이에스 ERP 시스템
> **전체 3부작 중 Part 3 (최종편)**

---

## 📋 문서 구성

- **Part 1**: 개요 및 DB 설계
- **Part 2**: Server Actions 및 TypeScript 타입
- **Part 3**: 프론트엔드 구현 가이드 (현재 문서)

---

## 목차

1. [디렉토리 구조](#1-디렉토리-구조)
2. [페이지 컴포넌트 구현](#2-페이지-컴포넌트-구현)
3. [테이블 컴포넌트 구현](#3-테이블-컴포넌트-구현)
4. [다이얼로그 컴포넌트 구현](#4-다이얼로그-컴포넌트-구현)
5. [네비게이션 추가](#5-네비게이션-추가)
6. [전체 구현 체크리스트](#6-전체-구현-체크리스트)

---

## 1. 디렉토리 구조

### 1.1 전체 파일 구조

```
src/
├── actions/
│   └── orders.ts                         ✅ Part 2에서 구현
│
├── app/
│   └── (dashboard)/
│       └── sales/                        🆕 영업관리 라우트 그룹
│           └── orders/                   🆕 수주관리 페이지
│               ├── page.tsx              🆕 서버 컴포넌트 (데이터 fetch)
│               ├── orders-page-client.tsx    🆕 클라이언트 컴포넌트
│               ├── orders-table.tsx          🆕 테이블 컴포넌트
│               ├── order-columns.tsx         🆕 컬럼 정의
│               ├── order-form-dialog.tsx     🆕 추가/수정 다이얼로그
│               ├── pollutant-selector.tsx    🆕 오염물질 선택
│               ├── method-selector.tsx       🆕 정화방법 선택
│               ├── mobile-order-card.tsx     🆕 모바일 카드
│               └── mobile-edit-dialog.tsx    🆕 모바일 편집
│
├── components/
│   ├── common/                           ✅ 기존 재사용 컴포넌트
│   │   ├── data-table.tsx
│   │   ├── editable-cell.tsx
│   │   ├── editable-select-cell.tsx
│   │   ├── editable-date-cell.tsx
│   │   ├── crud-table-toolbar.tsx
│   │   ├── export-to-excel.tsx
│   │   └── print-table.tsx
│   │
│   ├── dialogs/
│   │   ├── form-dialog.tsx
│   │   └── delete-confirm-dialog.tsx
│   │
│   ├── ui/                               ✅ shadcn/ui
│   │   └── ...
│   │
│   └── layout/
│       └── sidebar.tsx                   🔧 네비게이션 추가 필요
│
├── lib/
│   ├── validations.ts                    ✅ Part 2에서 구현
│   └── utils.ts
│
└── types/
    └── index.ts                          ✅ Part 2에서 구현
```

### 1.2 생성할 디렉토리

```bash
# Windows PowerShell
mkdir src\app\(dashboard)\sales\orders -Force

# Git Bash / macOS / Linux
mkdir -p src/app/(dashboard)/sales/orders
```

---

## 2. 페이지 컴포넌트 구현

### 2.1 서버 컴포넌트 (`page.tsx`)

**파일 경로**: `src/app/(dashboard)/sales/orders/page.tsx`

**역할**: 서버에서 데이터를 fetch하여 클라이언트 컴포넌트에 전달

```typescript
import { getOrders } from '@/actions/orders';
import { OrdersPageClient } from './orders-page-client';
import { requireAdmin } from '@/lib/auth';

export default async function OrdersPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 수주 목록 조회
  const result = await getOrders();

  if (result.error) {
    throw new Error(result.error);
  }

  return (
    <OrdersPageClient
      orders={result.data || []}
    />
  );
}
```

### 2.2 클라이언트 컴포넌트 (`orders-page-client.tsx`)

**파일 경로**: `src/app/(dashboard)/sales/orders/orders-page-client.tsx`

**역할**: 페이지 헤더, 통계 카드, 테이블을 렌더링

```typescript
'use client';

import * as React from 'react';
import { FileText, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { OrdersTable } from './orders-table';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import type { OrderWithDetails } from '@/types';

interface OrdersPageClientProps {
  orders: OrderWithDetails[];
}

export function OrdersPageClient({ orders }: OrdersPageClientProps) {
  // 통계 계산
  const stats = React.useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter((o) => o.contract_status === 'in_progress').length;
    const completed = orders.filter((o) => o.contract_status === 'completed').length;
    const totalAmount = orders.reduce((sum, o) => sum + Number(o.contract_amount), 0);

    return { total, inProgress, completed, totalAmount };
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="수주관리"
        description="전체 계약 정보를 관리합니다"
      />

      {/* 통계 카드 */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="전체 계약"
          value={stats.total}
          description="등록된 전체 계약 수"
          icon={FileText}
        />
        <StatsCard
          title="진행 중"
          value={stats.inProgress}
          description="현재 진행 중인 계약"
          icon={Clock}
        />
        <StatsCard
          title="완료"
          value={stats.completed}
          description="완료된 계약"
          icon={CheckCircle}
        />
        <StatsCard
          title="계약금액 합계"
          value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
          description="전체 계약금액"
          icon={DollarSign}
        />
      </div>

      {/* 수주 테이블 */}
      <OrdersTable data={orders} />
    </div>
  );
}
```

---

## 3. 테이블 컴포넌트 구현

### 3.1 컬럼 정의 (`order-columns.tsx`)

**파일 경로**: `src/app/(dashboard)/sales/orders/order-columns.tsx`

**역할**: TanStack Table 컬럼 정의

```typescript
'use client';

import * as React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/common/data-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { OrderWithDetails } from '@/types';

/**
 * 수주 관리 테이블 컬럼 정의
 */
export function createOrderColumns(): ColumnDef<OrderWithDetails>[] {
  return [
    // 체크박스 컬럼
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="모두 선택"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="행 선택"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'order_number',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약번호" />,
      cell: ({ row }) => (
        <span className="font-mono font-semibold">{row.getValue('order_number')}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'contract_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약명" />,
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue('contract_name')}>
          {row.getValue('contract_name')}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'customer_id',
      header: '고객명',
      cell: ({ row }) => (
        <span>{row.original.customer?.name || '-'}</span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'contract_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약일" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue('contract_date')}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'contract_status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('contract_status') as string;
        const statusMap = {
          quotation: { label: '견적', variant: 'outline' as const },
          contract: { label: '계약', variant: 'secondary' as const },
          in_progress: { label: '진행', variant: 'default' as const },
          completed: { label: '완료', variant: 'success' as const },
        };
        const { label, variant } = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };

        return <Badge variant={variant}>{label}</Badge>;
      },
      enableSorting: false,
    },
    {
      accessorKey: 'contract_amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="계약금액" />,
      cell: ({ row }) => {
        const amount = Number(row.getValue('contract_amount'));
        return <span className="font-semibold">{(amount / 100000000).toFixed(2)}억원</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'pollutants',
      header: '오염항목',
      cell: ({ row }) => {
        const pollutants = row.original.pollutants || [];

        if (pollutants.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        // 단일 항목
        if (pollutants.length === 1) {
          const p = pollutants[0];
          return (
            <div className="text-sm">
              {p.pollutant?.name} ({p.concentration} {p.pollutant?.unit})
            </div>
          );
        }

        // 복수 항목: 그룹핑 네임 + Popover
        const groupName = pollutants[0].group_name || '복합오염';
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-sm text-primary underline hover:text-primary/80">
                {groupName} ({pollutants.length}개)
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">오염항목 상세</h4>
                <div className="space-y-1 text-sm">
                  {pollutants.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>{p.pollutant?.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {p.concentration} {p.pollutant?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'methods',
      header: '정화방법',
      cell: ({ row }) => {
        const methods = row.original.methods || [];

        if (methods.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className="text-sm">
            {methods.map((m) => m.method?.name).join(', ')}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string | null;

        if (!notes || notes.trim() === '') {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-sm text-primary underline hover:text-primary/80">
                내용있음
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">비고</h4>
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </div>
            </PopoverContent>
          </Popover>
        );
      },
      enableSorting: false,
    },
  ];
}
```

### 3.2 테이블 컴포넌트 (`orders-table.tsx`)

**파일 경로**: `src/app/(dashboard)/sales/orders/orders-table.tsx`

**역할**: 테이블 렌더링 및 CRUD 로직 (사원관리 패턴 참고)

```typescript
'use client';

import * as React from 'react';
import { type RowSelectionState } from '@tanstack/react-table';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { ExportToExcel, type ExportColumn } from '@/components/common/export-to-excel';
import { PrintTable, type PrintColumn } from '@/components/common/print-table';
import { createOrderColumns } from './order-columns';
import { OrderFormDialog } from './order-form-dialog';
import { deleteOrder } from '@/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { OrderWithDetails } from '@/types';

interface OrdersTableProps {
  data: OrderWithDetails[];
}

export function OrdersTable({ data }: OrdersTableProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [tableData, setTableData] = React.useState<OrderWithDetails[]>(data);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // 추가/수정 다이얼로그
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingOrder, setEditingOrder] = React.useState<OrderWithDetails | null>(null);

  // 데이터가 변경되면 로컬 상태 업데이트
  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  // 수주 추가
  const handleAddOrder = () => {
    setEditingOrder(null);
    setFormDialogOpen(true);
  };

  // 수주 수정
  const handleEditOrder = (order: OrderWithDetails) => {
    setEditingOrder(order);
    setFormDialogOpen(true);
  };

  // 선택된 행 삭제
  const handleDeleteSelected = async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    const selectedOrders = selectedIndices.map((index) => tableData[index]).filter(Boolean);

    if (selectedOrders.length === 0) {
      toast({
        variant: 'destructive',
        title: '선택 오류',
        description: '삭제할 수주를 선택해주세요.',
      });
      return;
    }

    setIsDeleting(true);

    try {
      // 각 수주 삭제 요청
      const results = await Promise.allSettled(
        selectedOrders.map((order) => deleteOrder(order.id))
      );

      // 실패한 요청 확인
      const failures = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

      if (failures.length > 0) {
        toast({
          variant: 'destructive',
          title: '일부 삭제 실패',
          description: `${successes.length}건 삭제 성공, ${failures.length}건 실패`,
        });
      } else {
        toast({
          title: '삭제 완료',
          description: `${selectedOrders.length}건의 수주가 삭제되었습니다.`,
        });
      }

      // 선택 초기화 및 새로고침
      setRowSelection({});
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // 컬럼 정의
  const columns = React.useMemo(() => createOrderColumns(), []);

  // 선택된 행 개수
  const selectedCount = Object.keys(rowSelection).length;

  // Excel 내보내기 컬럼 정의
  const exportColumns = React.useMemo<ExportColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호' },
      { key: 'contract_name', header: '계약명' },
      {
        key: 'customer_id',
        header: '고객명',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일' },
      {
        key: 'contract_status',
        header: '상태',
        format: (value) => {
          const statusMap = { quotation: '견적', contract: '계약', in_progress: '진행', completed: '완료' };
          return statusMap[value as keyof typeof statusMap] || value;
        },
      },
      {
        key: 'contract_amount',
        header: '계약금액(원)',
        format: (value) => Number(value).toLocaleString(),
      },
    ],
    []
  );

  // 인쇄용 컬럼 정의
  const printColumns = React.useMemo<PrintColumn<OrderWithDetails>[]>(
    () => [
      { key: 'order_number', header: '계약번호', width: '100px', align: 'center' },
      { key: 'contract_name', header: '계약명', width: '200px' },
      {
        key: 'customer_id',
        header: '고객명',
        width: '120px',
        format: (_, row) => row.customer?.name || '',
      },
      { key: 'contract_date', header: '계약일', width: '100px', align: 'center' },
      {
        key: 'contract_status',
        header: '상태',
        width: '70px',
        align: 'center',
        format: (value) => {
          const statusMap = { quotation: '견적', contract: '계약', in_progress: '진행', completed: '완료' };
          return statusMap[value as keyof typeof statusMap] || value;
        },
      },
      {
        key: 'contract_amount',
        header: '계약금액',
        width: '120px',
        align: 'right',
        format: (value) => `${(Number(value) / 100000000).toFixed(2)}억원`,
      },
    ],
    []
  );

  return (
    <>
      {/* 데스크톱: 테이블 뷰 */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={tableData}
          searchKey="contract_name"
          searchPlaceholder="계약명 검색..."
          pageSize={10}
          enableRowSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          toolbar={
            <CrudTableToolbar
              selectedCount={selectedCount}
              isDeleting={isDeleting}
              onAdd={handleAddOrder}
              onDelete={() => setDeleteDialogOpen(true)}
              exportButton={
                <ExportToExcel
                  data={tableData}
                  columns={exportColumns}
                  filename={`수주목록_${new Date().toISOString().split('T')[0]}.xlsx`}
                  sheetName="수주"
                  buttonText="Excel 다운로드"
                />
              }
              printButton={
                <PrintTable
                  data={tableData}
                  columns={printColumns}
                  title="수주 목록"
                  subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
                  buttonText="인쇄"
                />
              }
              addButtonText="수주 추가"
              deleteButtonText="삭제"
            />
          }
        />
      </div>

      {/* 모바일: 카드 뷰 (추후 구현) */}
      <div className="md:hidden">
        {/* TODO: 모바일 카드 뷰 구현 */}
        <div className="text-center py-12 text-muted-foreground">
          모바일 뷰는 추후 구현 예정입니다.
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        title="수주 삭제"
        description={`선택한 ${selectedCount}건의 수주를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        isDeleting={isDeleting}
      />

      {/* 추가/수정 다이얼로그 */}
      <OrderFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        order={editingOrder}
        onSuccess={() => {
          setFormDialogOpen(false);
          setEditingOrder(null);
          router.refresh();
        }}
      />
    </>
  );
}
```

---

## 4. 다이얼로그 컴포넌트 구현

### 4.1 수주 추가/수정 다이얼로그 (`order-form-dialog.tsx`)

**파일 경로**: `src/app/(dashboard)/sales/orders/order-form-dialog.tsx`

**역할**: 수주 추가/수정 폼 다이얼로그

```typescript
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderInsertSchemaRefined } from '@/lib/validations';
import { createOrder, updateOrder, getCustomers, getVerificationCompanies, getUsers, getNewOrders } from '@/actions/orders';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { OrderWithDetails, OrderFormData, Customer, User } from '@/types';

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails | null; // null이면 추가, 있으면 수정
  onSuccess: () => void;
}

export function OrderFormDialog({ open, onOpenChange, order, onSuccess }: OrderFormDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // 관계형 데이터
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [verificationCompanies, setVerificationCompanies] = React.useState<Customer[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [newOrders, setNewOrders] = React.useState<Array<{ id: string; order_number: string; contract_name: string }>>([]);

  // React Hook Form
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderInsertSchemaRefined),
    defaultValues: order
      ? {
          contract_type: order.contract_type,
          contract_status: order.contract_status,
          business_type: order.business_type,
          pricing_type: order.pricing_type,
          contract_name: order.contract_name,
          contract_date: order.contract_date,
          contract_amount: order.contract_amount,
          customer_id: order.customer_id,
          verification_company_id: order.verification_company_id,
          manager_id: order.manager_id,
          parent_order_id: order.parent_order_id,
          export_type: order.export_type,
          notes: order.notes,
          pollutants: order.pollutants.map((p) => ({
            pollutant_id: p.pollutant_id,
            concentration: p.concentration,
            group_name: p.group_name,
          })),
          methods: order.methods.map((m) => m.method_id),
        }
      : {
          contract_type: 'new',
          contract_status: 'quotation',
          business_type: 'civilian',
          pricing_type: 'total',
          contract_name: '',
          contract_date: new Date().toISOString().split('T')[0],
          contract_amount: 0,
          customer_id: '',
          verification_company_id: null,
          manager_id: null,
          parent_order_id: null,
          export_type: 'on_site',
          notes: null,
          pollutants: [],
          methods: [],
        },
  });

  // 관계형 데이터 로드
  React.useEffect(() => {
    if (open) {
      const loadOptions = async () => {
        try {
          const [customersData, verificationData, usersData, newOrdersData] = await Promise.all([
            getCustomers(),
            getVerificationCompanies(),
            getUsers(),
            getNewOrders(),
          ]);
          setCustomers(customersData);
          setVerificationCompanies(verificationData);
          setUsers(usersData);
          setNewOrders(newOrdersData);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: '데이터 로드 실패',
            description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
          });
        }
      };
      loadOptions();
    }
  }, [open, toast]);

  // 폼 제출
  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);

    try {
      let result;
      if (order) {
        // 수정
        result = await updateOrder(order.id, data);
      } else {
        // 추가
        result = await createOrder(data);
      }

      if (result.error) {
        toast({
          variant: 'destructive',
          title: order ? '수정 실패' : '추가 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: order ? '수정 완료' : '추가 완료',
        description: `수주가 성공적으로 ${order ? '수정' : '추가'}되었습니다.`,
      });

      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: order ? '수정 실패' : '추가 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? '수주 수정' : '수주 추가'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 계약 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>계약구분</Label>
              <Select
                value={form.watch('contract_type')}
                onValueChange={(value) => form.setValue('contract_type', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">신규</SelectItem>
                  <SelectItem value="change">변경</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>계약상태</Label>
              <Select
                value={form.watch('contract_status')}
                onValueChange={(value) => form.setValue('contract_status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotation">견적</SelectItem>
                  <SelectItem value="contract">계약</SelectItem>
                  <SelectItem value="in_progress">진행</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 계약명 */}
          <div>
            <Label>계약명 *</Label>
            <Input {...form.register('contract_name')} placeholder="계약명을 입력하세요" />
            {form.formState.errors.contract_name && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.contract_name.message}</p>
            )}
          </div>

          {/* 계약일 & 계약금액 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>계약일 *</Label>
              <Input type="date" {...form.register('contract_date')} />
            </div>

            <div>
              <Label>계약금액 (원) *</Label>
              <Input
                type="number"
                {...form.register('contract_amount', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </div>

          {/* 고객명 & 검증업체 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>고객명 *</Label>
              <Select
                value={form.watch('customer_id')}
                onValueChange={(value) => form.setValue('customer_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="고객 선택" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>검증업체</Label>
              <Select
                value={form.watch('verification_company_id') || ''}
                onValueChange={(value) => form.setValue('verification_company_id', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="검증업체 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
                  {verificationCompanies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TODO: 오염물질 선택 컴포넌트 */}
          {/* TODO: 정화방법 선택 컴포넌트 */}

          {/* 비고 */}
          <div>
            <Label>비고</Label>
            <Textarea
              {...form.register('notes')}
              placeholder="비고사항을 입력하세요"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : order ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**주의**: 오염물질 및 정화방법 선택 컴포넌트는 별도로 구현이 필요합니다. 위 코드에서 `TODO` 부분을 참고하세요.

---

## 5. 네비게이션 추가

### 5.1 사이드바 수정 (`src/components/layout/sidebar.tsx`)

기존 사이드바 파일에서 "영업관리 > 수주관리" 메뉴를 추가합니다.

```typescript
// src/components/layout/sidebar.tsx

// ... 기존 imports

import { FileText } from 'lucide-react'; // 추가

// ... 기존 코드

const menuItems = [
  // ... 기존 메뉴들

  // 영업관리 섹션 추가
  {
    section: '영업관리',
    items: [
      {
        label: '수주관리',
        href: '/sales/orders',
        icon: FileText,
      },
    ],
  },

  // ... 나머지 메뉴들
];
```

---

## 6. 전체 구현 체크리스트

### 6.1 데이터베이스 (Part 1)
- [ ] Supabase에서 SQL 쿼리 실행
- [ ] orders 테이블 생성
- [ ] pollutants 테이블 생성 및 초기 데이터 삽입 (23개)
- [ ] methods 테이블 생성 및 초기 데이터 삽입 (6개)
- [ ] order_pollutants 테이블 생성
- [ ] order_methods 테이블 생성
- [ ] customers 테이블에 customer_type 컬럼 추가
- [ ] RLS 정책 설정 확인
- [ ] 트리거 동작 테스트 (계약번호 자동 생성)
- [ ] Supabase 타입 생성: `pnpm types:gen`

### 6.2 Backend (Part 2)
- [ ] TypeScript 타입 정의 (`src/types/index.ts`)
- [ ] Zod validation 스키마 (`src/lib/validations.ts`)
- [ ] Server Actions 구현 (`src/actions/orders.ts`)
- [ ] Server Actions 테스트 (타입 체크, 기능 테스트)

### 6.3 Frontend (Part 3)
- [ ] 디렉토리 생성 (`src/app/(dashboard)/sales/orders/`)
- [ ] 서버 컴포넌트 구현 (`page.tsx`)
- [ ] 클라이언트 컴포넌트 구현 (`orders-page-client.tsx`)
- [ ] 테이블 컬럼 정의 (`order-columns.tsx`)
- [ ] 테이블 컴포넌트 구현 (`orders-table.tsx`)
- [ ] 수주 추가/수정 다이얼로그 (`order-form-dialog.tsx`)
- [ ] 오염물질 선택 컴포넌트 (`pollutant-selector.tsx`)
- [ ] 정화방법 선택 컴포넌트 (`method-selector.tsx`)
- [ ] 모바일 카드 뷰 (`mobile-order-card.tsx`)
- [ ] 모바일 편집 다이얼로그 (`mobile-edit-dialog.tsx`)
- [ ] 사이드바 네비게이션 추가

### 6.4 테스트
- [ ] 수주 추가 기능 테스트
- [ ] 수주 수정 기능 테스트
- [ ] 수주 삭제 기능 테스트
- [ ] 오염물질 다중 선택 테스트
- [ ] 정화방법 다중 선택 테스트
- [ ] 변경계약 (parent_order_id) 테스트
- [ ] 계약번호 자동 생성 테스트
- [ ] Excel 내보내기 테스트
- [ ] 인쇄 기능 테스트
- [ ] 검색 및 필터링 테스트
- [ ] 반응형 디자인 테스트 (데스크톱/모바일)
- [ ] 권한 테스트 (admin/user)

### 6.5 배포
- [ ] 린트 체크: `pnpm lint`
- [ ] 타입 체크: `pnpm type-check`
- [ ] 빌드 테스트: `pnpm build`
- [ ] 프로덕션 배포
- [ ] 배포 후 기능 검증

---

## 구현 시 주의사항

### ⚠️ Next.js 15 Server Actions
- `'use server'` 파일에서 destructuring export 불가
- 반드시 명시적인 async 함수로 export

### ⚠️ TanStack Table
- `data`와 `columns`는 항상 `useMemo`로 메모이제이션
- `getRowId` 옵션으로 고유 ID 지정 권장

### ⚠️ Supabase RLS
- 모든 테이블에 RLS 정책 설정 필수
- admin 권한 체크 로직 확인

### ⚠️ 트랜잭션 처리
- 오염물질 및 정화방법 추가 시 메인 테이블 추가 실패 시 롤백
- Supabase는 기본적으로 트랜잭션을 지원하지 않으므로 수동 롤백 필요

---

## 참고 자료

### 사원관리 페이지 참고
- `src/app/(dashboard)/admin/employees/` 디렉토리 전체 구조
- 특히 `employees-table.tsx`의 CRUD 로직 패턴

### TanStack Table 공식 문서
- 컬럼 정의: https://tanstack.com/table/latest/docs/guide/column-defs
- 인라인 편집: https://tanstack.com/table/latest/docs/framework/react/examples/editable-data
- Row Selection: https://tanstack.com/table/latest/docs/guide/row-selection

### Supabase 공식 문서
- SSR Auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- RLS 정책: https://supabase.com/docs/guides/auth/row-level-security

---

## 결론

이 PRD 문서 시리즈를 따라 구현하면 주니어 개발자도 체계적으로 수주관리 기능을 완성할 수 있습니다.

**구현 순서**:
1. Part 1의 데이터베이스 설계 완료
2. Part 2의 Backend (Server Actions & Types) 구현
3. Part 3의 Frontend (UI 컴포넌트) 구현
4. 테스트 및 배포

**질문이나 막히는 부분**이 있으면 사원관리 페이지 구현을 참고하거나, 위 참고 자료의 공식 문서를 확인하세요.

**Good Luck! 🚀**

