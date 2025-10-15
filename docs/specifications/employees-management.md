# 사원관리 페이지 기능명세서

> **작성일**: 2025-10-12
> **버전**: 1.0
> **작성자**: Claude Code

---

## 1. 개요

### 1.1 페이지 목적
사원 정보를 통합 관리하는 페이지로, 사원의 등록/수정/삭제 및 조회 기능을 제공합니다.

### 1.2 접근 권한
- **URL**: `/admin/employees`
- **필수 권한**: `admin` (관리자 전용)
- **권한 체크**: `requireAdmin()` 함수로 서버사이드 검증

### 1.3 주요 기능
- 사원 목록 조회 (회사/부서/직급 정보 포함)
- 사원 추가 (인라인 편집 방식)
- 사원 정보 수정 (인라인 편집)
- 사원 삭제 (다중 선택 가능)
- Excel 다운로드
- 인쇄 기능
- 반응형 UI (데스크톱/모바일)

---

## 2. 파일 구조

### 2.1 디렉토리 구조
```
src/
├── actions/
│   └── employees.ts                    # Server Actions (CRUD 로직)
├── app/(dashboard)/admin/employees/
│   ├── page.tsx                        # 서버 컴포넌트 (데이터 페칭)
│   ├── employees-page-client.tsx       # 클라이언트 래퍼 (통계 표시)
│   ├── employees-table.tsx             # 메인 테이블 로직
│   ├── employee-columns.tsx            # 컬럼 정의
│   ├── mobile-employee-card.tsx        # 모바일 카드 뷰
│   └── mobile-edit-dialog.tsx          # 모바일 편집 다이얼로그
├── lib/
│   └── validations.ts                  # Zod 스키마 정의
└── types/
    └── index.ts                        # TypeScript 타입 정의
```

### 2.2 파일 역할

#### 2.2.1 `actions/employees.ts` (Server Actions)
**역할**: 백엔드 로직 처리 및 Supabase 연동

**주요 함수**:
- `getEmployees()`: 사원 목록 조회 (JOIN으로 회사/부서/직급 정보 포함)
- `createEmployee(data)`: 신규 사원 생성 (Supabase Auth + public.users 테이블)
- `updateEmployee(id, data)`: 사원 정보 수정
- `deleteEmployee(id)`: 사원 삭제 (CASCADE로 관련 데이터 삭제)
- `getDepartments()`: 부서 목록 조회
- `getPositions()`: 직급 목록 조회
- `getCompanies()`: 회사 목록 조회

**특징**:
- `'use server'` 지시어로 서버사이드 실행
- HOF 패턴 (`withAuth`) 적용으로 권한 체크
- Zod 스키마로 유효성 검사
- `revalidatePath()` 로 캐시 무효화

**사원 생성 플로우**:
```
1. Admin Client로 Supabase Auth 사용자 생성
2. DB 트리거(handle_new_user)가 public.users 테이블에 자동 INSERT
3. 트리거에서 입사일 기반 사번 자동 생성 (yyyymmddNN 형식)
```

---

#### 2.2.2 `page.tsx` (서버 컴포넌트)
**역할**: 초기 데이터 페칭 및 클라이언트 컴포넌트로 전달

**주요 로직**:
```typescript
1. requireAdmin() 으로 권한 체크
2. getEmployees() 로 사원 목록 조회
3. EmployeesPageClientNew 에 데이터 전달
```

**특징**:
- Next.js App Router의 서버 컴포넌트 패턴
- 에러 발생 시 throw Error로 에러 바운더리 처리

---

#### 2.2.3 `employees-page-client.tsx` (클라이언트 래퍼)
**역할**: 통계 카드 표시 및 메인 테이블 렌더링

**주요 기능**:
- 사원 통계 계산 (전체/재직/퇴사/회사 수)
- `useMemo`로 통계 메모이제이션
- `PageHeader` + `StatsCard` 레이아웃
- `EmployeesTableNew` 컴포넌트 렌더링

**특징**:
- `'use client'` 지시어로 클라이언트사이드 실행
- 통계는 실시간 계산 (서버 재요청 없음)

---

#### 2.2.4 `employees-table.tsx` (메인 테이블 로직)
**역할**: 테이블 상태 관리 및 CRUD 연동

**상태 관리**:
```typescript
- tableData: 테이블 데이터 (로컬 상태)
- rowSelection: 행 선택 상태 (TanStack Table)
- newRowData: 새 행 데이터 (인라인 추가용)
- editingEmployee: 모바일 편집 대상
- companies/departments/positions: 관계형 데이터
```

**주요 핸들러**:
- `handleUpdateCell(rowIndex, columnId, value)`: 인라인 편집 저장
  - 낙관적 업데이트 (Optimistic UI)
  - 서버 업데이트 후 에러 시 롤백
