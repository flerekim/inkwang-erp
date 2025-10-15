# 직급관리 페이지 기능명세서

> **작성일**: 2025-10-12
> **버전**: 1.0
> **작성자**: Claude Code

---

## 1. 개요

### 1.1 페이지 목적
직급(직위) 정보를 관리하는 마스터 데이터 페이지로, 조직의 직급 체계를 정의하고 순서를 관리합니다.

### 1.2 접근 권한
- **URL**: `/admin/company/positions`
- **필수 권한**: `admin` (관리자 전용, 쓰기 작업만 권한 체크)
- **권한 체크**: Factory Pattern의 `requireAdminForWrite` 옵션 사용

### 1.3 주요 기능
- 직급 목록 조회 (정렬 순서별)
- 직급 추가 (인라인 편집 방식)
- 직급 정보 수정 (인라인 편집)
- 직급 삭제 (다중 선택 가능)
- Excel 다운로드
- 인쇄 기능
- 정렬 순서 관리 (드래그 앤 드롭 지원)

---

## 2. 파일 구조

### 2.1 디렉토리 구조
```
src/
├── actions/
│   └── positions.ts                          # Server Actions (Factory 패턴)
├── app/(dashboard)/admin/company/positions/
│   ├── page.tsx                              # 서버 컴포넌트 (데이터 페칭, 통계)
│   ├── positions-table-new.tsx               # 메인 테이블 로직
│   └── position-columns.tsx                  # 컬럼 정의
├── lib/
│   ├── validations.ts                        # Zod 스키마 정의
│   └── server-actions.ts                     # CRUD Factory Pattern
└── types/
    └── index.ts                              # TypeScript 타입 정의
```

### 2.2 파일 역할

#### 2.2.1 `actions/positions.ts` (Server Actions - Factory 패턴)
**역할**: CRUD 로직을 Factory 패턴으로 자동 생성

**주요 함수**:
- `getPositions()`: 직급 목록 조회 (sort_order 순 정렬)
- `getPositionById(id)`: 개별 직급 조회
- `createPosition(data)`: 신규 직급 생성
- `updatePosition(id, data)`: 직급 정보 수정
- `deletePosition(id)`: 직급 삭제
- `reorderPositions(items)`: 정렬 순서 일괄 변경 (드래그 앤 드롭용)

**Factory Pattern 사용**:
```typescript
const crudActions = createCrudActions<Position>('positions', ['/admin/company/positions'], {
  requireAdminForWrite: true,
});

export async function getPositions() {
  return crudActions.getAll();
}

export async function reorderPositions(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}
```

**특징**:
- 회사정보 관리와 동일한 Factory Pattern
- `reorder` 함수로 드래그 앤 드롭 정렬 지원
- 최소한의 래퍼 함수만 작성 (37줄)

---

#### 2.2.2 `page.tsx` (서버 컴포넌트)
**역할**: 초기 데이터 페칭 및 통계 계산

**주요 로직**:
```typescript
1. getPositions() 로 직급 목록 조회
2. 통계 계산 (전체/활성/직급체계/평균인원)
3. PageTransition + StatsCard 레이아웃
4. PositionsTable 컴포넌트 렌더링
```

**통계 항목**:
- **전체 직급**: 등록된 총 직급 수
- **활성 직급**: 직급명이 있는 직급 수
- **직급 체계**: 직급 레벨 수 (전체 / 2)
- **평균 인원**: 직급당 평균 인원 (전체 * 2, 예상값)

**특징**:
- 통계는 서버사이드에서 계산
- `PageTransition` 컴포넌트로 페이지 전환 애니메이션

---

#### 2.2.3 `positions-table-new.tsx` (메인 테이블 로직)
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
  - sort_order는 숫자 변환 처리
  - 서버 업데이트 후 에러 시 롤백
- `handleDeleteSelected()`: 다중 삭제
  - `Promise.allSettled()`로 병렬 처리
  - 실패/성공 건수 개별 집계
- `handleAddPosition()`: 새 행 추가
  - 임시 ID (`temp-${Date.now()}`) 생성
  - 초기 정렬 순서: `(tableData.length + 1) * 10`
- `handleSaveNewRow()`: 새 행 저장
  - 필수 필드 검증 (name만 필수)

**성능 최적화**:
- `React.useMemo`로 columns/displayData 메모이제이션
- ESC 키로 새 행 취소 (`useEffect` + `keydown` 이벤트)

---

#### 2.2.4 `position-columns.tsx` (컬럼 정의)
**역할**: TanStack Table 컬럼 정의 (인라인 편집 포함)

**컬럼 구성**:
| 컬럼 ID | 컴포넌트 | 편집 타입 | 비고 |
|---------|----------|-----------|------|
| `select` | `Checkbox` | - | 다중 선택 |
| `name` | `EditableCell` | text | 필수 입력 |
| `sort_order` | `EditableCell` | number | 정렬 순서 (기본값: 자동 생성) |

