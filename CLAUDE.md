# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server (uses Turbopack)
pnpm dev

# Production build (uses Turbopack)
pnpm build

# Start production server
pnpm start

# Run ESLint
pnpm lint

# Type checking
pnpm type-check
pnpm type-check:watch  # Watch mode

# Generate Supabase types
pnpm types:gen
```

**Default dev server port**: http://localhost:3001 (configured in dev environment)

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **React**: 19.1.0
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS v4 (with Turbopack integration)
- **Database**: Supabase (PostgreSQL with SSR)
- **UI Components**: Radix UI + shadcn/ui
- **Tables**: TanStack Table v8
- **Forms**: React Hook Form + Zod validation
- **Drag & Drop**: @dnd-kit
- **Package Manager**: pnpm 10.17.0

## Architecture Overview

### Directory Structure

```
src/
├── actions/          # Server Actions ('use server')
│   ├── auth.ts
│   ├── employees.ts
│   ├── companies.ts
│   ├── departments.ts
│   ├── positions.ts
│   └── bank-accounts.ts
├── app/
│   ├── (auth)/       # Authentication routes (login)
│   ├── (dashboard)/  # Protected dashboard routes
│   │   ├── page.tsx
│   │   └── admin/
│   │       ├── employees/
│   │       └── company/
│   │           ├── companies/
│   │           ├── departments/
│   │           ├── positions/
│   │           └── bank-accounts/
│   └── layout.tsx
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Layout components (header, sidebar)
│   ├── tables/       # Table components (data-table, editable cells)
│   ├── dialogs/      # Dialog components
│   └── charts/       # Chart components
├── hooks/            # Custom React hooks
├── lib/
│   ├── supabase/     # Supabase client/server/middleware
│   ├── server-actions.ts  # CRUD factory pattern
│   ├── auth.ts
│   ├── utils.ts
│   └── validations.ts
└── types/
    ├── index.ts      # Type exports
    └── database.ts   # Supabase generated types
```

### Server Actions Pattern

**Critical Next.js 15 Constraint**: Files with `'use server'` directive CANNOT use destructuring exports. You must export explicit async functions.

**Factory Pattern** (`src/lib/server-actions.ts`):
```typescript
// ❌ WRONG - Destructuring doesn't work with 'use server'
export const { getAll, create } = createCrudActions('table', ['/path']);

// ✅ CORRECT - Explicit async function wrappers
const crudActions = createCrudActions('table', ['/path']);

export async function getAll() {
  return crudActions.getAll();
}

export async function create(data) {
  return crudActions.create(data);
}
```

The `createCrudActions<T>()` factory provides:
- `getAll(orderBy?)` - List with ordering
- `getById(id)` - Single record
- `create(data)` - Insert with validation
- `update(id, data)` - Update with revalidation
- `remove(id)` - Delete with confirmation
- `reorder(items)` - Batch sort_order updates

All actions include:
- Automatic auth/permission checks
- Path revalidation via `revalidatePath()`
- Error handling with user-friendly messages

### Authentication & Authorization

**Supabase SSR Pattern**:
- `src/lib/supabase/client.ts` - Client-side auth (browser)
- `src/lib/supabase/server.ts` - Server-side auth (Server Components, Server Actions)
- `src/lib/supabase/middleware.ts` - Session refresh (middleware)

**User Roles** (Enum `user_role`):
- `admin` - Full access
- `manager` - Limited access
- `employee` - Read-only

**Route Protection**:
- `middleware.ts` - Session validation for all routes
- `src/lib/auth.ts` - `checkAuth()` helper for role-based access

### Component Patterns

**Reusable Table Components**:

1. **DataTable** (`src/components/tables/data-table.tsx`)
   - TanStack Table wrapper with search/filtering
   - Column sorting and pagination
   - Custom toolbar slot

2. **EditableCell** (`src/components/tables/editable-cell.tsx`)
   - Inline text editing with Tab navigation
   - Double-click to edit, Enter to save, Escape to cancel
   - Optimistic updates with error rollback

3. **EditableSelectCell** (`src/components/tables/editable-select-cell.tsx`)
   - Inline select/combobox editing
   - Two types: `'select'` (dropdown) or `'combobox'` (with search)
   - Tab navigation support

4. **SortableTable** (`src/components/tables/sortable-table.tsx`)
   - Drag & drop reordering with @dnd-kit
   - Optimistic updates for sort_order
   - Used for departments, positions

**Example Usage**:
```typescript
// 1. 데이터와 컬럼을 useMemo로 메모이제이션 (중요!)
const data = useMemo(() => users, [users]);

