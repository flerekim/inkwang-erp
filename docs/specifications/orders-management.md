# 수주관리 페이지 기능명세서

## 1. 개요

전체 계약 정보를 관리하는 핵심 비즈니스 페이지입니다. 신규 계약 및 변경 계약 정보, 고객, 검증업체, 담당자, 오염물질, 정화방법 등의 복잡한 관계형 데이터를 통합 관리하며, 다:다 관계(order_pollutants, order_methods)와 트랜잭션 처리를 포함합니다.

## 2. 파일 구조

```
src/
├── app/(dashboard)/inkwang-es/sales/orders/
│   ├── page.tsx                    # Server Component (관리자 권한 확인 + 데이터 페칭)
│   ├── orders-page-client.tsx      # Client Component (4개 통계 카드)
│   ├── orders-table.tsx            # 테이블 + 모바일 카드 뷰 (588줄)
│   ├── order-columns.tsx           # 14개 컬럼 정의 (인라인 편집, 442줄)
│   ├── order-form-dialog.tsx       # Dialog 폼 (오염물질, 정화방법, 400줄)
│   ├── pollutant-selector.tsx      # 오염물질 선택 컴포넌트
│   ├── method-selector.tsx         # 정화방법 선택 컴포넌트
│   └── mobile-order-card.tsx       # 모바일 카드 컴포넌트
├── actions/
│   └── orders.ts                   # Server Actions (Custom 구현, 447줄)
└── lib/
    └── validations.ts              # Zod 검증 스키마 (orderInsertSchemaRefined)
```

**총 코드량**: 약 2,000줄 (가장 복잡한 페이지)
- `orders.ts`: 447줄 (Server Actions)
- `orders-table.tsx`: 588줄 (테이블 + 모바일 뷰)
- `order-columns.tsx`: 442줄 (14개 컬럼)
- `order-form-dialog.tsx`: 400줄 (Dialog)
- 기타: 약 130줄

## 3. 주요 파일 역할

### 3.1 page.tsx (Server Component)

**역할**: 관리자 권한 확인 및 데이터 페칭

**주요 기능**:
- `requireAdmin()` - 관리자 권한 필수
- `getOrders()` - 수주 목록 조회 (JOIN된 데이터)
- 에러 처리 (throw Error)

**특징**:
- Server Component로 권한 체크
- 데이터 페칭 실패 시 에러 페이지 표시
- OrdersPageClient에 데이터 전달

### 3.2 orders-page-client.tsx (Client Component)

**역할**: 통계 카드 렌더링

**주요 기능**:
- 통계 계산 (`useMemo`)
  - 전체 계약 수
  - 진행 중 계약 수 (`contract_status === 'in_progress'`)
  - 완료 계약 수 (`contract_status === 'completed'`)
  - 계약금액 합계 (억원 단위, `(totalAmount / 100000000).toFixed(1)`)
- `StatsCard` 4개 렌더링 (lucide-react 아이콘)

**특징**:
- Client Component (useMemo 사용)
- 계약금액을 억원 단위로 표시
- 통계는 실시간 계산 (서버 계산 X)

### 3.3 orders.ts (Server Actions)

**역할**: 복잡한 Custom Server Actions (Factory Pattern 미사용)

**주요 함수**:

**1. getOrders() - 복잡한 JOIN 쿼리**:
```typescript
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    customer:customers!customer_id(id, name, business_number, customer_type),
    verification_company:customers!verification_company_id(id, name, business_number, customer_type),
    manager:users!manager_id(id, name, email),
    parent_order:orders!parent_order_id(id, order_number, contract_name),
    pollutants:order_pollutants(
      id,
      pollutant_id,
      concentration,
      group_name,
      pollutant:pollutants(id, name, category, unit)
    ),
    methods:order_methods(
      id,
      method_id,
      method:methods(id, name, description)
    )
  `)
  .order('contract_date', { ascending: false })
  .order('order_number', { ascending: false });
```

**JOIN 관계**:
- `orders` (메인 테이블)
- `customers` (customer_id) - 고객명
- `customers` (verification_company_id) - 검증업체
- `users` (manager_id) - 담당자
- `orders` (parent_order_id) - 원본 계약 (변경계약의 경우)
- `order_pollutants` → `pollutants` - 오염물질 목록
- `order_methods` → `methods` - 정화방법 목록

**2. createOrder() - 3단계 트랜잭션**:
```typescript
// 1. 메인 수주 데이터 추가 (order_number는 트리거에서 자동 생성)
const { data: order } = await supabase
  .from('orders')
  .insert({
    ...orderData,
    order_number: '', // 트리거에서 자동 생성
    created_by: user.id,
    updated_by: user.id,
  })
  .select()
  .single();

// 2. 오염물질 연결 데이터 추가
if (pollutants && pollutants.length > 0) {
  const pollutantRecords = pollutants.map((p) => ({
    order_id: order.id,
    pollutant_id: p.pollutant_id,
    concentration: Number(p.concentration) || 0,
    group_name: p.group_name || null,
  }));

  const { error: pollutantError } = await supabase
    .from('order_pollutants')
    .insert(pollutantRecords);

  if (pollutantError) {
    // 롤백: 메인 수주 데이터 삭제
    await supabase.from('orders').delete().eq('id', order.id);
    return { data: null, error: `오염물질 추가 실패: ${pollutantError.message}` };
  }
}

