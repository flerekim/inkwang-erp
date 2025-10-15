# 고객관리 페이지 기능명세서

## 1. 개요

고객 정보를 관리하고 거래 상태를 추적하는 마스터 데이터 페이지입니다. 발주처, 검증업체, 외상매입처 등 다양한 유형의 고객 정보를 통합 관리하며, 사업자등록번호 중복 검증, 거래 상태 추적, 통계 카드 등의 기능을 제공합니다.

## 2. 파일 구조

```
src/
├── app/(dashboard)/inkwang-es/basics/customers/
│   ├── page.tsx                    # Server Component (통계 계산 및 데이터 페칭)
│   ├── customers-table.tsx         # Client Component (테이블 로직, CRUD, 상태 관리)
│   └── columns.tsx                 # 컬럼 정의 (10개 컬럼, Inline 편집)
├── actions/
│   └── customers.ts                # Server Actions (Factory Pattern + Custom 검증)
└── lib/
    └── validations.ts              # Zod 검증 스키마 (customerSchema, customerInsertSchema)
```

**총 코드량**: 약 470줄
- `page.tsx`: 59줄 (통계 계산 로직)
- `customers-table.tsx`: 220줄 (CRUD + 상태 관리)
- `columns.tsx`: 229줄 (10개 컬럼 정의)
- `customers.ts`: 111줄 (Factory Pattern + Custom)

## 3. 주요 파일 역할

### 3.1 page.tsx (Server Component)

**역할**: 초기 데이터 페칭 및 통계 계산

**주요 기능**:
- 고객 데이터 서버 사이드 조회 (`getCustomers()`)
- 통계 카드 데이터 계산
  - 전체 고객 수
  - 거래중 고객 수 (`status === '거래중'`)
  - 거래중단 고객 수 (`status === '중단'`)
  - 사업자등록 고객 수 (`business_number` 존재)
- `StatsCard` 4개 렌더링 (lucide-react 아이콘 사용)

**특징**:
- Server Component로 데이터베이스 직접 접근
- 통계는 서버에서 계산 후 전달 (클라이언트 성능 최적화)
- `PageTransition`, `PageHeader`, `StatsCard` 공용 컴포넌트 활용

### 3.2 customers-table.tsx (Client Component)

**역할**: 테이블 렌더링, CRUD 작업, 상태 관리

**주요 기능**:
- **Inline 수정**: `handleUpdateCell` - 셀 단위 즉시 수정
- **새 고객 추가**: `handleAddCustomer` → `handleSaveNewRow`
  - `temp-` prefix로 임시 ID 생성
  - 인라인 편집 후 저장 버튼 클릭
  - `name` 필수 검증
- **일괄 삭제**: `handleDeleteSelected` - 체크박스 선택 후 삭제
- **Optimistic UI**: 수정 시 즉시 UI 업데이트, 실패 시 롤백
- **Excel/Print**: `ExportToExcel`, `PrintTable` 컴포넌트 통합

