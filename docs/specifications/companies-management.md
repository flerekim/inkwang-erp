# 회사정보 관리 페이지 기능명세서

> **작성일**: 2025-10-12
> **버전**: 1.0
> **작성자**: Claude Code

---

## 1. 개요

### 1.1 페이지 목적
회사 기본 정보를 관리하는 페이지로, 회사의 등록/수정/삭제 및 정렬 순서 관리 기능을 제공합니다.

### 1.2 접근 권한
- **URL**: `/admin/company/companies`
- **필수 권한**: `admin` (관리자 전용, 쓰기 작업만 권한 체크)
- **권한 체크**: Factory Pattern의 `requireAdminForWrite` 옵션 사용

### 1.3 주요 기능
- 회사 목록 조회 (정렬 순서별)
- 회사 추가 (인라인 편집 방식)
- 회사 정보 수정 (인라인 편집)
- 회사 삭제 (다중 선택 가능)
- 사업자번호 중복 확인
- Excel 다운로드
- 인쇄 기능
- 정렬 순서 관리

---

## 2. 파일 구조

### 2.1 디렉토리 구조
```
src/
├── actions/
│   └── companies.ts                          # Server Actions (Factory 패턴)
├── app/(dashboard)/admin/company/companies/
│   ├── page.tsx                              # 서버 컴포넌트 (데이터 페칭, 통계)
│   ├── companies-table-new.tsx               # 메인 테이블 로직
│   └── company-columns.tsx                   # 컬럼 정의
├── lib/
│   ├── validations.ts                        # Zod 스키마 정의
│   └── server-actions.ts                     # CRUD Factory Pattern
└── types/
    └── index.ts                              # TypeScript 타입 정의
```

### 2.2 파일 역할

#### 2.2.1 `actions/companies.ts` (Server Actions - Factory 패턴)
**역할**: CRUD 로직을 Factory 패턴으로 자동 생성 (코드 70% 감소)

**주요 함수**:
- `getCompanies()`: 회사 목록 조회 (sort_order 순 정렬)
- `getCompanyById(id)`: 개별 회사 조회
- `createCompany(data)`: 신규 회사 생성
- `updateCompany(id, data)`: 회사 정보 수정
- `deleteCompany(id)`: 회사 삭제
- `reorderCompanies(items)`: 정렬 순서 일괄 변경
- `checkDuplicateBusinessNumber(number, excludeId?)`: 사업자번호 중복 확인

**Factory Pattern 사용**:
```typescript
const crudActions = createCrudActions<Company>('companies', ['/admin/company/companies'], {
  requireAdminForWrite: true,
});

// 간단한 래퍼 함수만 작성
export async function getCompanies() {
  return crudActions.getAll();
}
```

**특징**:
- 공통 CRUD 로직을 `createCrudActions`로 자동화
- 중복 코드 제거 (사원관리 대비 70% 코드 감소)
- 권한 체크는 Factory 옵션으로 설정
- 사업자번호 중복 확인은 커스텀 함수로 추가

**사업자번호 중복 확인 로직**:
```typescript
1. 입력값에서 숫자만 추출 (하이픈 제거)
2. 10자리 검증
3. DB 쿼리로 중복 확인 (수정 시 자기 자신 제외)
4. 중복 여부 반환
```

---

#### 2.2.2 `page.tsx` (서버 컴포넌트)
**역할**: 초기 데이터 페칭 및 통계 계산

**주요 로직**:
```typescript
1. getCompanies() 로 회사 목록 조회
2. 통계 계산 (전체/활성/사업자번호등록/평균순서)
3. PageTransition + StatsCard 레이아웃
4. CompaniesTable 컴포넌트 렌더링
```

**통계 항목**:
- **전체 회사**: 등록된 총 회사 수
- **활성 회사**: 회사명이 있는 회사 수
- **사업자등록**: 사업자번호가 등록된 회사 수
- **평균 순서**: 정렬 순서 평균값

**특징**:
- 통계는 서버사이드에서 계산 (클라이언트 부담 최소화)
- `PageTransition` 컴포넌트로 페이지 전환 애니메이션

---

#### 2.2.3 `companies-table-new.tsx` (메인 테이블 로직)
**역할**: 테이블 상태 관리 및 CRUD 연동

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
  - 서버 업데이트 후 에러 시 롤백
- `handleDeleteSelected()`: 다중 삭제
  - `Promise.allSettled()`로 병렬 처리
  - 실패/성공 건수 개별 집계
- `handleAddCompany()`: 새 행 추가
  - 임시 ID (`temp-${Date.now()}`) 생성
  - 초기 정렬 순서: `(tableData.length + 1) * 10`