// 3. 정화방법 연결 데이터 추가
if (methods && methods.length > 0) {
  const methodRecords = methods.map((methodId) => ({
    order_id: order.id,
    method_id: methodId,
  }));

  const { error: methodError } = await supabase
    .from('order_methods')
    .insert(methodRecords);

  if (methodError) {
    // 롤백: 메인 수주 데이터 및 오염물질 삭제
    await supabase.from('orders').delete().eq('id', order.id);
    return { data: null, error: `정화방법 추가 실패: ${methodError.message}` };
  }
}
```

**3. updateOrder() - 삭제 후 재생성 방식**:
```typescript
// 1. 메인 수주 데이터 업데이트
if (Object.keys(orderData).length > 0) {
  await supabase
    .from('orders')
    .update({
      ...orderData,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', id);
}

// 2. 오염물질 업데이트 (삭제 후 재생성)
if (pollutants !== undefined) {
  await supabase.from('order_pollutants').delete().eq('order_id', id);

  if (pollutants && pollutants.length > 0) {
    const pollutantRecords = pollutants.map((p) => ({
      order_id: id,
      pollutant_id: p.pollutant_id,
      concentration: Number(p.concentration) || 0,
      group_name: p.group_name || null,
    }));
    await supabase.from('order_pollutants').insert(pollutantRecords);
  }
}

// 3. 정화방법 업데이트 (삭제 후 재생성)
if (methods !== undefined) {
  await supabase.from('order_methods').delete().eq('order_id', id);

  if (methods && methods.length > 0) {
    const methodRecords = methods.map((methodId) => ({
      order_id: id,
      method_id: methodId,
    }));
    await supabase.from('order_methods').insert(methodRecords);
  }
}
```

**4. deleteOrder() - CASCADE 삭제**:
```typescript
// CASCADE 설정으로 연결된 order_pollutants, order_methods도 자동 삭제됨
const { error } = await supabase.from('orders').delete().eq('id', id);
```

**5. 선택 옵션 조회 함수들**:
- `getCustomers()` - 발주처 목록 (`customer_type === '발주처'`, `status === '거래중'`)
- `getVerificationCompanies()` - 검증업체 목록 (`customer_type === '검증업체'`, `status === '거래중'`)
- `getUsers()` - 담당자 목록 (`employment_status === 'active'`)
- `getNewOrders()` - 신규 계약 목록 (`contract_type === 'new'`, 변경계약 작성 시 사용)
- `getPollutants()` - 오염물질 목록
- `getMethods()` - 정화방법 목록

**특징**:
- **Factory Pattern 미사용**: 복잡한 비즈니스 로직으로 인해 Custom 구현
- **6개 테이블 JOIN**: 복잡한 관계형 데이터 조회
- **트랜잭션 처리**: 수동 롤백 구현 (Supabase는 트랜잭션 미지원)
- **다:다 관계**: `order_pollutants`, `order_methods` 중간 테이블
- **자동 생성**: `order_number`는 데이터베이스 트리거에서 자동 생성
- **admin 권한 필수**: 모든 쓰기 작업은 admin만 가능

### 3.4 orders-table.tsx (588줄)

**역할**: 테이블 + 모바일 카드 뷰 + CRUD 로직

**주요 기능**:

**1. 상태 관리**:
```typescript
const [tableData, setTableData] = useState<OrderWithDetails[]>(data);
const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
const [newRowData, setNewRowData] = useState<Partial<OrderWithDetails> | null>(null);
const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
const [searchQuery, setSearchQuery] = useState(''); // 모바일 검색
const [customers, setCustomers] = useState<Customer[]>([]); // 관계형 데이터
```

**2. 관계형 데이터 로드** (`useEffect`):
```typescript
const [customersData, verificationData, usersData, newOrdersData] = await Promise.all([
  getCustomers(),
  getVerificationCompanies(),
  getUsers(),
  getNewOrders(),
]);
```

**3. 인라인 수정** (`handleUpdateCell`):
```typescript
const handleUpdateCell = async (rowIndex: number, columnId: string, value: string) => {
  const order = tableData[rowIndex];

  // Optimistic update
  const prevData = [...tableData];
  setTableData((old) =>
    old.map((row, idx) => (idx === rowIndex ? { ...row, [columnId]: value } : row))
  );

  try {
    const result = await updateOrder(order.id, { [columnId]: value });
    if (result.error) {
      setTableData(prevData); // Rollback
      toast({ variant: 'destructive', title: '수정 실패', description: result.error });
      throw new Error(result.error);
    }

    toast({ title: '수정 완료', description: '수주 정보가 수정되었습니다.' });
    router.refresh();
  } catch (error) {
    throw error;
  }
};
```

**4. 신규 행 추가** (`handleAddOrder`, `handleSaveNewRow`):
```typescript
const handleAddOrder = () => {
  const tempId = `temp-${Date.now()}`;
  const newRow: Partial<OrderWithDetails> = {
    id: tempId,
    order_number: '자동생성',
    contract_type: 'new',
    contract_status: 'quotation',
    business_type: 'civilian',
    pricing_type: 'total',
    export_type: 'on_site',
    contract_name: '',
    contract_date: new Date().toISOString().split('T')[0],
    contract_amount: 0,
    customer_id: customers[0]?.id || '',
    verification_company_id: null,
    manager_id: null,
    parent_order_id: null,
    notes: null,
    pollutants: [],
    methods: [],
  };
  setNewRowData(newRow);
};
```

**5. 복잡한 필드 편집** (`handleEditDetails`):
```typescript
// 오염물질, 정화방법은 Dialog로 편집
const handleEditDetails = (order: OrderWithDetails) => {
  setEditingOrder(order);
  setDetailsDialogOpen(true);
};
```

**6. 모바일 카드 뷰**:
```typescript
<div className="md:hidden space-y-4">
  <input
    type="text"
    placeholder="계약명, 계약번호, 고객명 검색..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />

  <div className="space-y-3">
    {filteredMobileData.map((order) => (
      <MobileOrderCard
        key={order.id}
        order={order}
        isSelected={isSelected}
        onSelectChange={setRowSelection}
        onCardClick={() => handleEditDetails(order)}
      />
    ))}
  </div>
</div>
```

**특징**:
- 데스크톱 (`hidden md:block`) + 모바일 (`md:hidden`) 분리
- 관계형 데이터 병렬 로드 (`Promise.all`)
- Escape 키로 신규 행 취소
- Excel/Print 내보내기 (계약금액 "억원" 표시)

### 3.5 order-columns.tsx (442줄)

**역할**: 14개 컬럼 정의 (인라인 편집 지원)

**컬럼 구조** (14개):
1. **select** (체크박스) - 신규 행은 선택 불가
2. **order_number** (수주번호) - 자동생성 (읽기 전용)
3. **contract_type** (계약구분) - `EditableSelectCell` (Select)
   - 선택지: 신규 (new), 변경 (change)
   - Badge 스타일 (신규: default, 변경: secondary)
4. **contract_status** (계약상태) - `EditableSelectCell` (Select)
   - 선택지: 견적 (quotation), 계약 (contract), 진행 (in_progress), 완료 (completed)
   - Badge 스타일 (상태별 색상)
5. **contract_name** (계약명) - `EditableCell` (필수)
6. **customer_id** (고객명) - `EditableSelectCell` (Combobox, 필수)
7. **contract_date** (계약일) - `EditableDateCell`
8. **contract_amount** (계약금액) - `EditableCell` (type="number")
9. **verification_company_id** (검증업체) - `EditableSelectCell` (Combobox, 선택)
10. **manager_id** (담당자) - `EditableSelectCell` (Combobox, 선택)
11. **business_type** (구분) - `EditableSelectCell` (Select)
    - 선택지: 민수 (civilian), 관수 (government)
    - Badge 스타일
12. **pricing_type** (계약유형) - `EditableSelectCell` (Select)
    - 선택지: 총액계약 (total), 단가계약 (unit_price)
13. **export_type** (반출여부) - `EditableSelectCell` (Select)
    - 선택지: 부지내 (on_site), 반출 (export)
14. **pollutants** (오염물질) - 요약 정보 + "편집" 버튼 (Dialog)
15. **methods** (정화방법) - 요약 정보 + "편집" 버튼 (Dialog)

**특징**:
- `isNewRow` 검증 (`row.original.id?.startsWith('temp-')`)
- Badge 컴포넌트로 시각적 구분 (계약구분, 계약상태, 구분)
- 오염물질, 정화방법은 인라인 편집 불가 (Dialog로 편집)
- 신규 행은 `border border-primary/50` 스타일

### 3.6 order-form-dialog.tsx (400줄)

**역할**: Dialog 폼 (오염물질, 정화방법 선택)

**주요 기능**:
- **React Hook Form** + **Zod 검증** (`orderInsertSchemaRefined`)
- 관계형 데이터 로드 (customers, verificationCompanies, users, newOrders, pollutants, methods)
- **변경계약 시 원본 계약 선택** (조건부 렌더링)
  ```typescript
  {form.watch('contract_type') === 'change' && (
    <div>
      <Label>원본 계약 *</Label>
      <Select value={form.watch('parent_order_id') || ''}>
        {newOrders.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            [{o.order_number}] {o.contract_name}
          </SelectItem>
        ))}
      </Select>
    </div>
  )}
  ```
- **PollutantSelector** 컴포넌트 (오염물질 선택)
- **MethodSelector** 컴포넌트 (정화방법 선택)
- 비고 (Textarea)

**특징**:
- Dialog 크기: `max-w-3xl`, `max-h-[90vh]`
- 추가/수정 모드 분기 (`order ? '수정' : '추가'`)
- 제출 중 로딩 (`isSubmitting`)
- 폼 검증 에러 표시

### 3.7 validations.ts (Zod 스키마)

**수주 검증 스키마**:
```typescript
export const orderInsertSchema = z.object({
  // 계약 기본 정보
  contract_type: z.enum(['new', 'change'], {
    required_error: '계약구분을 선택해주세요',
  }),
  contract_status: z.enum(['quotation', 'contract', 'in_progress', 'completed'], {
    required_error: '계약상태를 선택해주세요',
  }),
  business_type: z.enum(['civilian', 'government'], {
    required_error: '구분을 선택해주세요',
  }),
  pricing_type: z.enum(['total', 'unit_price'], {
    required_error: '계약유형을 선택해주세요',
  }),

  // 계약 상세
  contract_name: z
    .string({ required_error: '계약명을 입력해주세요' })
    .min(1, '계약명을 입력해주세요')
    .max(500, '계약명은 500자를 초과할 수 없습니다'),
  contract_date: z
    .string({ required_error: '계약일을 선택해주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식(YYYY-MM-DD)이 아닙니다'),
  contract_amount: z
    .number({ required_error: '계약금액을 입력해주세요' })
    .nonnegative('계약금액은 0 이상이어야 합니다')
    .max(999999999999.99, '계약금액이 너무 큽니다'),

  // 관계형 데이터
  customer_id: z.string().uuid('올바른 고객을 선택해주세요'),
  verification_company_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  parent_order_id: z.string().uuid().nullable().optional(),

  // 기타
  export_type: z.enum(['on_site', 'export'], {
    required_error: '반출여부를 선택해주세요',
  }),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional(),

  // 오염물질 배열
  pollutants: z
    .array(pollutantInputSchema)
    .min(1, '최소 1개 이상의 오염물질을 선택해주세요'),

  // 정화방법 배열
  methods: z
    .array(z.string().uuid())
    .min(1, '최소 1개 이상의 정화방법을 선택해주세요'),
});

// 변경계약의 경우 parent_order_id 필수 검증
export const orderInsertSchemaRefined = orderInsertSchema.refine(
  (data) => {
    if (data.contract_type === 'change') {
      return !!data.parent_order_id;
    }
    return true;
  },
  {
    message: '변경계약의 경우 원본 계약을 선택해주세요',
    path: ['parent_order_id'],
  }
);
```

**검증 규칙**:
- 계약명: 필수, 최소 1자, 최대 500자
- 계약일: YYYY-MM-DD 형식 필수
- 계약금액: 0 이상, 최대 999,999,999,999.99
- 고객명: UUID 필수
- 오염물질: 최소 1개 이상
- 정화방법: 최소 1개 이상
- **변경계약**: `parent_order_id` 필수 (`refine`)

## 4. 데이터 흐름

### 4.1 초기 로딩 (Server Side)
```
1. page.tsx (Server Component)
   ↓ requireAdmin()
2. 관리자 권한 확인
   ↓
3. getOrders() Server Action
   ↓ 6개 테이블 JOIN
4. Supabase Query (복잡한 관계형 데이터)
   ↓
5. OrdersPageClient (Client Component)
   ↓ 통계 계산 (useMemo)
6. OrdersTable (테이블 + 모바일 뷰)
```

### 4.2 수주 추가 (3단계 트랜잭션)
```
1. "수주 추가" 버튼 클릭
   ↓
2. newRowData 생성 (temp-${Date.now()})
   ↓
3. 인라인 편집 (기본 필드만)
   ↓ handleUpdateNewRow
4. "편집" 버튼 클릭 (오염물질, 정화방법)
   ↓
5. OrderFormDialog 열기
   ↓ PollutantSelector, MethodSelector
6. "저장" 버튼 클릭
   ↓ React Hook Form 검증
7. createOrder() Server Action
   ↓ 3단계 트랜잭션
8. Step 1: orders 테이블에 INSERT (order_number 자동 생성)
   ↓
9. Step 2: order_pollutants 테이블에 INSERT
   ↓ 실패 시 orders 삭제 (롤백)
10. Step 3: order_methods 테이블에 INSERT
   ↓ 실패 시 orders, order_pollutants 삭제 (롤백)
11. revalidatePath('/inkwang-es/sales/orders')
   ↓
12. router.refresh() → 페이지 재조회
```

### 4.3 수주 수정 (Optimistic Update + Dialog)
```
1. EditableCell 더블클릭 (기본 필드)
   ↓
2. 값 수정 후 Enter 또는 외부 클릭
   ↓ handleUpdateCell
3. Optimistic UI 업데이트 (즉시 반영)
   ↓
4. updateOrder() Server Action
   ↓ 메인 수주 데이터만 UPDATE
5. Supabase Update
   ↓ 성공 시 revalidatePath
6. router.refresh() → 최신 데이터 동기화

-- 또는 --

1. "편집" 버튼 클릭 (오염물질, 정화방법)
   ↓
2. OrderFormDialog 열기
   ↓
3. PollutantSelector, MethodSelector 수정
   ↓
4. "수정" 버튼 클릭
   ↓ React Hook Form 검증
5. updateOrder() Server Action
   ↓ 삭제 후 재생성 방식
6. Step 1: 메인 수주 데이터 UPDATE
   ↓
7. Step 2: order_pollutants DELETE → INSERT
   ↓
8. Step 3: order_methods DELETE → INSERT
   ↓
9. revalidatePath + router.refresh()
```

### 4.4 수주 삭제 (CASCADE)
```
1. 체크박스로 수주 선택
   ↓
2. "삭제" 버튼 클릭
   ↓
3. DeleteConfirmDialog 확인
   ↓
4. Promise.allSettled로 병렬 삭제
   ↓ deleteOrder(id)
5. Supabase Delete (orders 테이블)
   ↓ CASCADE 설정으로 자동 삭제
6. order_pollutants, order_methods 자동 삭제
   ↓
7. 성공/실패 카운트 toast 표시
   ↓
8. router.refresh() → 페이지 재조회
```

## 5. 주요 기능

### 5.1 통계 카드 (4개)

**통계 계산** (`useMemo`):
```typescript
const stats = useMemo(() => {
  const total = orders.length;
  const inProgress = orders.filter((o) => o.contract_status === 'in_progress').length;
  const completed = orders.filter((o) => o.contract_status === 'completed').length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.contract_amount), 0);

  return { total, inProgress, completed, totalAmount };
}, [orders]);
```

**카드 표시**:
- **전체 계약**: 등록된 전체 계약 수
- **진행 중**: `contract_status === 'in_progress'`
- **완료**: `contract_status === 'completed'`
- **계약금액 합계**: `(totalAmount / 100000000).toFixed(1)억원` (억원 단위)

**특징**:
- Client-side 계산 (실시간)
- lucide-react 아이콘 (`FileText`, `Clock`, `CheckCircle`, `DollarSign`)

### 5.2 계약구분 (신규/변경)

**선택지**:
- **신규** (new): 일반적인 신규 계약
- **변경** (change): 기존 계약의 변경계약

**변경계약 로직**:
```typescript
// order-form-dialog.tsx
{form.watch('contract_type') === 'change' && (
  <div>
    <Label>원본 계약 *</Label>
    <Select value={form.watch('parent_order_id') || ''}>
      {newOrders.map((o) => (
        <SelectItem key={o.id} value={o.id}>
          [{o.order_number}] {o.contract_name}
        </SelectItem>
      ))}
    </Select>
  </div>
)}

