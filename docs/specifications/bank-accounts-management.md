# 은행계좌 관리 페이지 기능명세서

> **작성일**: 2025-10-12
> **버전**: 1.0
> **작성자**: Claude Code

---

## 1. 개요

### 1.1 페이지 목적
회사별 은행계좌 정보를 관리하는 페이지로, 계좌 정보와 잔액을 추적합니다.

### 1.2 접근 권한
- **URL**: `/admin/company/bank-accounts`
- **필수 권한**: `admin` (관리자 전용, 쓰기 작업만 권한 체크)
- **권한 체크**: 커스텀 권한 체크 + Factory Pattern 혼용

### 1.3 주요 기능
- 은행계좌 목록 조회 (회사 정보 포함)
- 은행계좌 추가 (인라인 편집 방식)
- 은행계좌 정보 수정 (인라인 편집)
- 은행계좌 삭제 (다중 선택 가능)
- 초기 잔액 = 현재 잔액 자동 설정
- Excel 다운로드
- 인쇄 기능
- 금액 통계 (총 잔액, 평균 잔액)

---

## 2. 파일 구조

### 2.1 디렉토리 구조
```
src/
├── actions/
│   └── bank-accounts.ts                      # Server Actions (Factory + 커스텀)
├── app/(dashboard)/admin/company/bank-accounts/
│   ├── page.tsx                              # 서버 컴포넌트 (데이터 페칭, 통계)
│   ├── bank-accounts-table-new.tsx           # 메인 테이블 로직
│   └── bank-account-columns.tsx              # 컬럼 정의
├── lib/
│   ├── validations.ts                        # Zod 스키마 정의
│   └── server-actions.ts                     # CRUD Factory Pattern
└── types/
    └── index.ts                              # TypeScript 타입 정의
```

### 2.2 파일 역할

#### 2.2.1 `actions/bank-accounts.ts` (Server Actions - Factory + 커스텀)
**역할**: Factory Pattern과 커스텀 구현 혼합 사용

**주요 함수**:
- `getBankAccounts()`: 은행계좌 목록 조회 (회사 정보 JOIN) - **커스텀**
- `createBankAccount(data)`: 신규 계좌 생성 (초기잔액 = 현재잔액) - **커스텀**
- `getBankAccountById(id)`: 개별 계좌 조회 - **Factory**
- `updateBankAccount(id, data)`: 계좌 정보 수정 - **Factory**
- `deleteBankAccount(id)`: 계좌 삭제 - **Factory**

**Factory Pattern + 커스텀 구현**:
```typescript
// Factory 인스턴스 생성
const crudActions = createCrudActions<BankAccount>('bank_accounts', [...], {
  requireAdminForWrite: true,
});

// 커스텀 구현: 회사 정보 JOIN
export async function getBankAccounts() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*, company:companies(id, name)')  // JOIN
    .order('created_at', { ascending: false });

  // ...
}

// 커스텀 구현: 초기 잔액 = 현재 잔액
export async function createBankAccount(data) {
  // 권한 확인 (커스텀)
  // ...

  await supabase.from('bank_accounts').insert({
    ...data,
    current_balance: data.initial_balance,  // 자동 설정
  });
}

// Factory 재사용
export async function updateBankAccount(id, data) {
  return crudActions.update(id, data);
}
```

**특징**:
- **하이브리드 접근**: Factory의 장점 + 커스텀 로직의 유연성
- **커스텀 이유**:
  - `getBankAccounts`: JOIN으로 회사 정보 포함 필요
  - `createBankAccount`: 초기 잔액 자동 설정 로직
- **Factory 재사용**: update, delete, getById는 그대로 사용

---

#### 2.2.2 `page.tsx` (서버 컴포넌트)
**역할**: 초기 데이터 페칭 및 금액 통계 계산

**주요 로직**:
```typescript
1. Promise.all로 병렬 조회:
   - getBankAccounts(): 계좌 목록
   - getCompanies(): 회사 목록 (선택 옵션용)
2. 금액 통계 계산:
   - 전체 계좌 수
   - 총 잔액 (모든 계좌 current_balance 합계)
   - 평균 잔액 (총 잔액 / 계좌 수)
   - 소속 회사 수
3. PageTransition + StatsCard 레이아웃
4. BankAccountsTable 컴포넌트 렌더링
```

**통계 항목**:
- **전체 계좌**: 등록된 총 계좌 수
- **총 잔액**: 모든 계좌 잔액 합계 (₩ 포맷)
- **평균 잔액**: 계좌당 평균 잔액 (₩ 포맷)
- **소속 회사**: 계좌를 등록한 회사 수