**상태 관리**:
```typescript
const [tableData, setTableData] = useState<Customer[]>(initialData);
const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
const [newRowData, setNewRowData] = useState<Partial<Customer> | null>(null);
const [isSavingNewRow, setIsSavingNewRow] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

**특징**:
- `CrudTableToolbar` 사용 (공용 툴바 컴포넌트)
- Escape 키로 추가 모드 취소
- `router.refresh()`로 서버 데이터 재조회

### 3.3 columns.tsx

**역할**: 10개 컬럼 정의 및 Inline 편집 설정

**컬럼 구조** (10개):
1. **select** (체크박스) - 다중 선택 지원
2. **name** (고객명) - `EditableCell`, 필수 입력
3. **customer_type** (고객구분) - `EditableSelectCell` (Combobox)
   - 선택지: 발주처, 검증업체, 외상매입처, 기타
4. **status** (거래상태) - `EditableSelectCell` (Select)
   - 선택지: 거래중, 중단
5. **business_number** (사업자등록번호) - `EditableCell`
   - `formatBusinessNumber()` 포맷팅 (000-00-00000)
   - 저장 시 하이픈 제거 (`replace(/\D/g, '')`)
6. **representative_name** (대표자명) - `EditableCell`
7. **phone** (대표전화) - `EditableCell`
8. **email** (이메일) - `EditableCell` (type="email")
9. **manager_name** (업체담당자) - `EditableCell`
10. **notes** (비고) - `EditableCell`
11. **sort_order** (정렬순서) - `EditableCell` (type="number", 신규 행만 편집 가능)

**특징**:
- `isNewRow` 검증 (`row.original.id.startsWith('temp-')`)
- 신규 행은 `border border-primary/50` 스타일 적용
- 기존 행과 신규 행의 `onUpdate` 핸들러 분리
- `DataTableColumnHeader`로 정렬 가능 헤더

### 3.4 customers.ts (Server Actions)

**역할**: Factory Pattern + Custom 사업자등록번호 검증

**Factory Pattern 부분** (70% 재사용):
```typescript
const crudActions = createCrudActions<Customer>('customers', ['/inkwang-es/basics/customers'], {
  requireAdminForWrite: true,
});

export async function getCustomers() {
  return crudActions.getAll({ column: 'sort_order', ascending: true });
}

export async function getCustomerById(id: string) {
  return crudActions.getById(id);
}

export async function deleteCustomer(id: string) {
  return crudActions.remove(id);
}

export async function reorderCustomers(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}
```

**Custom 부분** (30% 추가 로직):

**1. 사업자등록번호 중복 검증**:
```typescript
export async function checkBusinessNumberDuplicate(
  businessNumber: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  // 빈 값은 검증 안 함
  if (!businessNumber || businessNumber.trim() === '') {
    return { isDuplicate: false };
  }

  // 하이픈 제거 후 숫자만 비교
  const cleanNumber = businessNumber.replace(/\D/g, '');

  // 모든 고객의 사업자등록번호 조회
  const { data } = await supabase
    .from('customers')
    .select('id, business_number')
    .not('business_number', 'is', null);

  // 중복 체크 (자기 자신 제외)
  const duplicate = data?.some((customer) => {
    if (excludeId && customer.id === excludeId) return false;
    const existingClean = customer.business_number?.replace(/\D/g, '') || '';
    return existingClean === cleanNumber && cleanNumber !== '';
  });

  return { isDuplicate: duplicate || false };
}
```

**2. createCustomer - 중복 검증 추가**:
```typescript
export async function createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  // 사업자등록번호 중복 검증
  if (data.business_number) {
    const { isDuplicate, error } = await checkBusinessNumberDuplicate(data.business_number);
    if (error) return { error };
    if (isDuplicate) return { error: '이미 등록된 사업자등록번호입니다' };
  }

  return crudActions.create(data);
}
```

**3. updateCustomer - 중복 검증 + 자기 자신 제외**:
```typescript
export async function updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'created_at'>>) {
  // 사업자등록번호 중복 검증 (자기 자신 제외)
  if (data.business_number) {
    const { isDuplicate, error } = await checkBusinessNumberDuplicate(data.business_number, id);
    if (error) return { error };
    if (isDuplicate) return { error: '이미 등록된 사업자등록번호입니다' };
  }

  return crudActions.update(id, data);
}
```

**특징**:
- Factory Pattern으로 기본 CRUD 70% 재사용
- Custom 검증 로직 30% 추가 (사업자등록번호 중복 방지)
- 하이픈 제거 후 숫자만 비교 (`/\D/g` 정규식)
- `excludeId`로 수정 시 자기 자신 제외

### 3.5 validations.ts (Zod 스키마)

**고객 검증 스키마**:
```typescript
export const customerSchema = z.object({
  name: z.string().min(1, '고객명은 필수 입력 항목입니다').min(2, '고객명은 최소 2자 이상이어야 합니다'),
  customer_type: z.enum(['발주처', '검증업체', '외상매입처', '기타'], {
    message: '올바른 고객구분을 선택해주세요',
  }),
  status: z.enum(['거래중', '중단'], {
    message: '올바른 거래상태를 선택해주세요',
  }),
  business_number: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const cleaned = val.replace(/\D/g, '');
        return cleaned.length === 10;
      },
      { message: '사업자등록번호는 10자리 숫자여야 합니다' }
    ),
  representative_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return z.string().email().safeParse(val).success;
      },
      { message: '올바른 이메일 형식이 아닙니다' }
    ),
  manager_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상이어야 합니다').optional(),
});