- `handleSaveNewRow()`: 새 행 저장
  - 필수 필드 검증 (name만 필수)
  - 사업자번호는 선택 사항

**성능 최적화**:
- `React.useMemo`로 columns/displayData 메모이제이션
- ESC 키로 새 행 취소 (`useEffect` + `keydown` 이벤트)

---

#### 2.2.4 `company-columns.tsx` (컬럼 정의)
**역할**: TanStack Table 컬럼 정의 (인라인 편집 포함)

**컬럼 구성**:
| 컬럼 ID | 컴포넌트 | 편집 타입 | 비고 |
|---------|----------|-----------|------|
| `select` | `Checkbox` | - | 다중 선택 |
| `name` | `EditableCell` | text | 필수 입력 |
| `business_number` | `EditableCell` | text | 선택 사항, 자동 포맷팅 |
| `sort_order` | `EditableCell` | number | 정렬 순서 (기본값: 자동 생성) |

**특징**:
- 사업자번호 자동 포맷팅: `000-00-00000` 형식
- `isNewRow` 체크로 신규/기존 행 구분
- 신규 행: 테두리 강조 (`border-primary/50`)
- 모든 컬럼 정렬 가능 (`enableSorting: true`)

**사업자번호 포맷팅 로직**:
```typescript
const formatted = value
  ? value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3')
  : '';
```

---

#### 2.2.5 `lib/validations.ts` (Zod 스키마)
**역할**: 입력 데이터 유효성 검사

**회사 관련 스키마**:
```typescript
companySchema = {
  name: z.string().min(2, '회사명은 최소 2자 이상'),
  business_number: z.string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자등록번호 형식 (000-00-00000)')
    .nullable()
    .optional(),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상'),
};
```

**유효성 검사 규칙**:
- 회사명: 최소 2자 필수
- 사업자번호: `000-00-00000` 형식, nullable
- 정렬 순서: 0 이상의 정수

---

#### 2.2.6 `lib/server-actions.ts` (CRUD Factory)
**역할**: 공통 CRUD 로직을 자동 생성하는 팩토리 함수

**제공 기능**:
- `getAll(orderBy?)`: 목록 조회 (정렬 옵션)
- `getById(id)`: 개별 조회
- `create(data)`: 생성
- `update(id, data)`: 수정
- `remove(id)`: 삭제
- `reorder(items)`: 정렬 순서 일괄 변경

**특징**:
- 타입 안전성 (제네릭 타입 `<T>`)
- 권한 체크 옵션 (`requireAdminForWrite`)
- 자동 캐시 무효화 (`revalidatePath`)
- 에러 핸들링 표준화

---

## 3. 데이터 흐름

### 3.1 조회 플로우
```
1. [서버] page.tsx: getCompanies() 호출
2. [서버] Factory: crudActions.getAll()
3. [DB] SELECT * FROM companies ORDER BY sort_order
4. [서버] 통계 계산 후 결과 반환
5. [클라이언트] CompaniesTableNew 렌더링
```

### 3.2 추가 플로우
```
1. [클라이언트] "회사 추가" 버튼 클릭
2. [상태] newRowData 생성 (임시 ID, sort_order 자동 계산)
3. [UI] 테이블 최상단에 새 행 표시
4. [클라이언트] 인라인 편집으로 데이터 입력
5. [클라이언트] "저장" 버튼 클릭
6. [유효성 검사] 필수 필드 체크 (name)
7. [서버] createCompany() Server Action 호출
8. [서버] Factory: crudActions.create(data)
9. [DB] INSERT INTO companies (name, business_number, sort_order)
10. [서버] revalidatePath('/admin/company/companies')
11. [클라이언트] router.refresh() → 데이터 재조회
12. [상태] newRowData 초기화
```

### 3.3 수정 플로우
```
1. [클라이언트] 셀 더블클릭 → 편집 모드
2. [클라이언트] 값 변경 후 Enter 또는 Tab
3. [낙관적 업데이트] tableData 즉시 변경 (로컬 상태)
4. [서버] updateCompany(id, {field: value}) 호출
5. [서버] Factory: crudActions.update(id, data)
6. [DB] UPDATE companies SET field = value WHERE id = ?
7. [서버] revalidatePath()
8. [클라이언트] router.refresh()
9. [에러 처리] 실패 시 원래 값으로 롤백
```

### 3.4 삭제 플로우
```
1. [클라이언트] 행 선택 (Checkbox)
2. [클라이언트] "삭제" 버튼 클릭 → 확인 다이얼로그 표시
3. [클라이언트] 확인 후 handleDeleteSelected() 호출
4. [서버] Promise.allSettled([deleteCompany(id1), ...]) 병렬 처리
5. [서버] Factory: crudActions.remove(id)
6. [DB] DELETE FROM companies WHERE id = ?
7. [서버] revalidatePath()
8. [클라이언트] router.refresh()
9. [상태] rowSelection 초기화
```