**특징**:
- `Promise.all`로 병렬 데이터 조회 (성능 최적화)
- 금액은 `toLocaleString()`으로 천 단위 콤마

---

#### 2.2.3 `bank-accounts-table-new.tsx` (메인 테이블 로직)
**역할**: 테이블 상태 관리 및 CRUD 연동

**타입 정의**:
```typescript
// 회사 정보가 포함된 은행계좌 타입
type BankAccountWithCompany = BankAccount & {
  company: Pick<Company, 'id' | 'name'> | null;
};
```

**상태 관리**:
```typescript
- tableData: 테이블 데이터 (로컬 상태)
- rowSelection: 행 선택 상태 (TanStack Table)
- newRowData: 새 행 데이터 (인라인 추가용)
- isDeleting/isSavingNewRow: 로딩 상태
- deleteDialogOpen: 삭제 확인 다이얼로그 상태
```

**주요 핸들러**:
- `handleUpdateCell(rowIndex, columnId, value)`: 인라인 편집 저장
  - 낙관적 업데이트 (Optimistic UI)
  - **initial_balance**: 콤마 제거 후 숫자 변환
  - **company_id**: 회사 객체도 함께 업데이트
  - 서버 업데이트 후 에러 시 롤백

- `handleDeleteSelected()`: 다중 삭제
  - `Promise.allSettled()`로 병렬 처리

- `handleAddBankAccount()`: 새 행 추가
  - 임시 ID 생성
  - 초기값: company_id (첫 번째 회사), initial_balance: 0

- `handleSaveNewRow()`: 새 행 저장
  - 필수 필드 검증 (company_id, bank_name, account_number)
  - createBankAccount 호출 (current_balance 자동 설정)

**금액 처리 로직**:
```typescript
// 입력: "1,000,000" → 저장: 1000000
const numValue = parseFloat(value.replace(/,/g, '')) || 0;

// company_id 업데이트 시 company 객체도 업데이트
if (columnId === 'company_id') {
  const selectedCompany = companies.find((c) => c.id === value);
  return {
    ...row,
    company_id: value,
    company: selectedCompany || null,
  };
}
```

**성능 최적화**:
- `React.useMemo`로 columns/displayData 메모이제이션
- ESC 키로 새 행 취소

---

#### 2.2.4 `bank-account-columns.tsx` (컬럼 정의)
**역할**: TanStack Table 컬럼 정의 (인라인 편집 포함)

**컬럼 구성**:
| 컬럼 ID | 컴포넌트 | 편집 타입 | 비고 |
|---------|----------|-----------|------|
| `select` | `Checkbox` | - | 다중 선택 |
| `company` | `EditableSelectCell` | combobox | 필수 선택 (회사 정보) |
| `bank_name` | `EditableCell` | text | 필수 입력 |
| `account_number` | `EditableCell` | text | 필수 입력 |
| `initial_balance` | `EditableCell` | number | 초기 잔액 (콤마 포맷) |
| `current_balance` | `div` | - | 현재 잔액 (**읽기 전용**) |

**특징**:
- **회사 선택**: `EditableSelectCell` + combobox로 검색 가능
- **금액 포맷팅**: `toLocaleString()`으로 천 단위 콤마
- **현재 잔액 읽기 전용**: 직접 수정 불가, 거래 기록으로만 변경
- `isNewRow` 체크로 신규/기존 행 구분

**금액 표시 로직**:
```typescript
// 초기 잔액: 편집 가능, 콤마 포맷
cell: ({ getValue }) => (
  <EditableCell
    value={getValue<number>()?.toLocaleString() || '0'}
    ...
  />
)

// 현재 잔액: 읽기 전용
cell: ({ getValue }) => (
  <div className="px-2 py-1">
    {getValue<number>()?.toLocaleString() || '0'}
  </div>
)
```

---

#### 2.2.5 `lib/validations.ts` (Zod 스키마)
**역할**: 입력 데이터 유효성 검사

**은행계좌 관련 스키마**:
```typescript
bankAccountSchema = {
  company_id: z.string().uuid('올바른 회사를 선택해주세요'),
  bank_name: z.string().min(2, '은행명은 최소 2자 이상'),
  account_number: z.string().min(10, '계좌번호를 정확히 입력'),
  initial_balance: z.number().min(0, '초기 잔액은 0 이상'),
  current_balance: z.number().min(0, '현재 잔액은 0 이상'),
};

bankAccountInsertSchema = bankAccountSchema;
bankAccountUpdateSchema = bankAccountSchema.partial();
```