// validations.ts - Zod 검증
export const orderInsertSchemaRefined = orderInsertSchema.refine(
  (data) => {
    if (data.contract_type === 'change') {
      return !!data.parent_order_id;
    }
    return true;
  },
  {
    message: '변경계약의 경우 원본 계약을 선택해주세요',
    path: ['parent_order_id'],
  }
);
```

**특징**:
- 변경계약 선택 시 `parent_order_id` 필드 표시
- `parent_order_id`는 신규 계약(`contract_type === 'new'`)만 선택 가능
- Zod의 `refine`으로 조건부 필수 검증

### 5.3 계약상태 (견적/계약/진행/완료)

**선택지**:
- **견적** (quotation): 견적 단계
- **계약** (contract): 계약 체결
- **진행** (in_progress): 작업 진행 중
- **완료** (completed): 작업 완료

**Badge 스타일**:
```typescript
const statusBadgeVariant = (s: string) => {
  switch (s) {
    case 'quotation': return 'outline';
    case 'contract': return 'secondary';
    case 'in_progress': return 'default';
    case 'completed': return 'default';
    default: return 'outline';
  }
};
```

**특징**:
- Badge 컴포넌트로 시각적 구분
- 통계 카드와 연동 (진행 중, 완료)

### 5.4 오염물질 관리 (다:다 관계)

**데이터 구조**:
```typescript
// order_pollutants 테이블 (중간 테이블)
{
  id: UUID,
  order_id: UUID, // → orders.id
  pollutant_id: UUID, // → pollutants.id
  concentration: number, // 농도
  group_name: string | null, // 그룹명 (선택)
}