### 3.5 사업자번호 중복 확인 플로우
```
1. [클라이언트] 사업자번호 입력
2. [서버] checkDuplicateBusinessNumber(number, excludeId?)
3. [서버] 숫자만 추출 (하이픈 제거)
4. [서버] 10자리 검증
5. [DB] SELECT id FROM companies WHERE business_number = ? AND id != ?
6. [서버] 중복 여부 반환
7. [클라이언트] 중복 시 경고 메시지 표시
```

---

## 4. 주요 기능 상세

### 4.1 Factory Pattern
**구현 목적**: 반복적인 CRUD 코드 제거

**코드 비교**:
```typescript
// Before (기존 방식)
export async function getCompanies() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
// ... 5개 함수 각각 20줄씩 = 100줄

// After (Factory 패턴)
const crudActions = createCrudActions<Company>('companies', ['/admin/company/companies'], {
  requireAdminForWrite: true,
});

export async function getCompanies() {
  return crudActions.getAll();
}
// ... 5개 함수 각각 2줄씩 = 10줄 (90% 감소)
```

**장점**:
- 코드 중복 제거 (70-90% 감소)
- 유지보수 용이 (공통 로직 한 곳에서 관리)
- 타입 안전성 보장 (제네릭 타입)
- 일관된 에러 핸들링

### 4.2 인라인 편집
**구현 방식**:
- `EditableCell`: 텍스트/숫자 편집
- 더블클릭 → 편집 모드
- Enter/Tab → 저장
- Escape → 취소

**낙관적 업데이트**:
```typescript
// 1. 즉시 UI 업데이트
setTableData(old => old.map((row, i) =>
  i === rowIndex ? {...row, [field]: value} : row
));

// 2. 서버 요청
const result = await updateCompany(id, {[field]: value});

// 3. 실패 시 롤백
if (result.error) {
  setTableData(originalData);
}
```

### 4.3 사업자번호 포맷팅
**입력 형식**: 10자리 숫자 (하이픈 없이 입력 가능)
**표시 형식**: `000-00-00000`

**구현**:
```typescript
// 저장 시: 숫자만 추출
const cleaned = businessNumber.replace(/\D/g, '');

// 표시 시: 자동 포맷팅
const formatted = value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3');
```

### 4.4 정렬 순서 관리
**기본 규칙**:
- 신규 회사: `(현재 개수 + 1) * 10`
- 예: 3개 → 40, 4개 → 50

**일괄 변경**:
```typescript
// reorderCompanies 함수 사용 (드래그 앤 드롭 시)
const items = [
  { id: 'uuid1', sort_order: 10 },
  { id: 'uuid2', sort_order: 20 },
  ...
];
await reorderCompanies(items);
```

### 4.5 Excel 다운로드
**컴포넌트**: `<ExportToExcel>`

**설정**:
```typescript
exportColumns = [
  { key: 'name', header: '회사명' },
  {
    key: 'business_number',
    header: '사업자번호',
    format: (value) => value ? value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '',
  },
  { key: 'sort_order', header: '정렬순서' },
];
```

**파일명**: `회사목록_YYYY-MM-DD.xlsx`

### 4.6 인쇄 기능
**컴포넌트**: `<PrintTable>`

**설정**:
```typescript
printColumns = [
  { key: 'name', header: '회사명', width: '200px' },
  {
    key: 'business_number',
    header: '사업자번호',
    width: '150px',
    align: 'center',
    format: (value) => value ? value.replace(/(\d{3})(\d{2})(\d{5})/, '$1-$2-$3') : '',
  },
  { key: 'sort_order', header: '정렬순서', width: '100px', align: 'center' },
];
```

---

## 5. 보안 및 권한

### 5.1 인증/인가
- 읽기: 모든 인증된 사용자
- 쓰기(생성/수정/삭제): 관리자만 (`requireAdminForWrite`)
- Factory Pattern에서 자동 권한 체크

### 5.2 데이터 유효성 검사
- 클라이언트: 필수 필드 체크 (회사명)
- 서버: Zod 스키마 유효성 검사
- 사업자번호: 형식 검증 + 중복 확인

### 5.3 사업자번호 보안
- DB 저장: 숫자만 저장 (하이픈 제거)
- 중복 방지: 유니크 제약 조건 + 중복 확인 API
- 선택 사항: nullable 허용

---

## 6. 성능 최적화