- `handleDeleteSelected()`: 다중 삭제
  - `Promise.allSettled()`로 병렬 처리
  - 실패/성공 건수 개별 집계
- `handleAddEmployee()`: 새 행 추가
  - 임시 ID (`temp-${Date.now()}`) 생성
  - 초기값 설정 (role: 'user', status: 'active')
- `handleSaveNewRow()`: 새 행 저장
  - 필수 필드 검증 (name, email, company_id)
  - 비밀번호 기본값: `dlsrhkd114!`

**반응형 구현**:
- 데스크톱: `<DataTable>` (인라인 편집)
- 모바일: `<MobileEmployeeCard>` + `<MobileEditDialog>`

**성능 최적화**:
- `React.useMemo`로 columns/displayData 메모이제이션
- ESC 키로 새 행 취소 (`useEffect` + `keydown` 이벤트)

---

#### 2.2.5 `employee-columns.tsx` (컬럼 정의)
**역할**: TanStack Table 컬럼 정의 (인라인 편집 포함)

**컬럼 구성**:
| 컬럼 ID | 컴포넌트 | 편집 타입 | 비고 |
|---------|----------|-----------|------|
| `select` | `Checkbox` | - | 다중 선택 |
| `employee_number` | `span` | - | 자동 생성 (읽기 전용) |
| `name` | `EditableCell` | text | 필수 입력 |
| `email` | `EditableCell` | text | 필수 입력, 신규만 편집 가능 |
| `password` | `EditableCell` | password | 신규만 입력 가능 |
| `company_id` | `EditableSelectCell` | combobox | 필수 선택 |
| `department_id` | `EditableSelectCell` | combobox | 선택 사항 |
| `position_id` | `EditableSelectCell` | combobox | 선택 사항 |
| `role` | `EditableSelectCell` | select | 관리자/사용자 |
| `hire_date` | `EditableDateCell` | date | 입사일 |
| `employment_status` | `EditableSelectCell` | select | 재직/퇴사 |

**특징**:
- `isNewRow` 체크로 신규/기존 행 구분
- 신규 행: 테두리 강조 (`border-primary/50`)
- `handleUpdateNewRow` vs `handleUpdateCell` 분기
- `displayValue` prop으로 Badge 커스터마이징

---

#### 2.2.6 `mobile-employee-card.tsx` (모바일 카드 뷰)
**역할**: 모바일 환경에서 사원 정보를 카드 형태로 표시

**레이아웃**:
```
┌─────────────────────────────────┐
│ [이름]               [Checkbox] │
│ 사번: 20241012001               │
├─────────────────────────────────┤
│ 이메일      │ 회사              │
│ 부서        │ 직급              │
│ 입사일      │ 상태 (Badge)      │
├─────────────────────────────────┤
│ [권한 Badge]                    │
└─────────────────────────────────┘
```

**특징**:
- 카드 클릭 시 편집 다이얼로그 오픈
- 신규 행은 선택 불가 + 시각적 강조
- `active:bg-muted/50` 로 터치 피드백

---

#### 2.2.7 `mobile-edit-dialog.tsx` (모바일 편집 다이얼로그)
**역할**: 모바일 환경에서 사원 정보 수정

**폼 필드**:
- 이름 * (필수)
- 이메일 * (필수)
- 회사 * (Select)
- 부서 (Select, 선택사항)
- 직급 (Select, 선택사항)
- 권한 (Select)
- 상태 (Select)
- 입사일 (Date)

**특징**:
- `Dialog` 컴포넌트로 모달 구현
- `max-h-[90vh] overflow-y-auto` 로 스크롤 지원
- `formData` 상태는 부모 컴포넌트에서 관리

---

#### 2.2.8 `lib/validations.ts` (Zod 스키마)
**역할**: 입력 데이터 유효성 검사

**사원 관련 스키마**:
```typescript
- emailSchema: @inkwang.co.kr 도메인 체크
- passwordSchema: 최소 8자 + 소문자/숫자/특수문자 필수
- userSchema: 기본 사원 정보 스키마
- userInsertSchema: 신규 생성용 (password 필수)
- userUpdateSchema: 수정용 (모든 필드 optional)
```

**유효성 검사 규칙**:
- 이름: 최소 2자
- 이메일: `@inkwang.co.kr` 도메인 필수
- 비밀번호: 8자 이상 + 소문자/숫자/특수문자
- company_id: UUID 형식 + 필수
- department_id/position_id: UUID 형식 + nullable
- role: `admin` | `user`
- employment_status: `active` | `inactive`

---

## 3. 데이터 흐름

### 3.1 조회 플로우
```
1. [서버] page.tsx: requireAdmin() 권한 체크
2. [서버] getEmployees() 호출 (Supabase Query)
3. [DB] SELECT users JOIN companies/departments/positions
4. [서버] 결과 반환 → EmployeesPageClientNew 로 전달
5. [클라이언트] EmployeesTableNew 렌더링
```