export const customerInsertSchema = customerSchema;
export const customerUpdateSchema = customerSchema.partial();
```

**검증 규칙**:
- `name`: 필수, 최소 2자 이상
- `customer_type`: 4가지 선택지 중 필수
- `status`: 2가지 선택지 중 필수
- `business_number`: 선택, 입력 시 10자리 숫자 검증
- `email`: 선택, 입력 시 이메일 형식 검증
- `sort_order`: 선택, 0 이상의 정수

## 4. 데이터 흐름

### 4.1 초기 로딩 (Server Side)
```
1. page.tsx (Server Component)
   ↓
2. getCustomers() Server Action
   ↓ select * from customers order by sort_order
3. Supabase Query
   ↓
4. 통계 계산 (전체/거래중/중단/사업자등록)
   ↓
5. CustomersTable (Client Component)로 전달
```

### 4.2 고객 추가 (Client → Server)
```
1. "고객 추가" 버튼 클릭
   ↓
2. newRowData 생성 (temp-${Date.now()})
   ↓
3. 인라인 편집 (EditableCell, EditableSelectCell)
   ↓ handleUpdateNewRow로 상태 업데이트
4. "저장" 버튼 클릭
   ↓ name 필수 검증
5. createCustomer() Server Action
   ↓ 사업자등록번호 중복 검증
6. Supabase Insert
   ↓ revalidatePath('/inkwang-es/basics/customers')
7. router.refresh() → 페이지 재조회
```

### 4.3 고객 수정 (Optimistic Update)
```
1. EditableCell 더블클릭
   ↓
2. 값 수정 후 Enter 또는 외부 클릭
   ↓ handleUpdateCell
3. Optimistic UI 업데이트 (즉시 반영)
   ↓
4. updateCustomer() Server Action
   ↓ 사업자등록번호 중복 검증 (자기 자신 제외)
5. Supabase Update
   ↓ 성공 시 revalidatePath
6. router.refresh() → 최신 데이터 동기화
   ↓ 실패 시 initialData로 롤백
```

### 4.4 고객 삭제 (일괄)
```
1. 체크박스로 고객 선택
   ↓
2. "삭제" 버튼 클릭
   ↓
3. DeleteConfirmDialog 확인
   ↓
4. Promise.allSettled로 병렬 삭제
   ↓ deleteCustomer(id)
5. Supabase Delete (각각)
   ↓
6. 성공/실패 카운트 toast 표시
   ↓
7. router.refresh() → 페이지 재조회
```

## 5. 주요 기능

### 5.1 통계 카드 (StatsCard)

**4개 통계 카드**:
```typescript
const stats = {
  total: customers.length,                                  // 전체 고객
  active: customers.filter((c) => c.status === '거래중').length,     // 거래중
  suspended: customers.filter((c) => c.status === '중단').length,    // 거래중단
  withBusiness: customers.filter((c) => c.business_number).length,  // 사업자등록
};
```

**특징**:
- 서버에서 계산 후 클라이언트로 전달 (성능 최적화)
- lucide-react 아이콘 사용 (`Users`, `UserCheck`, `UserX`, `Building2`)
- 반응형 그리드 레이아웃 (`md:grid-cols-2 lg:grid-cols-4`)

### 5.2 사업자등록번호 관리

**포맷팅**:
```typescript
// utils.ts
export function formatBusinessNumber(value: string | null | undefined): string {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 10) return value;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
}