// pollutants 테이블 (마스터 데이터)
{
  id: UUID,
  name: string,
  category: string,
  unit: string,
  sort_order: number,
}
```

**PollutantSelector 컴포넌트**:
- 오염물질 목록 선택 (다중 선택)
- 각 오염물질별 농도 입력
- 그룹명 입력 (선택)
- 추가/삭제 기능

**저장 로직**:
```typescript
// createOrder()
if (pollutants && pollutants.length > 0) {
  const pollutantRecords = pollutants.map((p) => ({
    order_id: order.id,
    pollutant_id: p.pollutant_id,
    concentration: Number(p.concentration) || 0,
    group_name: p.group_name || null,
  }));

  const { error } = await supabase
    .from('order_pollutants')
    .insert(pollutantRecords);

  if (error) {
    // 롤백: 메인 수주 데이터 삭제
    await supabase.from('orders').delete().eq('id', order.id);
    return { error: `오염물질 추가 실패: ${error.message}` };
  }
}
```

**특징**:
- 최소 1개 이상 필수 (`min(1)`)
- 농도는 문자열로 입력 → 숫자로 변환 저장
- 실패 시 메인 수주 데이터 롤백

### 5.5 정화방법 관리 (다:다 관계)

**데이터 구조**:
```typescript
// order_methods 테이블 (중간 테이블)
{
  id: UUID,
  order_id: UUID, // → orders.id
  method_id: UUID, // → methods.id
}