### 3.2 추가 플로우
```
1. [클라이언트] "사원 추가" 버튼 클릭
2. [상태] newRowData 생성 (임시 ID)
3. [UI] 테이블 최상단에 새 행 표시
4. [클라이언트] 인라인 편집으로 데이터 입력
5. [클라이언트] "저장" 버튼 클릭
6. [유효성 검사] 필수 필드 체크 (name, email, company_id)
7. [서버] createEmployee() Server Action 호출
8. [DB] Admin Client로 Auth 사용자 생성
9. [DB] Trigger: public.users INSERT + 사번 자동 생성
10. [서버] revalidatePath('/admin/employees')
11. [클라이언트] router.refresh() → 데이터 재조회
12. [상태] newRowData 초기화
```

### 3.3 수정 플로우
```
[데스크톱]
1. [클라이언트] 셀 더블클릭 → 편집 모드
2. [클라이언트] 값 변경 후 Enter 또는 Tab
3. [낙관적 업데이트] tableData 즉시 변경 (로컬 상태)
4. [서버] updateEmployee(id, {field: value}) 호출
5. [DB] UPDATE users SET field = value WHERE id = ?
6. [서버] revalidatePath()
7. [클라이언트] router.refresh()
8. [에러 처리] 실패 시 원래 값으로 롤백

[모바일]
1. [클라이언트] 카드 클릭 → 편집 다이얼로그 오픈
2. [클라이언트] 폼에서 값 변경
3. [클라이언트] "저장" 버튼 클릭
4. [서버] updateEmployee(id, formData) 호출
5. [DB] UPDATE users SET ... WHERE id = ?
6. [서버] revalidatePath()
7. [클라이언트] router.refresh() + 다이얼로그 닫기
```

### 3.4 삭제 플로우
```
1. [클라이언트] 행 선택 (Checkbox)
2. [클라이언트] "삭제" 버튼 클릭 → 확인 다이얼로그 표시
3. [클라이언트] 확인 후 handleDeleteSelected() 호출
4. [서버] Promise.allSettled([deleteEmployee(id1), ...]) 병렬 처리
5. [DB] Admin Client로 Auth 사용자 삭제
6. [DB] ON DELETE CASCADE로 public.users 자동 삭제
7. [서버] revalidatePath()
8. [클라이언트] router.refresh()
9. [상태] rowSelection 초기화
```

---

## 4. 주요 기능 상세

### 4.1 인라인 편집
**구현 방식**:
- `EditableCell`: 텍스트/비밀번호 편집
- `EditableSelectCell`: Select/Combobox 편집
- `EditableDateCell`: 날짜 선택

**사용자 인터랙션**:
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
const result = await updateEmployee(id, {[field]: value});

// 3. 실패 시 롤백
if (result.error) {
  setTableData(originalData);
}
```

### 4.2 다중 삭제
**선택 방식**:
- 헤더 체크박스: 전체 선택/해제
- 행 체크박스: 개별 선택

**삭제 처리**:
```typescript
const results = await Promise.allSettled(
  selectedEmployees.map(e => deleteEmployee(e.id))
);

// 성공/실패 건수 집계
const successes = results.filter(r => r.status === 'fulfilled' && r.value.success);
const failures = results.filter(r => r.status === 'rejected' || r.value.error);
```

### 4.3 Excel 다운로드
**컴포넌트**: `<ExportToExcel>`

**설정**:
```typescript
exportColumns = [
  { key: 'employee_number', header: '사번' },
  { key: 'name', header: '이름' },
  { key: 'company_id', header: '회사', format: (_, row) => row.company?.name },
  { key: 'role', header: '권한', format: v => v === 'admin' ? '관리자' : '사용자' },
  ...
];
```

**파일명**: `사원목록_YYYY-MM-DD.xlsx`

### 4.4 인쇄 기능
**컴포넌트**: `<PrintTable>`

**설정**:
```typescript
printColumns = [
  { key: 'employee_number', header: '사번', width: '100px', align: 'center' },
  { key: 'name', header: '이름', width: '100px' },
  ...
];
```

**출력 정보**: 제목, 부제목, 인쇄일

---

## 5. 반응형 디자인

### 5.1 데스크톱 (md 이상)
- 테이블 뷰 (`<DataTable>`)
- 인라인 편집
- 검색/정렬/페이지네이션
- 툴바 버튼 개별 표시

### 5.2 모바일 (md 미만)
- 카드 뷰 (`<MobileEmployeeCard>`)
- 검색창 별도 표시
- 편집 다이얼로그 (`<MobileEditDialog>`)
- 툴바 드롭다운 메뉴

### 5.3 반응형 브레이크포인트
- `hidden md:block`: 데스크톱만 표시
- `md:hidden`: 모바일만 표시
- Tailwind 기본 브레이크포인트 사용 (md: 768px)

---

## 6. 보안 및 권한

### 6.1 인증/인가
- 서버사이드: `requireAdmin()` 함수로 체크
- 클라이언트사이드: UI 렌더링 제어
- Supabase Auth 세션 기반 인증

### 6.2 데이터 유효성 검사
- 클라이언트: 필수 필드 체크
- 서버: Zod 스키마 유효성 검사
- DB: Foreign Key 제약 조건

### 6.3 비밀번호 보안
- 신규 생성: 기본값 또는 사용자 입력값
- 수정: 별도 필드로 분리 (`password` 제외)
- 저장: Supabase Auth에서 암호화 처리

---

## 7. 성능 최적화

### 7.1 메모이제이션
```typescript
// 컬럼 정의
const columns = React.useMemo(() => createEmployeeColumns(...), [deps]);