// 예시: "1234567890" → "123-45-67890"
```

**중복 검증**:
- 하이픈 제거 후 숫자만 비교 (`replace(/\D/g, '')`)
- 빈 값은 중복 검증 안 함 (nullable)
- 수정 시 자기 자신 제외 (`excludeId`)
- 중복 시 에러 메시지: "이미 등록된 사업자등록번호입니다"

**저장 로직**:
```typescript
// columns.tsx
onUpdate={async (idx, field, value) => {
  const cleanedValue = value.replace(/\D/g, ''); // 하이픈 제거
  if (isNewRow) {
    handleUpdateNewRow(field, cleanedValue);
  } else {
    await handleUpdateCell(idx, field, cleanedValue);
  }
}}
```

### 5.3 고객구분 및 거래상태

**고객구분** (customer_type):
- 발주처 (기본값)
- 검증업체
- 외상매입처
- 기타

**거래상태** (status):
- 거래중 (기본값)
- 중단

**특징**:
- `EditableSelectCell` 사용
- `customer_type`은 Combobox (검색 가능)
- `status`는 Select (드롭다운)

### 5.4 Inline 편집 (EditableCell)

**텍스트 필드** (EditableCell):
- 고객명, 대표자명, 대표전화, 업체담당자, 비고

**선택 필드** (EditableSelectCell):
- 고객구분 (Combobox)
- 거래상태 (Select)

**특수 필드**:
- 사업자등록번호: 포맷팅 + 중복 검증
- 이메일: `type="email"` 속성
- 정렬순서: `type="number"`, 신규 행만 편집 가능

**새 행 추가 방식**:
```typescript
// 임시 ID 생성
id: `temp-${Date.now()}`

// 신규 행 감지
const isNewRow = row.original.id.startsWith('temp-');

// 신규 행 스타일
className={isNewRow ? 'border border-primary/50' : ''}