**유효성 검사 규칙**:
- company_id: UUID 형식 필수
- bank_name: 최소 2자
- account_number: 최소 10자
- initial_balance: 0 이상
- current_balance: 0 이상

---

## 3. 데이터 흐름

### 3.1 조회 플로우
```
1. [서버] page.tsx: Promise.all([getBankAccounts(), getCompanies()])
2. [서버] getBankAccounts(): 회사 정보 JOIN 조회
3. [DB] SELECT bank_accounts.*, companies.id, companies.name
       FROM bank_accounts
       LEFT JOIN companies ON bank_accounts.company_id = companies.id
       ORDER BY created_at DESC
4. [서버] 금액 통계 계산 (총 잔액, 평균 잔액)
5. [클라이언트] BankAccountsTableNew 렌더링
```

### 3.2 추가 플로우
```
1. [클라이언트] "은행계좌 추가" 버튼 클릭
2. [상태] newRowData 생성 (company_id: 첫 회사, initial_balance: 0)
3. [UI] 테이블 최상단에 새 행 표시
4. [클라이언트] 인라인 편집으로 데이터 입력
5. [클라이언트] "저장" 버튼 클릭
6. [유효성 검사] 필수 필드 체크 (company_id, bank_name, account_number)
7. [서버] createBankAccount() 호출
8. [서버] 권한 확인 (admin 체크)
9. [DB] INSERT INTO bank_accounts (
       ...,
       current_balance = initial_balance  -- 자동 설정
    )
10. [서버] revalidatePath('/admin/company/bank-accounts')
11. [클라이언트] router.refresh() → 데이터 재조회
12. [상태] newRowData 초기화
```

### 3.3 수정 플로우
```
1. [클라이언트] 셀 더블클릭 → 편집 모드
2. [클라이언트] 값 변경 후 Enter 또는 Tab
3. [낙관적 업데이트] tableData 즉시 변경 (로컬 상태)
4. [클라이언트] initial_balance는 콤마 제거 후 숫자 변환
5. [클라이언트] company_id는 company 객체도 업데이트
6. [서버] updateBankAccount(id, {field: value}) 호출
7. [서버] Factory: crudActions.update(id, data)
8. [DB] UPDATE bank_accounts SET field = value WHERE id = ?
9. [서버] revalidatePath()
10. [클라이언트] router.refresh()
11. [에러 처리] 실패 시 원래 값으로 롤백
```

### 3.4 삭제 플로우
```
1. [클라이언트] 행 선택 (Checkbox)
2. [클라이언트] "삭제" 버튼 클릭 → 확인 다이얼로그 표시
3. [클라이언트] 확인 후 handleDeleteSelected() 호출
4. [서버] Promise.allSettled([deleteBankAccount(id1), ...])
5. [서버] Factory: crudActions.remove(id)
6. [DB] DELETE FROM bank_accounts WHERE id = ?
7. [서버] revalidatePath()
8. [클라이언트] router.refresh()
9. [상태] rowSelection 초기화
```

---

## 4. 주요 기능 상세

### 4.1 Factory Pattern + 커스텀 하이브리드
**구현 목적**: Factory의 장점 + 커스텀 로직의 유연성

**장점**:
- **코드 재사용**: update, delete, getById는 Factory 활용
- **유연성**: 복잡한 로직은 커스텀 구현
- **유지보수**: Factory 업데이트 시 자동 반영

**커스텀 구현 이유**:
```typescript
// 1. JOIN 필요
getBankAccounts() {
  .select('*, company:companies(id, name)')  // Factory는 단일 테이블만
}

// 2. 비즈니스 로직
createBankAccount(data) {
  current_balance: data.initial_balance,  // 자동 설정 로직
}
```

### 4.2 금액 처리
**입력 처리**:
```typescript
// 사용자 입력: "1,000,000"
const numValue = parseFloat(value.replace(/,/g, '')) || 0;  // → 1000000
```

**표시 포맷팅**:
```typescript
// DB 값: 1000000
value.toLocaleString()  // → "1,000,000"
```

**통계 계산**:
```typescript
// 총 잔액
const totalBalance = bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

// 평균 잔액
const averageBalance = totalBalance / bankAccounts.length;
```