// 표시 데이터
const displayData = React.useMemo(() => {
  return newRowData ? [newRowData, ...tableData] : tableData;
}, [newRowData, tableData]);

// Excel/인쇄 컬럼
const exportColumns = React.useMemo(() => [...], []);
const printColumns = React.useMemo(() => [...], []);
```

### 7.2 낙관적 업데이트
- 즉시 UI 반영 → 서버 요청 → 에러 시 롤백
- 사용자 체감 성능 향상

### 7.3 병렬 처리
```typescript
// 관계형 데이터 로드
const [comps, depts, poss] = await Promise.all([
  getCompanies(),
  getDepartments(),
  getPositions(),
]);

// 다중 삭제
const results = await Promise.allSettled(
  selectedEmployees.map(e => deleteEmployee(e.id))
);
```

---

## 8. 에러 처리

### 8.1 서버 에러
```typescript
if (result.error) {
  toast({
    variant: 'destructive',
    title: '작업 실패',
    description: result.error,
  });
  return; // 또는 throw
}
```

### 8.2 네트워크 에러
```typescript
try {
  await updateEmployee(id, data);
} catch (error) {
  toast({
    variant: 'destructive',
    title: '네트워크 오류',
    description: error.message,
  });
}
```

### 8.3 유효성 검사 실패
```typescript
// Zod 스키마 검증
const validation = userInsertSchema.safeParse(data);
if (!validation.success) {
  return { error: validation.error.issues[0].message };
}
```

---

## 9. 테스트 시나리오

### 9.1 기능 테스트
- [ ] 사원 목록 조회 (관계형 데이터 JOIN 확인)
- [ ] 사원 추가 (사번 자동 생성 확인)
- [ ] 인라인 편집 (낙관적 업데이트 동작 확인)
- [ ] 다중 삭제 (CASCADE 확인)
- [ ] Excel 다운로드 (파일 생성 확인)
- [ ] 인쇄 기능 (레이아웃 확인)

### 9.2 권한 테스트
- [ ] 비관리자 접근 차단 (401/403)
- [ ] 본인 정보만 수정 가능 (admin 제외)

### 9.3 반응형 테스트
- [ ] 데스크톱: 테이블 뷰 정상 동작
- [ ] 모바일: 카드 뷰 + 다이얼로그 정상 동작
- [ ] 브레이크포인트 전환 시 레이아웃 깨짐 없음

### 9.4 에러 시나리오
- [ ] 필수 필드 누락 시 에러 메시지
- [ ] 중복 이메일 입력 시 처리
- [ ] 네트워크 오류 시 롤백 동작
- [ ] 세션 만료 시 로그인 페이지 리다이렉트

---

## 10. 향후 개선 사항

### 10.1 기능 추가
- [ ] 사원 검색 필터 (부서/직급/상태별)
- [ ] 비밀번호 재설정 기능
- [ ] 퇴사 처리 워크플로우 (퇴사일 기록)

### 10.2 성능 개선
- [ ] 서버사이드 페이지네이션 (대용량 데이터 대응)
- [ ] 가상 스크롤링 (Virtual Scrolling)

### 10.3 UX 개선
- [ ] 벌크 수정 기능 (여러 행 동시 수정)
- [ ] 컬럼 숨김/표시 토글
- [ ] 사용자 정의 컬럼 순서

---

## 11. 관련 문서

- [CLAUDE.md](../../CLAUDE.md): 프로젝트 전체 개발 가이드
- [Database Schema](../../supabase/migrations/): DB 스키마 정의
- [Type Definitions](../../src/types/index.ts): TypeScript 타입 정의
- [Validation Rules](../../src/lib/validations.ts): Zod 스키마 정의

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-10-12 | Claude Code | 초기 작성 |