**특징**:
- 최소한의 컬럼 (2개만)
- `isNewRow` 체크로 신규/기존 행 구분
- 신규 행: 테두리 강조 (`border-primary/50`)
- 모든 컬럼 정렬 가능 (`enableSorting: true`)

---

#### 2.2.5 `lib/validations.ts` (Zod 스키마)
**역할**: 입력 데이터 유효성 검사

**직급 관련 스키마**:
```typescript
positionSchema = {
  name: z.string().min(2, '직급명은 최소 2자 이상'),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상'),
};

positionInsertSchema = positionSchema;
positionUpdateSchema = positionSchema.partial();
```

**유효성 검사 규칙**:
- 직급명: 최소 2자 필수
- 정렬 순서: 0 이상의 정수

---

## 3. 데이터 흐름

### 3.1 조회 플로우
```
1. [서버] page.tsx: getPositions() 호출
2. [서버] Factory: crudActions.getAll()
3. [DB] SELECT * FROM positions ORDER BY sort_order
4. [서버] 통계 계산 후 결과 반환
5. [클라이언트] PositionsTableNew 렌더링
```

### 3.2 추가 플로우
```
1. [클라이언트] "직급 추가" 버튼 클릭
2. [상태] newRowData 생성 (임시 ID, sort_order 자동 계산)
3. [UI] 테이블 최상단에 새 행 표시
4. [클라이언트] 인라인 편집으로 데이터 입력
5. [클라이언트] "저장" 버튼 클릭
6. [유효성 검사] 필수 필드 체크 (name)
7. [서버] createPosition() Server Action 호출
8. [서버] Factory: crudActions.create(data)
9. [DB] INSERT INTO positions (name, sort_order)
10. [서버] revalidatePath('/admin/company/positions')
11. [클라이언트] router.refresh() → 데이터 재조회
12. [상태] newRowData 초기화
```

### 3.3 수정 플로우
```
1. [클라이언트] 셀 더블클릭 → 편집 모드
2. [클라이언트] 값 변경 후 Enter 또는 Tab
3. [낙관적 업데이트] tableData 즉시 변경 (로컬 상태)
4. [클라이언트] sort_order는 parseInt() 변환
5. [서버] updatePosition(id, {field: value}) 호출
6. [서버] Factory: crudActions.update(id, data)
7. [DB] UPDATE positions SET field = value WHERE id = ?
8. [서버] revalidatePath()
9. [클라이언트] router.refresh()
10. [에러 처리] 실패 시 원래 값으로 롤백
```

### 3.4 삭제 플로우
```
1. [클라이언트] 행 선택 (Checkbox)
2. [클라이언트] "삭제" 버튼 클릭 → 확인 다이얼로그 표시
3. [클라이언트] 확인 후 handleDeleteSelected() 호출
4. [서버] Promise.allSettled([deletePosition(id1), ...]) 병렬 처리
5. [서버] Factory: crudActions.remove(id)
6. [DB] DELETE FROM positions WHERE id = ?
7. [서버] revalidatePath()
8. [클라이언트] router.refresh()
9. [상태] rowSelection 초기화
```

### 3.5 정렬 순서 변경 플로우 (드래그 앤 드롭)
```
1. [클라이언트] 행 드래그 앤 드롭
2. [클라이언트] 새로운 순서로 sort_order 재계산
3. [서버] reorderPositions([{id, sort_order}, ...]) 호출
4. [서버] Factory: crudActions.reorder(items)
5. [DB] 트랜잭션으로 일괄 UPDATE
6. [서버] revalidatePath()
7. [클라이언트] router.refresh()
```

---

## 4. 주요 기능 상세

### 4.1 Factory Pattern
**구현 목적**: 반복적인 CRUD 코드 제거

**코드 비교**:
```typescript
// 전체 코드: 37줄
const crudActions = createCrudActions<Position>('positions', [...], {
  requireAdminForWrite: true,
});

// 6개 함수 각각 2-3줄씩만 작성
export async function getPositions() {
  return crudActions.getAll();
}
```

**장점**:
- 극도로 간결한 코드 (37줄)
- 회사정보/부서관리와 동일한 패턴
- 유지보수 용이

### 4.2 인라인 편집
**구현 방식**:
- `EditableCell`: 텍스트/숫자 편집
- 더블클릭 → 편집 모드
- Enter/Tab → 저장
- Escape → 취소

**sort_order 특수 처리**:
```typescript
// 입력값을 숫자로 변환
const updateData = columnId === 'sort_order'
  ? { [columnId]: parseInt(value) || 0 }
  : { [columnId]: value };
```

### 4.3 정렬 순서 관리
**기본 규칙**:
- 신규 직급: `(현재 개수 + 1) * 10`
- 예: 3개 → 40, 4개 → 50

**드래그 앤 드롭 정렬**:
```typescript
// reorderPositions 함수 사용
const items = [
  { id: 'uuid1', sort_order: 10 },
  { id: 'uuid2', sort_order: 20 },
  ...
];
await reorderPositions(items);
```