### 4.3 초기 잔액 = 현재 잔액
**구현 이유**: 계좌 생성 시 현재 잔액을 자동으로 초기 잔액과 동일하게 설정

**로직**:
```typescript
// 생성 시
await supabase.from('bank_accounts').insert({
  ...data,
  current_balance: data.initial_balance,  // 자동 복사
});
```

**향후 확장**: 거래 기록 기능 추가 시 current_balance 자동 업데이트

### 4.4 현재 잔액 읽기 전용
**이유**: 거래 기록으로만 변경되어야 함 (직접 수정 방지)

**구현**:
```typescript
// 편집 불가능한 일반 div
cell: ({ getValue }) => (
  <div className="px-2 py-1">
    {getValue<number>()?.toLocaleString() || '0'}
  </div>
)
```

### 4.5 회사 선택 (관계형 데이터)
**구현**:
```typescript
// 1. 회사 목록을 EditableSelectCell에 전달
<EditableSelectCell
  value={companyId}
  displayValue={companyName}
  options={companies}
  type="combobox"  // 검색 가능
/>

// 2. 업데이트 시 company 객체도 함께 업데이트
if (columnId === 'company_id') {
  const selectedCompany = companies.find((c) => c.id === value);
  return {
    ...row,
    company_id: value,
    company: selectedCompany || null,  // 함께 업데이트
  };
}
```

### 4.6 Excel 다운로드
**컴포넌트**: `<ExportToExcel>`

**설정**:
```typescript
exportColumns = [
  { key: 'company', header: '회사', format: (value) => value?.name || '' },
  { key: 'bank_name', header: '은행명' },
  { key: 'account_number', header: '계좌번호' },
  { key: 'initial_balance', header: '초기잔액' },
  { key: 'current_balance', header: '현재잔액' },
];
```

**파일명**: `은행계좌목록_YYYY-MM-DD.xlsx`

### 4.7 인쇄 기능
**컴포넌트**: `<PrintTable>`

**설정**:
```typescript
printColumns = [
  {
    key: 'company',
    header: '회사',
    width: '150px',
    format: (value) => value?.name || '',
  },
  { key: 'bank_name', header: '은행명', width: '120px' },
  { key: 'account_number', header: '계좌번호', width: '150px', align: 'center' },
  {
    key: 'initial_balance',
    header: '초기잔액',
    width: '120px',
    align: 'right',
    format: (value) => value?.toLocaleString() || '0',
  },
  {
    key: 'current_balance',
    header: '현재잔액',
    width: '120px',
    align: 'right',
    format: (value) => value?.toLocaleString() || '0',
  },
];
```

---

## 5. 보안 및 권한

### 5.1 인증/인가
- 읽기: 모든 인증된 사용자
- 쓰기(생성/수정/삭제): 관리자만
- 생성: 커스텀 권한 체크 (createBankAccount 내부)
- 수정/삭제: Factory Pattern 권한 체크

### 5.2 데이터 유효성 검사
- 클라이언트: 필수 필드 체크
- 서버: Zod 스키마 유효성 검사
- DB: Foreign Key 제약 조건 (company_id)

### 5.3 Foreign Key 관계
- `bank_accounts.company_id → companies.id` (NOT NULL)
- 회사 삭제 시 은행계좌 처리 고려 필요

---

## 6. 성능 최적화

### 6.1 병렬 데이터 조회
```typescript
// page.tsx
const [bankAccounts, companies] = await Promise.all([
  getBankAccounts(),
  getCompanies(),
]);
```

### 6.2 메모이제이션
```typescript
const columns = React.useMemo(() => createBankAccountColumns(...), [deps]);
const displayData = React.useMemo(() => {
  return newRowData ? [newRowData, ...tableData] : tableData;
}, [newRowData, tableData]);
const exportColumns = React.useMemo(() => [...], []);
const printColumns = React.useMemo(() => [...], []);
```

### 6.3 낙관적 업데이트
- 즉시 UI 반영 → 서버 요청 → 에러 시 롤백
- 금액, 회사 정보 모두 낙관적 업데이트 지원

---

## 7. 에러 처리

### 7.1 서버 에러
```typescript
if (result.error) {
  toast({
    variant: 'destructive',
    title: '작업 실패',
    description: result.error,
  });
  return;
}
```

### 7.2 유효성 검사 실패
```typescript
// 필수 필드 검증 (클라이언트)
if (!newRowData.company_id || !newRowData.bank_name || !newRowData.account_number) {
  toast({ variant: 'destructive', title: '입력 오류', ... });
  return;
}
```