// methods 테이블 (마스터 데이터)
{
  id: UUID,
  name: string,
  description: string,
  sort_order: number,
}
```

**MethodSelector 컴포넌트**:
- 정화방법 목록 선택 (다중 선택)
- 체크박스 또는 드롭다운
- 추가/삭제 기능

**저장 로직**:
```typescript
// createOrder()
if (methods && methods.length > 0) {
  const methodRecords = methods.map((methodId) => ({
    order_id: order.id,
    method_id: methodId,
  }));

  const { error } = await supabase
    .from('order_methods')
    .insert(methodRecords);

  if (error) {
    // 롤백: 메인 수주 데이터 및 오염물질 삭제
    await supabase.from('orders').delete().eq('id', order.id);
    return { error: `정화방법 추가 실패: ${error.message}` };
  }
}
```

**특징**:
- 최소 1개 이상 필수 (`min(1)`)
- 실패 시 메인 수주 데이터 + 오염물질 롤백

### 5.6 인라인 편집 + Dialog 편집

**인라인 편집 가능 필드** (EditableCell, EditableSelectCell, EditableDateCell):
- 계약명 (`EditableCell`)
- 계약일 (`EditableDateCell`)
- 계약금액 (`EditableCell`, type="number")
- 계약구분 (`EditableSelectCell`, Select)
- 계약상태 (`EditableSelectCell`, Select)
- 구분 (`EditableSelectCell`, Select)
- 계약유형 (`EditableSelectCell`, Select)
- 반출여부 (`EditableSelectCell`, Select)
- 고객명 (`EditableSelectCell`, Combobox)
- 검증업체 (`EditableSelectCell`, Combobox)
- 담당자 (`EditableSelectCell`, Combobox)

**Dialog 편집 필드**:
- 오염물질 (`PollutantSelector` - 복잡한 배열)
- 정화방법 (`MethodSelector` - 다중 선택)
- 비고 (`Textarea` - 긴 텍스트)

**특징**:
- 기본 필드는 인라인 편집 (빠른 수정)
- 복잡한 필드는 Dialog 편집 (상세 편집)
- "편집" 버튼으로 Dialog 열기

### 5.7 모바일 카드 뷰

**데스크톱 vs 모바일**:
```typescript
{/* 데스크톱: 테이블 뷰 */}
<div className="hidden md:block">
  <DataTable columns={columns} data={displayData} />
</div>

{/* 모바일: 카드 뷰 */}
<div className="md:hidden space-y-4">
  <input type="text" placeholder="계약명, 계약번호, 고객명 검색..." />
  <div className="space-y-3">
    {filteredMobileData.map((order) => (
      <MobileOrderCard
        order={order}
        isSelected={isSelected}
        onSelectChange={setRowSelection}
        onCardClick={() => handleEditDetails(order)}
      />
    ))}
  </div>
</div>
```

**모바일 검색**:
```typescript
const filteredMobileData = useMemo(() => {
  if (!searchQuery.trim()) return displayData;

  const query = searchQuery.toLowerCase();
  return displayData.filter((order) => {
    return (
      order.contract_name?.toLowerCase().includes(query) ||
      order.order_number?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.contract_status?.toLowerCase().includes(query)
    );
  });
}, [displayData, searchQuery]);
```

**특징**:
- Tailwind CSS의 `md:` 브레이크포인트 사용
- 모바일은 카드 클릭으로 상세 편집
- 모바일 전용 검색 입력 필드

### 5.8 트랜잭션 처리 (수동 롤백)

**Supabase의 한계**:
- Supabase는 클라이언트 라이브러리에서 트랜잭션을 지원하지 않음
- 수동으로 롤백 구현 필요

**롤백 로직**:
```typescript
// createOrder()
// Step 1: orders 테이블 INSERT
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({ ...orderData })
  .select()
  .single();

if (orderError) {
  return { error: `수주 생성 실패: ${orderError.message}` };
}

// Step 2: order_pollutants 테이블 INSERT
const { error: pollutantError } = await supabase
  .from('order_pollutants')
  .insert(pollutantRecords);

if (pollutantError) {
  // 롤백: Step 1에서 생성한 order 삭제
  await supabase.from('orders').delete().eq('id', order.id);
  return { error: `오염물질 추가 실패: ${pollutantError.message}` };
}

// Step 3: order_methods 테이블 INSERT
const { error: methodError } = await supabase
  .from('order_methods')
  .insert(methodRecords);