const columns = useMemo(() => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        이름
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ getValue, row, table }) => {
      const meta = table.options.meta as {
        editingRowId?: string | null;
        onEditingRowChange?: (id: string | null) => void;
      };

      return (
        <EditableCell
          id={row.id}
          field="name"
          value={getValue<string>()}
          onSave={handleSave}
          isRowEditing={meta?.editingRowId === row.id}
          onRowEdit={() => meta?.onEditingRowChange?.(row.id)}
          onEditEnd={() => meta?.onEditingRowChange?.(null)}
        />
      );
    },
  },
], []);

// 2. DataTable에 getRowId 전달
<DataTable
  columns={columns}
  data={data}
  getRowId={(row) => row.id}
  searchKey="name"
  enableRowSelection
  enableDragSort  // 드래그 앤 드롭 정렬 활성화
  onReorder={handleReorder}
  editingRowId={editingRowId}
  onEditingRowChange={setEditingRowId}
/>
```

**참고**: 전체 예제는 `src/app/(dashboard)/admin/employees/columns-example.tsx` 참조

**Dialog Components**:
- `FormDialog` - Reusable form dialog with loading states
- `DeleteConfirmDialog` - Standardized delete confirmation

### Database Schema

**Key Tables**:
- `users` - Employee records with role-based access
- `companies` - Company master data
- `departments` - Department hierarchy (with sort_order)
- `positions` - Position/title master (with sort_order)
- `bank_accounts` - Company bank account management

**Foreign Key Relationships**:
```
users.company_id → companies.id
users.department_id → departments.id (nullable)
users.position_id → positions.id (nullable)
bank_accounts.company_id → companies.id
```

**Type Generation**:
```bash
# Generate types from Supabase schema (when schema changes)
pnpm types:gen
```

## Development Workflow

### ⚠️ Before You Start - Check for Reusable Components

**CRITICAL**: Before writing any new UI code, ALWAYS check if a reusable component already exists.

**Common Components to Use**:

1. **Table Components** (`src/components/common/`):
   - ✅ `DataTable` - Use for any list/table view with search, sort, pagination
   - ✅ `EditableCell` - Use for inline text editing (name, email, phone, etc.)
   - ✅ `EditableSelectCell` - Use for inline dropdown editing (company, department, position, status, role)
   - ✅ `EditableDateCell` - Use for inline date editing
   - ✅ `CrudTableToolbar` - Use for table action buttons (add, save, cancel, delete, export, print)
   - ✅ `ExportToExcel` - Use for Excel export functionality
   - ✅ `PrintTable` - Use for table printing functionality

2. **Dialog Components** (`src/components/dialogs/`):
   - ✅ `FormDialog` - Use for any form in a dialog (create/edit forms)
   - ✅ `DeleteConfirmDialog` - Use for all delete confirmations

3. **UI Components** (`src/components/ui/`):
   - ✅ shadcn/ui components (Button, Input, Select, etc.)
   - All pre-configured with consistent styling

**Anti-Pattern** ❌:
```typescript
// DON'T: Create custom inline editing logic
const [isEditing, setIsEditing] = useState(false);
const handleEdit = () => { /* custom logic */ };
// ... 50+ lines of duplicate code
```

**Best Practice** ✅:
```typescript
// DO: Use EditableCell component
<EditableCell
  id={row.original.id}
  field="name"
  value={row.getValue('name')}
  onSave={handleSave}
/>
```

**When to Create New Components**:
- Only when existing components don't meet the requirement
- If you're copying code from another file, extract it to a shared component instead
- If the same pattern appears 3+ times, create a reusable component

### Using CrudTableToolbar

**CrudTableToolbar** (`src/components/common/crud-table-toolbar.tsx`) provides consistent CRUD operation buttons across all table pages.

**Features**:
- 평상시: 추가, Excel 다운로드, 인쇄, 삭제 버튼
- 추가 모드: 저장, 취소 버튼
- 모바일: 드롭다운으로 통합

**Example Usage**:
```typescript
// Desktop Toolbar
const desktopToolbar = (
  <CrudTableToolbar
    isAddingNew={!!newRowData}
    isSaving={isSaving}
    selectedCount={selectedCount}
    isDeleting={isDeleting}
    onAdd={handleAdd}
    onSave={handleSave}
    onCancel={handleCancel}
    onDelete={() => setDeleteDialogOpen(true)}
    exportButton={
      <ExportToExcel
        data={tableData}
        columns={exportColumns}
        filename={`데이터목록_${new Date().toISOString().split('T')[0]}.xlsx`}
        sheetName="데이터"
        buttonText="Excel 다운로드"
      />
    }
    printButton={
      <PrintTable
        data={tableData}
        columns={printColumns}
        title="데이터 목록"
        subtitle={`총 ${tableData.length}건`}
        buttonText="인쇄"
      />
    }
    addButtonText="데이터 추가"
    deleteButtonText="삭제"
  />
);