### 7.3 금액 변환 에러
```typescript
// 콤마 제거 및 숫자 변환 실패 방지
const numValue = parseFloat(value.replace(/,/g, '')) || 0;
```

---

## 8. 테스트 시나리오

### 8.1 기능 테스트
- [ ] 은행계좌 목록 조회 (회사 정보 JOIN 확인)
- [ ] 은행계좌 추가 (초기잔액 = 현재잔액 확인)
- [ ] 인라인 편집 (금액 콤마 처리 확인)
- [ ] 다중 삭제 (병렬 처리 확인)
- [ ] Excel 다운로드 (금액 포맷 확인)
- [ ] 인쇄 기능 (금액 정렬 확인)

### 8.2 금액 처리 테스트
- [ ] 금액 입력 (콤마 포함/미포함 모두 처리)
- [ ] 금액 표시 (천 단위 콤마)
- [ ] 통계 계산 (총 잔액, 평균 잔액)
- [ ] 현재 잔액 읽기 전용 확인

### 8.3 관계형 데이터 테스트
- [ ] 회사 선택 (combobox 검색)
- [ ] 회사 정보 JOIN 조회
- [ ] 회사 변경 시 company 객체 업데이트

### 8.4 에러 시나리오
- [ ] 필수 필드 누락 시 에러 메시지
- [ ] 잘못된 금액 입력 시 처리
- [ ] 네트워크 오류 시 롤백 동작

---

## 9. 향후 개선 사항

### 9.1 기능 추가
- [ ] **거래 기록 기능**: 입출금 내역 관리, current_balance 자동 업데이트
- [ ] 계좌별 거래 내역 조회
- [ ] 잔액 변동 그래프
- [ ] 계좌 활성화/비활성화 상태 관리
- [ ] 은행 코드 표준화 (은행명 자동 완성)
- [ ] 계좌 유형 분류 (보통예금, 당좌예금 등)

### 9.2 성능 개선
- [ ] 서버사이드 페이지네이션 (대용량 데이터 대응)
- [ ] 금액 통계 캐싱

### 9.3 UX 개선
- [ ] 계좌번호 자동 포맷팅 (은행별 형식)
- [ ] 잔액 알림 기능 (임계값 설정)
- [ ] 회사별 계좌 그룹핑
- [ ] 잔액 변동 히스토리

---

## 10. 다른 페이지와의 비교

### 10.1 구조 비교
| 항목 | 회사정보 | 부서/직급 | 은행계좌 |
|------|----------|-----------|----------|
| **패턴** | Pure Factory | Pure Factory | **Hybrid** (Factory + 커스텀) |
| **코드 라인** | 84줄 | 37줄 | **95줄** |
| **컬럼 수** | 3개 | 2개 | **5개** (현재잔액 포함) |
| **관계형 데이터** | ❌ | ❌ | **✅** (회사 JOIN) |
| **특수 처리** | 사업자번호 중복 확인 | 정렬 API | **금액 포맷팅, 초기잔액=현재잔액** |
| **읽기 전용 필드** | ❌ | ❌ | **✅** (현재잔액) |

### 10.2 공통점
- 인라인 편집 방식
- 낙관적 업데이트
- Excel 다운로드/인쇄
- 다중 삭제

### 10.3 개발 의도
- **회사정보**: Factory Pattern 기본 예시
- **부서/직급**: 최소 구조 마스터 데이터
- **은행계좌**: Hybrid 접근 + 관계형 데이터 + 금액 처리 예시

### 10.4 하이브리드 접근의 장점
- Factory로 코드 재사용 + 커스텀으로 유연성 확보
- 복잡한 비즈니스 로직(JOIN, 초기잔액 설정)을 효율적으로 처리
- 향후 거래 기록 기능 추가 시 확장 용이

---

## 11. 관련 문서

- [CLAUDE.md](../../CLAUDE.md): 프로젝트 전체 개발 가이드
- [회사정보 페이지](./companies-management.md): Factory Pattern 기본 예시
- [사원관리 페이지](./employees-management.md): 복잡한 관계형 데이터 예시
- [Database Schema](../../supabase/migrations/): DB 스키마 정의
- [Type Definitions](../../src/types/index.ts): TypeScript 타입 정의
- [Validation Rules](../../src/lib/validations.ts): Zod 스키마 정의
- [CRUD Factory](../../src/lib/server-actions.ts): Factory Pattern 구현

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-10-12 | Claude Code | 초기 작성 |