if (methodError) {
  // 롤백: Step 1, 2에서 생성한 order, pollutants 삭제
  // order를 삭제하면 CASCADE로 pollutants도 자동 삭제됨
  await supabase.from('orders').delete().eq('id', order.id);
  return { error: `정화방법 추가 실패: ${methodError.message}` };
}
```

**특징**:
- 각 단계에서 에러 발생 시 이전 단계 데이터 삭제
- CASCADE 설정 활용 (order 삭제 시 연결 데이터 자동 삭제)
- try-catch로 예외 처리

## 6. 보안 및 권한

### 6.1 관리자 권한 필수

```typescript
// page.tsx
export default async function OrdersPage() {
  await requireAdmin(); // 관리자 권한 필수
  const result = await getOrders();
  return <OrdersPageClient orders={result.data || []} />;
}

// orders.ts - 모든 쓰기 작업
export async function createOrder(formData: OrderFormData) {
  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (currentUser?.role !== 'admin') {
    return { data: null, error: '권한이 없습니다' };
  }
  // ...
}
```

### 6.2 인증 체크

- 모든 Server Actions는 `getUser()` 자동 실행
- 미인증 시 에러 반환
- admin 권한 없이 쓰기 작업 시 에러

### 6.3 XSS 방지

- React의 자동 이스케이프
- Zod 검증으로 입력값 필터링
- Supabase Prepared Statements

## 7. 성능 최적화

### 7.1 관계형 데이터 병렬 로드

```typescript
// orders-table.tsx
const [customersData, verificationData, usersData, newOrdersData] = await Promise.all([
  getCustomers(),
  getVerificationCompanies(),
  getUsers(),
  getNewOrders(),
]);
```

**장점**:
- 6개 API 요청을 병렬로 처리
- 대기 시간 최소화

### 7.2 Optimistic Update

```typescript
// handleUpdateCell
const prevData = [...tableData];
setTableData((old) =>
  old.map((row, idx) => (idx === rowIndex ? { ...row, [columnId]: value } : row))
);

try {
  const result = await updateOrder(order.id, { [columnId]: value });
  if (result.error) {
    setTableData(prevData); // Rollback
    throw new Error(result.error);
  }
  router.refresh();
} catch (error) {
  throw error;
}
```

**장점**:
- 즉각적인 UI 반응
- 실패 시 자동 롤백

### 7.3 useMemo 최적화

```typescript
// orders-page-client.tsx
const stats = useMemo(() => {
  const total = orders.length;
  const inProgress = orders.filter((o) => o.contract_status === 'in_progress').length;
  // ...
  return { total, inProgress, completed, totalAmount };
}, [orders]);

// orders-table.tsx
const displayData = useMemo(() => {
  return newRowData ? [newRowData as OrderWithDetails, ...tableData] : tableData;
}, [tableData, newRowData]);

const filteredMobileData = useMemo(() => {
  // ...
}, [displayData, searchQuery]);
```

**장점**:
- 통계 계산 캐싱
- 불필요한 재계산 방지

### 7.4 병렬 삭제

```typescript
const results = await Promise.allSettled(
  selectedOrders.map((order) => deleteOrder(order.id))
);
```

**장점**:
- 다중 삭제를 병렬로 처리
- 일부 실패해도 나머지 계속 실행

## 8. 에러 처리

### 8.1 입력 검증

```typescript
// orders-table.tsx
if (!newRowData || !newRowData.contract_name?.trim()) {
  toast({ variant: 'destructive', title: '입력 오류', description: '계약명을 입력해주세요.' });
  return;
}

if (!newRowData.customer_id) {
  toast({ variant: 'destructive', title: '입력 오류', description: '고객을 선택해주세요.' });
  return;
}

// order-form-dialog.tsx - React Hook Form + Zod
const form = useForm<OrderFormData>({
  resolver: zodResolver(orderInsertSchemaRefined),
});
```

### 8.2 트랜잭션 에러 처리

```typescript
// createOrder()
if (pollutantError) {
  // 롤백: 메인 수주 데이터 삭제
  await supabase.from('orders').delete().eq('id', order.id);
  return { data: null, error: `오염물질 추가 실패: ${pollutantError.message}` };
}
```

### 8.3 Toast 알림

```typescript
// 성공
toast({ title: '추가 완료', description: '새로운 수주가 추가되었습니다.' });

// 실패
toast({ variant: 'destructive', title: '추가 실패', description: result.error });