// Mobile Toolbar
const mobileToolbar = (
  <CrudTableToolbar
    isMobile
    isAddingNew={!!newRowData}
    isSaving={isSaving}
    selectedCount={selectedCount}
    isDeleting={isDeleting}
    onAdd={handleAdd}
    onSave={handleSave}
    onCancel={handleCancel}
    onDelete={() => setDeleteDialogOpen(true)}
    exportButton={
      <ExportToExcel
        data={tableData}
        columns={exportColumns}
        filename={`데이터목록_${new Date().toISOString().split('T')[0]}.xlsx`}
        sheetName="데이터"
        buttonText="Excel 다운로드"
      />
    }
    printButton={
      <PrintTable
        data={tableData}
        columns={printColumns}
        title="데이터 목록"
        subtitle={`총 ${tableData.length}건`}
        buttonText="인쇄"
      />
    }
    addButtonText="데이터 추가"
  />
);

// Usage in DataTable
<DataTable
  columns={columns}
  data={data}
  toolbar={desktopToolbar}
/>

// Usage in Mobile View
<div className="flex items-center gap-2 w-full">
  {mobileToolbar}
</div>
```

### Adding a New CRUD Page

1. **Create Server Actions** (`src/actions/[entity].ts`):
   ```typescript
   'use server';

   const crudActions = createCrudActions<Entity>('table_name', ['/path']);

   export async function getEntities() {
     return crudActions.getAll();
   }
   // ... other wrappers
   ```

2. **Create Page Component** (`src/app/(dashboard)/path/page.tsx`):
   - Server Component for data fetching
   - Pass data to Client Component table

3. **Create Column Definitions** (`columns.tsx`):
   - Use `useMemo` to memoize columns
   - Add sortable headers with `column.toggleSorting()`
   - Use `EditableCell` / `EditableSelectCell` for inline editing
   - See `src/app/(dashboard)/admin/employees/columns-example.tsx` for reference

4. **Add Navigation** in `src/components/layout/sidebar.tsx`

### Working with Editable Tables

**IMPORTANT: Data Stability**
```typescript
// ✅ ALWAYS memoize data and columns to prevent infinite re-renders
const data = useMemo(() => users, [users]);
const columns = useMemo(() => createColumns(), []);
```

**Inline Editing Pattern**:
```typescript
const handleSave = async (id: string, field: string, value: string) => {
  const result = await updateEntity(id, { [field]: value });

  if (result.error) {
    toast.error(result.error);
    return { error: result.error };
  }

  toast.success('수정되었습니다');
  return { success: true };
};
```

**Important**: EditableCell and EditableSelectCell handle optimistic updates internally. Just return `{ error?: string }` or `{ success: true }`.

**TanStack Table Best Practices**:
1. Always use `getRowId` option for consistent row identification
2. Memoize `data` and `columns` with `useMemo`
3. Add sortable headers with `column.toggleSorting()`
4. Use `table.options.meta` to pass custom props to cells
5. Never use `localData` state - use TanStack's built-in state management

### Advanced Inline Editing Patterns for Complex Data

**복합 데이터 구조 처리** (예: orders 페이지의 pollutants, methods):

1. **인라인 편집 + Dialog 혼용 패턴**:
   ```typescript
   // 간단한 필드: 테이블에서 인라인 편집
   - 계약명, 계약일, 계약금액 → EditableCell
   - 계약구분, 계약상태 → EditableSelectCell
   - 고객명, 담당자 → EditableSelectCell (combobox with search)

   // 복잡한 필드: Dialog로 편집
   - 오염물질 배열 (농도, 그룹명 포함) → "편집" 버튼 → Dialog
   - 정화방법 배열 (다중 선택) → "편집" 버튼 → Dialog
   ```

2. **새 행 추가 패턴** (Temporary ID):
   ```typescript
   // 1. 새 행 생성 시 temp- prefix 사용
   const handleAdd = () => {
     const tempRow: OrderWithDetails = {
       id: `temp-${Date.now()}`,
       order_number: '(자동생성)',
       contract_name: '',
       // ... 기본값 설정
     };
     setNewRowData(tempRow);
   };

   // 2. 컬럼 정의에서 temp- 감지하여 UI 조정
   cell: ({ row }) => {
     const isNewRow = row.original.id?.startsWith('temp-');
     return (
       <EditableCell
         value={row.getValue('name')}
         onUpdate={isNewRow ? handleUpdateNewRow : handleUpdateCell}
         className={isNewRow ? 'border border-primary/50' : ''}
       />
     );
   };

   // 3. 저장 시 Server Action 호출 + 테이블 갱신
   const handleSaveNewRow = async () => {
     const result = await createOrder(newRowData);
     if (!result.error) {
       setNewRowData(null); // 새 행 제거
       // 자동으로 재검증되어 테이블 갱신됨
     }
   };
   ```

3. **Type Conversion 전략**:
   ```typescript
   // UI Layer (string) → Database Layer (appropriate type)

   // validations.ts: UI 입력은 string으로 받음
   export const pollutantInputSchema = z.object({
     pollutant_id: z.string().uuid(),
     concentration: z.string().min(1, '농도를 입력해주세요'), // string!
     group_name: z.string().nullable().optional(),
   });

   // actions/orders.ts: DB 저장 시 number로 변환
   const pollutantRecords = pollutants.map((p) => ({
     order_id: order.id,
     pollutant_id: p.pollutant_id,
     concentration: Number(p.concentration) || 0, // string → number
     group_name: p.group_name || null,
   }));
   ```

4. **복합 필드 편집 UI 패턴**:
   ```typescript
   // order-columns.tsx: 요약 표시 + 편집 버튼
   {
     accessorKey: 'pollutants',
     header: '오염물질',
     cell: ({ row }) => {
       const pollutants = row.original.pollutants || [];
       const isNewRow = row.original.id?.startsWith('temp-');

       return (
         <div className="flex items-center gap-2">
           <span className="text-sm text-muted-foreground">
             {pollutants.length > 0 ? `${pollutants.length}개` : '미선택'}
           </span>
           {!isNewRow && onEditDetails && (
             <Button
               variant="ghost"
               size="sm"
               onClick={() => onEditDetails(row.original)}
             >
               편집
             </Button>
           )}
         </div>
       );
     },
   }
   ```

5. **Simplified Type Pattern** (UserSelectOption 예시):
   ```typescript
   // types/index.ts: Pick을 사용한 간소화 타입
   export type UserSelectOption = Pick<User, 'id' | 'name' | 'email' | 'role'>;

   // actions/orders.ts: 필요한 필드만 반환
   export async function getUsers() {
     const users = await supabase
       .from('users')
       .select('id, name, email, role')
       .order('name');
     return users.data || [];
   }

   // 컴포넌트에서 사용
   const [users, setUsers] = React.useState<UserSelectOption[]>([]);
   ```

**Example: Orders 페이지**
- 참고: `src/app/(dashboard)/inkwang-es/sales/orders/`
- `orders-table.tsx` - 메인 테이블 + 새 행 로직
- `order-columns.tsx` - 컬럼 정의 + 인라인 편집
- `order-form-dialog.tsx` - 복합 필드 편집 Dialog
- `pollutant-selector.tsx` - 오염물질 다중 선택 컴포넌트
- `method-selector.tsx` - 정화방법 체크박스 그리드

### Performance Optimization

- **Server Components by default** - Fetch data in Server Components
- **Client Components when needed** - Use `'use client'` only for interactivity
- **Suspense boundaries** - Use `loading.tsx` for route-level loading states
- **Image optimization** - Use Next.js `<Image>` component (AVIF/WebP formats enabled)
- **Code splitting** - Dynamic imports for heavy components

### Type Safety

**Always use generated Supabase types**:
```typescript
import type { User, Company, Department } from '@/types';