### 6.1 메모이제이션
```typescript
// 컬럼 정의
const columns = React.useMemo(() => createCompanyColumns(...), [deps]);

// 표시 데이터
const displayData = React.useMemo(() => {
  return newRowData ? [newRowData, ...tableData] : tableData;
}, [newRowData, tableData]);

// Excel/인쇄 컬럼
const exportColumns = React.useMemo(() => [...], []);
const printColumns = React.useMemo(() => [...], []);
```

### 6.2 낙관적 업데이트
- 즉시 UI 반영 → 서버 요청 → 에러 시 롤백
- 사용자 체감 성능 향상

### 6.3 병렬 처리
```typescript
// 다중 삭제
const results = await Promise.allSettled(
  selectedCompanies.map(c => deleteCompany(c.id))
);
```

### 6.4 Factory Pattern 효과
- 중복 코드 제거로 번들 사이즈 감소
- 유지보수 시간 단축 (70% 감소)

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
// Zod 스키마 검증 (Factory에서 자동 처리)
const validation = companySchema.safeParse(data);
if (!validation.success) {
  return { error: validation.error.issues[0].message };
}
```

### 7.3 중복 사업자번호
```typescript
const { isDuplicate } = await checkDuplicateBusinessNumber(number, excludeId);
if (isDuplicate) {
  return { error: '이미 등록된 사업자번호입니다.' };
}
```

---

## 8. 테스트 시나리오

### 8.1 기능 테스트
- [ ] 회사 목록 조회 (정렬 순서 확인)
- [ ] 회사 추가 (자동 sort_order 생성 확인)
- [ ] 인라인 편집 (낙관적 업데이트 동작 확인)
- [ ] 다중 삭제 (병렬 처리 확인)
- [ ] Excel 다운로드 (파일 생성 및 포맷팅 확인)
- [ ] 인쇄 기능 (레이아웃 확인)

### 8.2 사업자번호 검증
- [ ] 형식 검증 (000-00-00000)
- [ ] 중복 확인 (동일 번호 등록 차단)
- [ ] 하이픈 자동 제거 (입력 시)
- [ ] 자동 포맷팅 (표시 시)

### 8.3 권한 테스트
- [ ] 비관리자 쓰기 작업 차단 (생성/수정/삭제)
- [ ] 관리자 모든 작업 가능

### 8.4 에러 시나리오
- [ ] 필수 필드 누락 시 에러 메시지
- [ ] 중복 사업자번호 입력 시 처리
- [ ] 네트워크 오류 시 롤백 동작

---

## 9. 향후 개선 사항

### 9.1 기능 추가
- [ ] 드래그 앤 드롭 정렬 (reorderCompanies 활용)
- [ ] 회사 상세보기 모달
- [ ] 회사별 사원 수 표시
- [ ] 회사 로고 업로드 기능
- [ ] 회사 주소/연락처 필드 추가

### 9.2 성능 개선
- [ ] 서버사이드 페이지네이션 (대용량 데이터 대응)
- [ ] 이미지 최적화 (로고 추가 시)

### 9.3 UX 개선
- [ ] 사업자번호 실시간 유효성 검사
- [ ] 정렬 순서 자동 재배치 기능
- [ ] 회사 통합/분리 기능

---

## 10. 사원관리 페이지와의 차이점

### 10.1 구조 차이
| 항목 | 사원관리 | 회사정보 |
|------|----------|----------|
| **코드 패턴** | 커스텀 Server Actions | Factory Pattern |
| **코드 라인** | ~280줄 | ~84줄 (70% 감소) |
| **컬럼 수** | 11개 (복잡한 관계형) | 3개 (단순) |
| **반응형** | 데스크톱/모바일 별도 | 데스크톱만 |
| **특수 기능** | 비밀번호 관리, 사번 자동생성 | 사업자번호 중복 확인 |

### 10.2 공통점
- 인라인 편집 방식
- 낙관적 업데이트
- Excel 다운로드/인쇄
- 다중 삭제

### 10.3 개발 의도
- **사원관리**: 복잡한 비즈니스 로직의 전형적인 예시
- **회사정보**: Factory Pattern을 통한 코드 간소화 예시

---

## 11. 관련 문서

- [CLAUDE.md](../../CLAUDE.md): 프로젝트 전체 개발 가이드
- [사원관리 페이지](./employees-management.md): 관련 페이지 명세서
- [Database Schema](../../supabase/migrations/): DB 스키마 정의
- [Type Definitions](../../src/types/index.ts): TypeScript 타입 정의
- [Validation Rules](../../src/lib/validations.ts): Zod 스키마 정의
- [CRUD Factory](../../src/lib/server-actions.ts): Factory Pattern 구현

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-10-12 | Claude Code | 초기 작성 |