// 일부 실패
toast({
  variant: 'destructive',
  title: '일부 삭제 실패',
  description: `${successes.length}건 삭제 성공, ${failures.length}건 실패`
});
```

## 9. 테스트 시나리오

### 9.1 CRUD 테스트

**수주 추가**:
1. "수주 추가" 버튼 클릭
2. 기본 정보 입력 (계약명, 계약일, 계약금액, 고객명)
3. 계약구분 선택 (신규/변경)
4. "편집" 버튼 클릭 (Dialog 열기)
5. 오염물질 선택 및 농도 입력 (최소 1개)
6. 정화방법 선택 (최소 1개)
7. "추가" 버튼 클릭
8. 성공 toast 확인
9. 수주번호 자동 생성 확인
10. 테이블에 새 수주 표시 확인

**수주 수정** (인라인):
1. 계약명 셀 더블클릭
2. 값 수정 후 Enter
3. Optimistic UI 업데이트 확인
4. 성공 toast 확인

**수주 수정** (Dialog):
1. 오염물질 "편집" 버튼 클릭
2. Dialog에서 오염물질 추가/삭제/수정
3. "수정" 버튼 클릭
4. 성공 toast 확인
5. 변경 사항 반영 확인

**수주 삭제**:
1. 체크박스로 수주 선택
2. "삭제" 버튼 클릭
3. 확인 다이얼로그 확인
4. "삭제" 버튼 클릭
5. 성공 toast 확인
6. 연결된 오염물질, 정화방법도 삭제 확인 (CASCADE)

### 9.2 변경계약 테스트

**변경계약 추가**:
1. 계약구분 "변경" 선택
2. "원본 계약" 필드 표시 확인
3. 원본 계약 선택 (신규 계약만 표시)
4. 원본 계약 선택하지 않고 저장 시도
5. "변경계약의 경우 원본 계약을 선택해주세요" 에러 확인
6. 원본 계약 선택 후 저장
7. parent_order_id 저장 확인

### 9.3 오염물질/정화방법 테스트

**오염물질 추가 없이 저장**:
1. 수주 추가 Dialog 열기
2. 기본 정보만 입력
3. 오염물질 선택하지 않고 저장 시도
4. "최소 1개 이상의 오염물질을 선택해주세요" 에러 확인

**정화방법 추가 없이 저장**:
1. 오염물질은 선택
2. 정화방법 선택하지 않고 저장 시도
3. "최소 1개 이상의 정화방법을 선택해주세요" 에러 확인

**다중 오염물질 추가**:
1. 오염물질 3개 선택
2. 각각 농도 입력
3. 저장 후 order_pollutants 테이블 확인 (3개 레코드)

**다중 정화방법 추가**:
1. 정화방법 5개 선택
2. 저장 후 order_methods 테이블 확인 (5개 레코드)

### 9.4 트랜잭션 테스트

**오염물질 추가 실패 시 롤백**:
1. 수주 추가 시도
2. orders 테이블 INSERT 성공
3. order_pollutants 테이블 INSERT 실패 (외래 키 제약 위반 등)
4. orders 테이블에서 해당 레코드 삭제 확인 (롤백)

**정화방법 추가 실패 시 롤백**:
1. 수주 추가 시도
2. orders, order_pollutants INSERT 성공
3. order_methods INSERT 실패
4. orders, order_pollutants 테이블에서 해당 레코드 삭제 확인 (롤백)

### 9.5 통계 카드 테스트

**통계 업데이트**:
1. 수주 추가 (진행 중)
2. 페이지 새로고침
3. "전체 계약", "진행 중" 카운트 증가 확인

**계약금액 합계**:
1. 계약금액 1억원 수주 추가
2. 페이지 새로고침
3. "계약금액 합계" 0.1억원 증가 확인

**계약상태 변경**:
1. 수주 A의 계약상태를 "완료"로 변경
2. 페이지 새로고침
3. "진행 중" -1, "완료" +1 확인

### 9.6 모바일 뷰 테스트

**모바일 카드 뷰**:
1. 모바일 기기 또는 개발자 도구로 화면 축소
2. 카드 뷰 표시 확인
3. 검색 입력 필드 확인

**모바일 검색**:
1. 검색창에 "테스트" 입력
2. 계약명, 계약번호, 고객명에 "테스트" 포함된 카드만 표시 확인

**모바일 편집**:
1. 카드 클릭
2. OrderFormDialog 열림 확인
3. 수정 후 저장
4. 카드 뷰 업데이트 확인

## 10. 향후 개선 사항

### 10.1 기능 개선

**첨부파일 관리**:
- Supabase Storage 활용
- 계약서, 견적서 등 파일 업로드
- 파일 다운로드 및 미리보기

**수주번호 자동 생성 커스터마이징**:
- 현재: 데이터베이스 트리거에서 자동 생성
- 개선: 연도별, 고객별, 계약구분별 구분 코드

**계약 진행 상태 추적**:
- 단계별 상태 관리 (견적 → 계약 → 진행 → 완료)
- 각 단계별 일자 기록
- 진행률 표시 (%)

**수주 템플릿**:
- 자주 사용하는 수주 정보 템플릿 저장
- 템플릿 기반 빠른 수주 추가

**알림 기능**:
- 계약 만료일 알림
- 계약상태 변경 알림
- 담당자 변경 알림

### 10.2 UX 개선

**필터 기능**:
- 계약구분별 필터
- 계약상태별 필터
- 고객별 필터
- 담당자별 필터
- 계약일 범위 필터
- 다중 필터 조합

**정렬 개선**:
- 다중 컬럼 정렬
- 정렬 순서 저장 (사용자 설정)

**Bulk 작업**:
- 일괄 계약상태 변경
- 일괄 담당자 변경
- Excel 일괄 업로드

**대시보드**:
- 월별 계약 추이 그래프
- 고객별 계약 현황
- 담당자별 계약 현황
- 계약금액 추이 (월별, 분기별)

### 10.3 성능 최적화

**Pagination**:
- 현재 한 번에 모든 데이터 로드
- Virtual Scrolling 도입
- Server-side Pagination

**캐싱**:
- React Query 도입
- 관계형 데이터 캐싱 (customers, verificationCompanies, users)
- Incremental Static Regeneration

**트랜잭션 개선**:
- Supabase Database Functions (Postgres 함수) 활용
- Atomic 트랜잭션 처리
- 롤백 로직 간소화

### 10.4 통합 기능

**고객관리 연동**:
- 고객 상세 페이지에서 수주 목록 조회
- 고객별 계약금액 통계

**사원관리 연동**:
- 담당자(사원) 상세 페이지에서 수주 목록 조회
- 담당자별 계약금액 통계

**재무관리 연동**:
- 계약금액 → 입금 관리
- 계약별 입금 내역 추적
- 미수금 관리

**보고서 생성**:
- 계약 현황 보고서 (PDF)
- 월별 계약 통계 보고서
- 고객별 계약 보고서

### 10.5 데이터 무결성

**Soft Delete**:
- 현재: 하드 삭제 (DELETE)
- 개선: Soft Delete (deleted_at 필드)
- 삭제된 수주 복구 기능

**변경 이력 관리**:
- 수주 변경 이력 테이블 (orders_history)
- 누가, 언제, 무엇을 변경했는지 기록
- 변경 이력 조회 기능

**감사 로그**:
- 모든 CRUD 작업 로그
- 사용자 행동 추적
- 보안 감사

## 11. 관련 페이지 비교

| 항목 | 수주관리 | 고객관리 | 사원관리 | 은행계좌 |
|------|---------|---------|---------|---------|
| 패턴 | Custom (100%) | Factory + Custom | Custom | Factory + Custom |
| 코드량 | 2,000줄 | 470줄 | 280줄 | 95줄 |
| 컬럼 수 | 14개 | 10개 | 11개 | 5개 |
| 통계 카드 | 4개 (O) | 4개 (O) | X | X |
| JOIN 테이블 | 6개 (복잡) | 0개 | 4개 (중간) | 1개 (단순) |
| 다:다 관계 | 2개 (pollutants, methods) | X | X | X |
| 트랜잭션 | 3단계 (수동 롤백) | X | X | X |
| 모바일 뷰 | 카드 뷰 (O) | X | X | X |
| Dialog 편집 | O (오염물질, 정화방법) | X | O (FormDialog) | X |
| Inline 편집 | O (기본 필드만) | O (전체) | O (전체) | O (전체) |
| 자동 생성 | order_number (트리거) | - | employee_number (서버) | - |
| 필수 검증 | 5개 (계약명, 고객, 오염물질, 정화방법, 변경계약 조건) | 1개 (고객명) | 2개 (이메일, 비밀번호) | 4개 (company_id, bank_name, account_number, initial_balance) |
| Custom 비율 | 100% | 30% | 100% | 30% |

**특징 요약**:
- **가장 복잡한 페이지**: 2,000줄, 6개 테이블 JOIN, 다:다 관계 2개
- **Custom 구현**: Factory Pattern 미사용 (비즈니스 로직 복잡도)
- **트랜잭션 처리**: 3단계 INSERT with 수동 롤백
- **통계 카드 "억원"**: 계약금액 합계를 억원 단위로 표시
- **모바일 카드 뷰**: 유일하게 모바일 전용 뷰 제공
- **Dialog 편집**: 복잡한 필드(오염물질, 정화방법)는 Dialog로 편집
- **14개 컬럼**: 가장 많은 컬럼 수 (계약 정보 복잡도)

## 12. 핵심 코드 스니펫

### 12.1 복잡한 JOIN 쿼리

```typescript
// orders.ts
export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(id, name, business_number, customer_type),
      verification_company:customers!verification_company_id(id, name, business_number, customer_type),
      manager:users!manager_id(id, name, email),
      parent_order:orders!parent_order_id(id, order_number, contract_name),
      pollutants:order_pollutants(
        id,
        pollutant_id,
        concentration,
        group_name,
        pollutant:pollutants(id, name, category, unit)
      ),
      methods:order_methods(
        id,
        method_id,
        method:methods(id, name, description)
      )
    `)
    .order('contract_date', { ascending: false })
    .order('order_number', { ascending: false });

  return { data: data as OrderWithDetails[], error: null };
}
```