// For joins
type UserWithDetails = User & {
  company: Company;
  department: Department | null;
};
```

**Form validation with Zod** (`src/lib/validations.ts`):
- Create schemas for all forms
- Use with React Hook Form via `@hookform/resolvers/zod`

## Common Issues & Solutions

### Server Actions Export Error

**Error**: `Server Actions must be async functions`

**Cause**: Using destructuring exports with `'use server'`

**Solution**: Use explicit async function wrappers (see Server Actions Pattern above)

### Supabase Session Issues

**Error**: `Auth session missing!`

**Solution**:
1. Check environment variables (`.env.local`)
2. Verify middleware is running
3. Use correct client (`server.ts` for Server Actions, `client.ts` for browser)

### Type Errors with Supabase

**Solution**: Regenerate types when schema changes
```bash
pnpm types:gen
```

### Tailwind CSS v4 Issues

**Note**: This project uses Tailwind CSS v4 with Turbopack integration. If styles aren't applying:
1. Restart dev server
2. Clear `.next` cache: `rm -rf .next && pnpm dev`
3. Check `@import "tailwindcss"` in `globals.css`

## Testing

Use Playwright MCP for browser-based testing:
```typescript
// Navigate to page
await browser.navigate('http://localhost:3001/admin/employees');

// Take screenshot
await browser.screenshot();

// Test interactions
await browser.click({ element: 'Add button', ref: 'e123' });
```

## Code Style

- **Korean comments** for business logic and user-facing text
- **English** for technical/framework-specific comments
- **Consistent naming**: camelCase for variables/functions, PascalCase for components
- **Server Actions** return `{ error?: string }` or `{ success: true }`