// 신규 행 핸들러 분리
onUpdate={isNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
```

### 5.5 검색 및 정렬

**검색**:
- 고객명 기준 검색 (`searchKey="name"`)
- 실시간 필터링

**정렬**:
- 모든 컬럼 정렬 가능 (`DataTableColumnHeader`)
- 기본 정렬: `sort_order` 오름차순

### 5.6 Excel/Print

**Excel 내보내기**:
```typescript
<ExportToExcel
  data={tableData}
  columns={exportColumns}
  filename={`고객목록_${new Date().toISOString().split('T')[0]}.xlsx`}
  sheetName="고객"
/>
```

**인쇄**:
```typescript
<PrintTable
  data={tableData}
  columns={printColumns}
  title="고객 목록"
  subtitle={`총 ${tableData.length}건 | 인쇄일: ${new Date().toLocaleDateString('ko-KR')}`}
/>
```

**특징**:
- Excel: 9개 컬럼 내보내기 (사업자등록번호 포맷팅 포함)
- Print: 6개 주요 컬럼만 인쇄 (컬럼 너비 지정)

## 6. 보안 및 권한

### 6.1 Server Actions 권한

```typescript
const crudActions = createCrudActions<Customer>('customers', ['/inkwang-es/basics/customers'], {
  requireAdminForWrite: true,  // 쓰기 작업 admin 권한 필요
});
```

### 6.2 인증 체크

- 모든 Server Actions는 `checkAuth()` 자동 실행
- 미인증 시 에러 반환
- admin 권한 없이 쓰기 작업 시 에러

### 6.3 XSS 방지

- React의 자동 이스케이프
- Zod 검증으로 입력값 필터링
- Supabase Prepared Statements

## 7. 성능 최적화

### 7.1 Server Component 활용

```typescript
// page.tsx - Server Component
export default async function CustomersPage() {
  const customers = await getCustomers();  // 서버에서 데이터 페칭
  const stats = { ... };  // 서버에서 통계 계산
  return <CustomersTable data={customers} />;
}
```

**장점**:
- 데이터베이스 직접 접근 (API 레이어 불필요)
- 통계 계산을 서버에서 처리 (클라이언트 부하 감소)
- SEO 친화적 (서버 렌더링)

### 7.2 Optimistic Update

```typescript
// 즉시 UI 업데이트
setTableData((old) =>
  old.map((row, index) => (index === rowIndex ? { ...row, [columnId]: value } : row))
);

try {
  const result = await updateCustomer(customer.id, { [columnId]: value });
  if (result.error) {
    setTableData(initialData);  // 실패 시 롤백
    throw new Error(result.error);
  }
  router.refresh();
} catch (error) {
  throw error;
}
```

**장점**:
- 즉각적인 UI 반응 (사용자 경험 향상)
- 실패 시 자동 롤백

### 7.3 useMemo 최적화

```typescript
const displayData = useMemo(() =>
  newRowData ? [newRowData as Customer, ...tableData] : tableData,
  [newRowData, tableData]
);

const columns = useMemo(() =>
  createColumns({ handleUpdateCell, handleUpdateNewRow }),
  [handleUpdateCell]
);
```

**장점**:
- 불필요한 재렌더링 방지
- 컬럼 정의 재생성 방지

### 7.4 병렬 삭제

```typescript
const results = await Promise.allSettled(
  selectedCustomers.map((customer) => deleteCustomer(customer.id))
);
```

**장점**:
- 다중 삭제를 병렬로 처리
- 일부 실패해도 나머지 계속 실행

## 8. 에러 처리

### 8.1 입력 검증

```typescript
// 고객명 필수 검증
if (!newRowData || !newRowData.name) {
  toast({ variant: 'destructive', title: '입력 오류', description: '고객명은 필수 입력 항목입니다.' });
  return;
}

// 사업자등록번호 중복 검증
if (isDuplicate) {
  return { error: '이미 등록된 사업자등록번호입니다' };
}
```

### 8.2 Toast 알림

```typescript
// 성공
toast({ title: '수정 완료', description: '고객 정보가 수정되었습니다.' });

// 실패
toast({ variant: 'destructive', title: '수정 실패', description: result.error });
```

### 8.3 삭제 확인

```typescript
<DeleteConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={handleDeleteSelected}
  title="고객 삭제"
  description={`선택한 ${selectedCount}개의 고객을 삭제하시겠습니까?`}
  isDeleting={isDeleting}
/>
```

## 9. 테스트 시나리오

### 9.1 CRUD 테스트

**고객 추가**:
1. "고객 추가" 버튼 클릭
2. 고객명 입력 (필수)
3. 고객구분 선택 (기본값: 발주처)
4. 사업자등록번호 입력 (선택, 10자리 숫자)
5. "저장" 버튼 클릭
6. 성공 toast 확인
7. 테이블에 새 고객 표시 확인

**고객 수정**:
1. 고객명 셀 더블클릭
2. 값 수정 후 Enter
3. Optimistic UI 업데이트 확인
4. 성공 toast 확인

**고객 삭제**:
1. 체크박스로 고객 선택
2. "삭제" 버튼 클릭
3. 확인 다이얼로그 확인
4. "삭제" 버튼 클릭
5. 성공 toast 확인
6. 테이블에서 제거 확인

### 9.2 사업자등록번호 테스트

**중복 검증**:
1. 기존 사업자등록번호와 동일한 번호 입력
2. 저장 시도
3. "이미 등록된 사업자등록번호입니다" 에러 확인

**포맷팅**:
1. "1234567890" 입력
2. "123-45-67890"으로 표시 확인
3. 저장 시 "1234567890"으로 저장 확인

**자기 자신 제외**:
1. 고객 A의 사업자등록번호 수정
2. 동일한 번호로 수정 (자기 자신)
3. 정상 저장 확인

### 9.3 검색 및 정렬 테스트

**검색**:
1. 검색창에 "테스트" 입력
2. 고객명에 "테스트" 포함된 고객만 표시 확인

**정렬**:
1. "고객명" 헤더 클릭
2. 오름차순 정렬 확인
3. 다시 클릭하여 내림차순 확인

### 9.4 통계 카드 테스트

**통계 업데이트**:
1. 고객 추가 (거래중)
2. 페이지 새로고침
3. "전체 고객", "거래중" 카운트 증가 확인

**거래상태 변경**:
1. 고객 A의 거래상태를 "중단"으로 변경
2. 페이지 새로고침
3. "거래중" -1, "거래중단" +1 확인

## 10. 향후 개선 사항

### 10.1 기능 개선

**거래 이력 관리**:
- 거래 시작일, 종료일 필드 추가
- 거래 이력 테이블 생성 (customers_history)
- 거래상태 변경 시 자동으로 이력 생성

**연락처 관리**:
- 다중 연락처 지원 (담당자별)
- 연락처 테이블 분리 (contacts)
- 담당 업무별 연락처 관리

**고객 분류**:
- 태그 시스템 (tags)
- 고객 등급 (A, B, C 등급)
- 고객 그룹 관리

**첨부파일**:
- 사업자등록증 파일 업로드
- 계약서 첨부
- Supabase Storage 활용

### 10.2 UX 개선

**모바일 최적화**:
- 모바일 전용 뷰 추가
- 스와이프 제스처 지원
- 축약된 정보 표시

**필터 기능**:
- 고객구분별 필터
- 거래상태별 필터
- 사업자등록 여부 필터
- 다중 필터 조합

**정렬 개선**:
- Drag & Drop 정렬 지원
- `SortableTable` 컴포넌트 활용
- `@dnd-kit` 라이브러리 사용

**Bulk 작업**:
- Excel 일괄 업로드
- 일괄 거래상태 변경
- 일괄 고객구분 변경

### 10.3 성능 최적화

**Pagination**:
- 현재 한 번에 모든 데이터 로드
- Virtual Scrolling 도입
- Server-side Pagination

**캐싱**:
- React Query 도입
- 통계 캐싱 (Supabase Function)
- Incremental Static Regeneration

### 10.4 통합 기능

**수주관리 연동**:
- 고객별 수주 내역 조회
- 고객별 매출 통계
- 고객별 미수금 관리

**통계 대시보드**:
- 월별 신규 고객 추이
- 거래중단 사유 분석
- 고객구분별 매출 비중

## 11. 관련 페이지 비교

| 항목 | 고객관리 | 회사정보 | 사원관리 | 은행계좌 |
|------|---------|---------|---------|---------|
| 패턴 | Factory + Custom | Factory | Custom | Factory + Custom |
| 코드량 | 470줄 | 84줄 | 280줄 | 95줄 |
| 컬럼 수 | 10개 | 2개 | 11개 | 5개 |
| 통계 카드 | 4개 (O) | X | X | X |
| Custom 로직 | 사업자등록번호 중복 검증 | 사업자등록번호 중복 검증 | 비밀번호 해싱, 사번 생성 | JOIN, currency |
| 포맷팅 | 사업자등록번호 (000-00-00000) | 사업자등록번호 (000-00-00000) | - | 통화 (toLocaleString) |
| 정렬 | sort_order | sort_order | created_at | created_at |
| Drag & Drop | X | X | X | X |
| 신규 행 추가 | Inline (temp-) | Inline (temp-) | FormDialog | Inline (temp-) |
| Inline 편집 | EditableCell, EditableSelectCell | EditableCell | EditableCell, EditableSelectCell | EditableCell, EditableSelectCell |

**특징 요약**:
- **Factory Pattern 효과**: 기본 CRUD 70% 재사용 (getAll, getById, delete, reorder)
- **Custom 로직 30%**: 사업자등록번호 중복 검증 추가
- **통계 카드**: 고객관리에만 4개 통계 카드 존재 (전체, 거래중, 중단, 사업자등록)
- **포맷팅**: 사업자등록번호 자동 하이픈 삽입 (000-00-00000)
- **10개 컬럼**: 고객명, 고객구분, 거래상태, 사업자등록번호, 대표자명, 대표전화, 이메일, 업체담당자, 비고, 정렬순서
- **검증**: 고객명 필수, 사업자등록번호 중복 방지, 이메일 형식 검증

## 12. 핵심 코드 스니펫

### 12.1 사업자등록번호 중복 검증

```typescript
// actions/customers.ts
export async function checkBusinessNumberDuplicate(
  businessNumber: string,
  excludeId?: string
): Promise<{ isDuplicate: boolean; error?: string }> {
  if (!businessNumber || businessNumber.trim() === '') {
    return { isDuplicate: false };
  }

  const supabase = await createClient();
  const cleanNumber = businessNumber.replace(/\D/g, '');

  const { data, error } = await supabase
    .from('customers')
    .select('id, business_number')
    .not('business_number', 'is', null);

  if (error) {
    return { isDuplicate: false, error: '사업자등록번호 검증 중 오류가 발생했습니다' };
  }

  const duplicate = data?.some((customer) => {
    if (excludeId && customer.id === excludeId) return false;
    const existingClean = customer.business_number?.replace(/\D/g, '') || '';
    return existingClean === cleanNumber && cleanNumber !== '';
  });

  return { isDuplicate: duplicate || false };
}
```

### 12.2 사업자등록번호 포맷팅

```typescript
// lib/utils.ts
export function formatBusinessNumber(value: string | null | undefined): string {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length !== 10) return value;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
}