### 12.2 3단계 트랜잭션 (수동 롤백)

```typescript
// orders.ts
export async function createOrder(formData: OrderFormData) {
  // 1. 메인 수주 데이터 추가
  const { pollutants, methods, ...orderData } = formData;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      ...orderData,
      order_number: '', // 트리거에서 자동 생성
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (orderError) {
    return { data: null, error: `수주 생성 실패: ${orderError.message}` };
  }

  // 2. 오염물질 연결 데이터 추가
  if (pollutants && pollutants.length > 0) {
    const pollutantRecords = pollutants.map((p) => ({
      order_id: order.id,
      pollutant_id: p.pollutant_id,
      concentration: Number(p.concentration) || 0,
      group_name: p.group_name || null,
    }));

    const { error: pollutantError } = await supabase
      .from('order_pollutants')
      .insert(pollutantRecords);

    if (pollutantError) {
      // 롤백: 메인 수주 데이터 삭제
      await supabase.from('orders').delete().eq('id', order.id);
      return { data: null, error: `오염물질 추가 실패: ${pollutantError.message}` };
    }
  }

  // 3. 정화방법 연결 데이터 추가
  if (methods && methods.length > 0) {
    const methodRecords = methods.map((methodId) => ({
      order_id: order.id,
      method_id: methodId,
    }));

    const { error: methodError } = await supabase
      .from('order_methods')
      .insert(methodRecords);

    if (methodError) {
      // 롤백: 메인 수주 데이터 및 오염물질 삭제
      await supabase.from('orders').delete().eq('id', order.id);
      return { data: null, error: `정화방법 추가 실패: ${methodError.message}` };
    }
  }

  revalidatePath('/inkwang-es/sales/orders');
  return { data: order, error: null };
}
```

### 12.3 변경계약 조건부 검증

```typescript
// validations.ts
export const orderInsertSchemaRefined = orderInsertSchema.refine(
  (data) => {
    if (data.contract_type === 'change') {
      return !!data.parent_order_id;
    }
    return true;
  },
  {
    message: '변경계약의 경우 원본 계약을 선택해주세요',
    path: ['parent_order_id'],
  }
);

// order-form-dialog.tsx
{form.watch('contract_type') === 'change' && (
  <div>
    <Label>원본 계약 *</Label>
    <Select
      value={form.watch('parent_order_id') || ''}
      onValueChange={(value) => form.setValue('parent_order_id', value || null)}
    >
      <SelectTrigger>
        <SelectValue placeholder="원본 계약 선택" />
      </SelectTrigger>
      <SelectContent>
        {newOrders.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            [{o.order_number}] {o.contract_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {form.formState.errors.parent_order_id && (
      <p className="text-sm text-destructive mt-1">
        {form.formState.errors.parent_order_id.message}
      </p>
    )}
  </div>
)}
```

### 12.4 통계 계산 (억원 단위)

```typescript
// orders-page-client.tsx
const stats = useMemo(() => {
  const total = orders.length;
  const inProgress = orders.filter((o) => o.contract_status === 'in_progress').length;
  const completed = orders.filter((o) => o.contract_status === 'completed').length;
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.contract_amount), 0);

  return { total, inProgress, completed, totalAmount };
}, [orders]);

<StatsCard
  title="계약금액 합계"
  value={`${(stats.totalAmount / 100000000).toFixed(1)}억원`}
  description="전체 계약금액"
  icon={DollarSign}
/>
```

### 12.5 모바일 검색 필터

```typescript
// orders-table.tsx
const filteredMobileData = useMemo(() => {
  if (!searchQuery.trim()) {
    return displayData;
  }

  const query = searchQuery.toLowerCase();
  return displayData.filter((order) => {
    return (
      order.contract_name?.toLowerCase().includes(query) ||
      order.order_number?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query) ||
      order.contract_status?.toLowerCase().includes(query)
    );
  });
}, [displayData, searchQuery]);
```