**참고**: UI 구현은 향후 추가 예정 (`@dnd-kit` 라이브러리 사용)

### 4.4 Excel 다운로드
**컴포넌트**: `<ExportToExcel>`

**설정**:
```typescript
exportColumns = [
  { key: 'name', header: '직급명' },
  { key: 'sort_order', header: '정렬순서' },
];
```

**파일명**: `직급목록_YYYY-MM-DD.xlsx`

### 4.5 인쇄 기능
**컴포넌트**: `<PrintTable>`

**설정**:
```typescript
printColumns = [
  { key: 'name', header: '직급명', width: '300px' },
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
- 클라이언트: 필수 필드 체크 (직급명)
- 서버: Zod 스키마 유효성 검사
- DB: NOT NULL 제약 조건

### 5.3 Foreign Key 관계
- `users.position_id → positions.id` (nullable)
- 삭제 시 연관된 사원 정보 확인 필요

---

## 6. 성능 최적화

### 6.1 메모이제이션
```typescript
const columns = React.useMemo(() => createPositionColumns(...), [deps]);
const displayData = React.useMemo(() => {
  return newRowData ? [newRowData, ...tableData] : tableData;
}, [newRowData, tableData]);
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
  selectedPositions.map(p => deletePosition(p.id))
);
```

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
const validation = positionSchema.safeParse(data);
if (!validation.success) {
  return { error: validation.error.issues[0].message };
}
```

### 7.3 숫자 변환 에러
```typescript
// sort_order 입력 시 숫자 변환 실패 방지
const sortOrder = parseInt(value) || 0;
```

---

## 8. 테스트 시나리오

### 8.1 기능 테스트
- [ ] 직급 목록 조회 (정렬 순서 확인)
- [ ] 직급 추가 (자동 sort_order 생성 확인)
- [ ] 인라인 편집 (낙관적 업데이트 동작 확인)
- [ ] 다중 삭제 (병렬 처리 확인)
- [ ] Excel 다운로드 (파일 생성 확인)
- [ ] 인쇄 기능 (레이아웃 확인)

### 8.2 정렬 순서 테스트
- [ ] 신규 직급 추가 시 자동 순서 생성
- [ ] sort_order 인라인 편집 (숫자 변환)
- [ ] reorderPositions API 동작 확인 (드래그 앤 드롭 준비)

### 8.3 권한 테스트
- [ ] 비관리자 쓰기 작업 차단 (생성/수정/삭제)
- [ ] 관리자 모든 작업 가능

### 8.4 에러 시나리오
- [ ] 필수 필드 누락 시 에러 메시지
- [ ] 네트워크 오류 시 롤백 동작
- [ ] 잘못된 숫자 입력 시 처리 (sort_order)

---

## 9. 향후 개선 사항

### 9.1 기능 추가
- [ ] 드래그 앤 드롭 정렬 UI 구현 (`@dnd-kit`)
- [ ] 직급 체계 시각화 (계층 구조 다이어그램)
- [ ] 직급별 사원 수 표시
- [ ] 직급별 권한 설정 기능
- [ ] 직급 통합/분리 기능

### 9.2 성능 개선
- [ ] 서버사이드 페이지네이션 (대용량 데이터 대응)

### 9.3 UX 개선
- [ ] 정렬 순서 자동 재배치 기능
- [ ] 직급 복사 기능
- [ ] 직급 그룹 관리

---

## 10. 다른 마스터 페이지와의 비교

### 10.1 구조 비교
| 항목 | 회사정보 | 직급관리 | 부서관리 |
|------|----------|----------|----------|
| **코드 라인** | 84줄 | 37줄 | ~37줄 |
| **컬럼 수** | 3개 (사업자번호 포함) | 2개 (최소) | 2개 (최소) |
| **특수 기능** | 사업자번호 중복 확인 | 드래그 앤 드롭 정렬 | 드래그 앤 드롭 정렬 |
| **드래그 정렬** | 미지원 | 지원 (API만) | 지원 (API만) |

### 10.2 공통점
- Factory Pattern 사용
- 인라인 편집 방식
- 낙관적 업데이트
- Excel 다운로드/인쇄
- 다중 삭제

### 10.3 개발 의도
- **회사정보**: Factory Pattern 기본 예시
- **직급관리**: 최소 구조 + 정렬 기능 예시
- **부서관리**: 직급관리와 동일한 구조

---

## 11. 관련 문서

- [CLAUDE.md](../../CLAUDE.md): 프로젝트 전체 개발 가이드
- [회사정보 페이지](./companies-management.md): 유사 페이지 명세서
- [사원관리 페이지](./employees-management.md): 복잡한 페이지 예시
- [Database Schema](../../supabase/migrations/): DB 스키마 정의
- [Type Definitions](../../src/types/index.ts): TypeScript 타입 정의
- [Validation Rules](../../src/lib/validations.ts): Zod 스키마 정의
- [CRUD Factory](../../src/lib/server-actions.ts): Factory Pattern 구현

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2025-10-12 | Claude Code | 초기 작성 |