// columns.tsx - 사용 예시
cell: ({ getValue, row }) => {
  const rawValue = getValue<string>() || '';
  const displayValue = formatBusinessNumber(rawValue);
  return <EditableCell value={displayValue} ... />;
}
```

### 12.3 통계 계산

```typescript
// page.tsx
const stats = {
  total: customers.length,
  active: customers.filter((c) => c.status === '거래중').length,
  suspended: customers.filter((c) => c.status === '중단').length,
  withBusiness: customers.filter((c) => c.business_number).length,
};

<StatsCard title="전체 고객" value={stats.total} icon={Users} />
<StatsCard title="거래중" value={stats.active} icon={UserCheck} />
<StatsCard title="거래중단" value={stats.suspended} icon={UserX} />
<StatsCard title="사업자등록" value={stats.withBusiness} icon={Building2} />
```

### 12.4 신규 행 추가

```typescript
// customers-table.tsx
const handleAddCustomer = () => {
  setNewRowData({
    id: `temp-${Date.now()}`,
    name: '',
    customer_type: '발주처',
    status: '거래중',
    business_number: '',
    representative_name: '',
    phone: '',
    email: '',
    manager_name: '',
    notes: '',
    sort_order: tableData.length + 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

const handleSaveNewRow = async () => {
  if (!newRowData || !newRowData.name) {
    toast({ variant: 'destructive', title: '입력 오류', description: '고객명은 필수 입력 항목입니다.' });
    return;
  }

  const result = await createCustomer({
    name: newRowData.name!,
    customer_type: newRowData.customer_type || '발주처',
    status: newRowData.status || '거래중',
    business_number: newRowData.business_number || '',
    representative_name: newRowData.representative_name || '',
    phone: newRowData.phone || '',
    email: newRowData.email || '',
    manager_name: newRowData.manager_name || '',
    notes: newRowData.notes || '',
    sort_order: newRowData.sort_order || tableData.length + 1,
  });

  if (result.error) {
    toast({ variant: 'destructive', title: '고객 추가 실패', description: result.error });
    return;
  }

  toast({ title: '고객 추가 완료', description: `${newRowData.name} 고객이 추가되었습니다.` });
  setNewRowData(null);
  router.refresh();
};
```
