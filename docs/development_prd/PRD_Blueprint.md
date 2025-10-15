# 인광 토양정화 ERP 시스템 - 프로젝트 청사진

## 📋 프로젝트 개요

### 비즈니스 배경
- **회사명**: 인광(Inkwang)
- **업종**: 토양정화업
- **현재 문제점**:
  - 대부분의 작업을 엑셀로 처리하여 자료 공유가 원활하지 않음
  - 작성 방법이 제각각이라 일관성 부족
  - 데이터 중앙화 및 표준화 필요

### 프로젝트 목표
현대적인 웹 ERP 시스템 구축을 통해 업무 효율성 향상, 데이터 일관성 확보, 실시간 정보 공유 실현

---

## 🎯 핵심 요구사항

### 1. 인증 시스템
- 이메일 로그인 방식 (`@inkwang.co.kr` 도메인 고정)
- 사용자는 ID와 비밀번호만 입력
- 회원가입 없음 (관리자가 계정 부여)
- 권한 시스템: Admin, User

### 2. 공통 레이아웃
- 고정 헤더 및 사이드바
- 페이지 전환 시에도 레이아웃 유지
- 반응형 디자인 (모바일, 태블릿, 데스크톱)

### 3. 관리자 모듈
#### 사원관리
- 계정 생성 및 관리
- 권한 설정 (Admin/User)
- 재직 상태 관리
- User는 삭제 기능만 제외하고 모든 기능 사용 가능

#### 회사관리
- 회사 정보 관리
- 부서 및 직급 관리
- 은행 계좌 관리 (수금/지출 연동)

### 4. UX 원칙
- **인라인 편집 방식**: 다이얼로그 없이 테이블에서 직접 편집
- **최소한의 클릭**: 효율적인 워크플로우
- **즉각적인 피드백**: 실시간 유효성 검사 및 저장

### 5. 엑셀 유사 인터랙션
#### 5.1 인라인 편집 기능
- **더블클릭 편집**: 특정 셀을 더블클릭하면 해당 행이 편집 모드로 전환
- **즉시 DB 반영**: 사용자가 입력한 데이터는 Enter 키 또는 포커스 아웃 시 자동 저장
- **실시간 유효성 검사**: 입력 중 즉시 검증하여 에러 피드백 제공
- **낙관적 업데이트**: 서버 응답 전 UI를 먼저 업데이트하여 빠른 반응성 제공

#### 5.2 키보드 단축키
- **F5**: 조회/새로고침 - 현재 페이지 데이터 새로고침
- **F6**: 행 추가 - 새로운 데이터 행 추가 (인라인 입력 모드)
- **F7**: 선택행 삭제 - 현재 선택된 행 삭제 (확인 다이얼로그 표시)
- **F8**: 인쇄 - 현재 테이블 데이터 인쇄 미리보기
- **Enter**: 편집 완료 및 저장
- **Escape**: 편집 취소 및 원래 값으로 복구
- **Tab**: 다음 셀로 이동 (편집 모드에서)
- **Shift+Tab**: 이전 셀로 이동 (편집 모드에서)

#### 5.3 행 조작
- **행 추가**: F6 또는 "행 추가" 버튼 클릭 시 테이블 상단에 새 행 삽입
- **행 삭제**: F7 또는 행의 삭제 아이콘 클릭 (Admin 권한 필요)
- **행 선택**: 행 클릭 시 선택 상태 표시 (배경색 변경)
- **다중 선택**: Ctrl+클릭으로 여러 행 선택 가능

---

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Component Library**: shadcn/ui
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS v4

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js Server Actions
- **Hosting**: Vercel
- **PWA**: Next.js PWA 지원

### Development Tools
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Code Quality**: ESLint, Prettier
- **Version Control**: Git

---

## 🏗 시스템 아키텍처

### 계층 구조
```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│  (Next.js 15 App Router + React 19)    │
├─────────────────────────────────────────┤
│          Application Layer              │
│    (Server Actions + Business Logic)   │
├─────────────────────────────────────────┤
│           Data Access Layer             │
│      (Supabase Client + RLS)           │
├─────────────────────────────────────────┤
│          Database Layer                 │
│         (Supabase PostgreSQL)          │
└─────────────────────────────────────────┘
```

### 보안 아키텍처
- **Row Level Security (RLS)**: 모든 테이블에 RLS 정책 적용
- **인증 미들웨어**: Next.js Middleware로 라우트 보호
- **JWT 기반 인증**: Supabase Auth 토큰
- **환경 변수 관리**: `.env.local`로 민감 정보 보호

---

## 📐 디자인 시스템

### 2025 최신 UI/UX 트렌드 적용

#### 1. AI 기반 사용자 경험
- 예측 분석 및 스마트 추천
- 자동화된 워크플로우

#### 2. 미니멀리스트 디자인
- 불필요한 요소 제거
- 명확한 타이포그래피
- 효과적인 여백 활용

#### 3. 다크 모드 지원
- 자동 테마 전환
- 사용자 눈의 피로 감소
- 시스템 설정 연동

#### 4. 인터랙티브 데이터 시각화
- 실시간 차트 및 그래프
- 히트맵 및 동적 리포트

#### 5. 모바일 우선 디자인
- 반응형 레이아웃
- 터치 친화적 인터페이스
- Progressive Web App (PWA)

#### 6. 모듈형 컴포넌트
- 재사용 가능한 컴포넌트
- 디자인 토큰 시스템
- 일관된 UI/UX

### 색상 팔레트
```css
/* Primary Colors */
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;

/* Secondary Colors */
--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;

/* Accent Colors */
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;

/* Semantic Colors */
--destructive: 0 84.2% 60.2%;
--success: 142 76% 36%;
--warning: 38 92% 50%;
```

### 타이포그래피
- **헤딩**: Pretendard (700, 600, 500)
- **본문**: Pretendard (400)
- **코드**: JetBrains Mono

---

## 📊 데이터베이스 스키마

### 핵심 테이블

#### 1. users (사용자)
```sql
- id: uuid (PK)
- email: text (unique)
- name: text
- employee_number: text (자동 생성)
- department_id: uuid (FK)
- position_id: uuid (FK)
- role: enum ('admin', 'user')
- employment_status: enum ('active', 'inactive')
- hire_date: date
- company_id: uuid (FK)
- created_at: timestamp
- updated_at: timestamp
```

#### 2. companies (회사)
```sql
- id: uuid (PK)
- name: text
- business_number: text (unique)
- sort_order: integer
- created_at: timestamp
- updated_at: timestamp
```

#### 3. departments (부서)
```sql
- id: uuid (PK)
- name: text
- sort_order: integer
- created_at: timestamp
- updated_at: timestamp
```

#### 4. positions (직급)
```sql
- id: uuid (PK)
- name: text
- sort_order: integer
- created_at: timestamp
- updated_at: timestamp
```

#### 5. bank_accounts (은행계좌)
```sql
- id: uuid (PK)
- company_id: uuid (FK)
- bank_name: text
- account_number: text
- initial_balance: decimal
- current_balance: decimal
- created_at: timestamp
- updated_at: timestamp
```

### RLS (Row Level Security) 정책
- 모든 테이블에 RLS 활성화
- Admin: 모든 작업 가능
- User: SELECT, INSERT, UPDATE 가능 (DELETE 제한)

---

## 🎨 인라인 편집 UX 패턴

### 핵심 원칙
1. **최소한의 마찰**: 다이얼로그 없이 테이블에서 직접 편집
2. **컨텍스트 유지**: 같은 페이지에서 작업 완료
3. **즉각적인 피드백**: 실시간 유효성 검사
4. **명확한 시각적 신호**: 호버 시 편집 가능 표시

### 구현 방법
- **shadcn/ui Table + TanStack Table**: 데이터 테이블 기반
- **더블클릭 활성화**: 셀 더블클릭 시 편집 모드 전환
- **Input 컴포넌트**: 편집 모드에서 입력 필드 표시
- **자동 저장**: Enter 키 또는 포커스 아웃 시 저장
- **낙관적 업데이트**: 서버 응답 전 UI 업데이트
- **키보드 단축키**: F5-F8 전역 단축키 지원

### 기술 스택 상세
#### TanStack Table v8
- **Headless UI 라이브러리**: 완전한 커스터마이징 가능
- **Meta API**: 테이블 인스턴스에 커스텀 함수 전달 (`table.options.meta.updateData`)
- **Cell 렌더링**: `cell` 함수에서 편집 가능 컴포넌트 반환
- **상태 관리**: `useState`로 셀 값 관리, `useEffect`로 외부 변경 동기화

#### 인라인 편집 패턴
```typescript
// 1. 더블클릭 활성화
const [isEditing, setIsEditing] = useState(false);
<div onDoubleClick={() => setIsEditing(true)}>

// 2. 낙관적 업데이트
const handleSave = async () => {
  // UI 먼저 업데이트
  setData(newData);
  // 서버에 저장
  await updateEmployee(id, data);
};

// 3. 키보드 이벤트
const handleKeyDown = (e) => {
  if (e.key === 'Enter') handleSave();
  if (e.key === 'Escape') handleCancel();
  if (e.key === 'Tab') focusNextCell();
};

// 4. 전역 단축키
useEffect(() => {
  const handleGlobalKeyDown = (e) => {
    if (e.key === 'F5') refreshData();
    if (e.key === 'F6') addRow();
    if (e.key === 'F7') deleteRow();
    if (e.key === 'F8') printTable();
  };
  window.addEventListener('keydown', handleGlobalKeyDown);
  return () => window.removeEventListener('keydown', handleGlobalKeyDown);
}, []);
```

#### Next.js 15 Server Actions 통합
- **즉시 DB 반영**: Server Actions로 데이터베이스 직접 업데이트
- **Revalidation**: `revalidatePath()`로 캐시 무효화 및 UI 자동 갱신
- **에러 처리**: 서버에서 유효성 검사 및 에러 반환
- **타입 안전성**: TypeScript로 클라이언트-서버 타입 공유

### 시각적 표시
- **호버 상태**: 편집 가능한 셀에 마우스 오버 시 배경색 변경 및 커서 변경
- **편집 모드**: 편집 중인 셀에 파란색 테두리 표시
- **저장 상태**: 저장 중 로딩 스피너 표시
- **에러 상태**: 유효성 검사 실패 시 빨간 테두리 및 에러 메시지 툴팁
- **성공 피드백**: 저장 완료 시 초록색 체크 아이콘 잠깐 표시
- **행 선택**: 선택된 행 배경색 변경 (hover와 구분)

---

## 📁 프로젝트 구조

```
inkwang-erp/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 라우트
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/              # 대시보드 레이아웃
│   │   ├── layout.tsx            # 공통 레이아웃 (헤더 + 사이드바)
│   │   ├── page.tsx              # 홈
│   │   ├── admin/                # 관리자 모듈
│   │   │   ├── employees/        # 사원관리
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   └── company/          # 회사관리
│   │   │       ├── companies/
│   │   │       ├── departments/
│   │   │       ├── positions/
│   │   │       └── bank-accounts/
│   │   └── settings/             # 설정
│   ├── api/                      # API Routes (필요 시)
│   └── layout.tsx                # 루트 레이아웃
├── components/                   # 공통 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트
│   ├── layout/                   # 레이아웃 컴포넌트
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── dashboard-layout.tsx
│   ├── tables/                   # 🎯 공통 테이블 컴포넌트 (핵심!)
│   │   ├── data-table.tsx        # 재사용 가능한 데이터 테이블
│   │   ├── editable-cell.tsx     # 인라인 편집 셀
│   │   ├── sortable-table.tsx    # 드래그 앤 드롭 정렬 테이블
│   │   └── table-toolbar.tsx     # 테이블 툴바
│   ├── dialogs/                  # 🎯 공통 다이얼로그 컴포넌트
│   │   ├── delete-confirm-dialog.tsx
│   │   └── form-dialog.tsx
│   ├── help/                     # 도움말 컴포넌트
│   │   └── keyboard-shortcuts-help.tsx
│   └── forms/                    # 폼 컴포넌트
├── lib/                          # 유틸리티 함수
│   ├── supabase/                 # Supabase 클라이언트
│   │   ├── client.ts             # 클라이언트 사이드
│   │   ├── server.ts             # 서버 사이드
│   │   └── middleware.ts         # 미들웨어
│   ├── server-actions.ts         # 🎯 공통 CRUD 액션 팩토리 (핵심!)
│   ├── utils.ts                  # 공통 유틸
│   └── validations.ts            # 유효성 검사
├── types/                        # TypeScript 타입
│   ├── database.ts               # Supabase 생성 타입
│   └── index.ts                  # 커스텀 타입
├── hooks/                        # 커스텀 훅
│   ├── use-user.ts
│   ├── use-keyboard-shortcuts.ts # 🎯 전역 단축키 훅 (핵심!)
│   └── use-toast.ts
├── actions/                      # Server Actions
│   ├── auth.ts
│   ├── employees.ts              # createCrudActions 팩토리 사용
│   ├── companies.ts              # createCrudActions 팩토리 사용
│   ├── departments.ts            # createCrudActions 팩토리 사용
│   ├── positions.ts              # createCrudActions 팩토리 사용
│   └── bank-accounts.ts          # createCrudActions 팩토리 사용
├── middleware.ts                 # Next.js 미들웨어
├── supabase/                     # Supabase 설정
│   └── migrations/               # DB 마이그레이션
└── public/                       # 정적 파일
```

**🎯 공통 컴포넌트 핵심 파일**:
1. `components/tables/data-table.tsx` - TanStack Table v8 기반 재사용 가능한 테이블
2. `components/tables/editable-cell.tsx` - 더블클릭 인라인 편집 셀
3. `components/tables/sortable-table.tsx` - 드래그 앤 드롭 정렬
4. `components/dialogs/delete-confirm-dialog.tsx` - 삭제 확인 다이얼로그
5. `hooks/use-keyboard-shortcuts.ts` - F5-F8 전역 단축키 훅
6. `lib/server-actions.ts` - CRUD Server Actions 팩토리

---

## 🚀 개발 원칙

### 1. 클린 코드
- **단일 책임 원칙**: 각 컴포넌트/함수는 하나의 역할만
- **DRY (Don't Repeat Yourself)**: 중복 코드 제거
- **명확한 네이밍**: 의도가 명확한 변수/함수명
- **작은 함수**: 50줄 이하로 유지

### 2. 컴포넌트 설계
- **재사용 가능성**: 공통 컴포넌트 우선 활용
- **Props 타입 정의**: TypeScript로 명확한 인터페이스
- **컴포지션**: 상속보다 합성 선호
- **관심사 분리**: UI 로직과 비즈니스 로직 분리

### 3. 성능 최적화
- **Server Components 우선**: 기본적으로 서버 컴포넌트 사용
- **Client Components 최소화**: 인터랙션 필요 시만 'use client'
- **이미지 최적화**: next/image 사용
- **코드 스플리팅**: 동적 임포트 활용
- **React 19 자동 최적화**: 컴파일러가 메모이제이션 자동 처리

### 4. 보안
- **환경 변수**: 민감 정보 절대 커밋 금지
- **RLS 정책**: 모든 테이블에 적용
- **입력 유효성 검사**: 클라이언트 + 서버 이중 검증
- **SQL Injection 방지**: Prepared Statements 사용

---

## 📅 프로젝트 단계

### 🔑 공통 컴포넌트 우선 전략
**핵심 원칙**: Phase 3에서 공통 컴포넌트를 먼저 구현한 후, Phase 4부터는 재사용하여 개발 속도 향상

**참고 문서**: [공통 컴포넌트 가이드](./Common_Components_Guide.md)

### Phase 1: 프로젝트 초기 설정 및 인프라 구축 (1주)
- Next.js 프로젝트 초기화
- Supabase 프로젝트 생성 및 설정
- 데이터베이스 스키마 설계 및 마이그레이션
- 기본 개발 환경 구성

**참고**: [Phase_1_초기설정.md](./Phase_1_초기설정.md)

### Phase 2: 인증 및 공통 레이아웃 구현 (1주)
- Supabase Auth 설정
- 로그인 페이지 구현
- 공통 레이아웃 (헤더 + 사이드바) 구현
- 라우트 보호 미들웨어 구현

**참고**: [Phase_2_인증및레이아웃.md](./Phase_2_인증및레이아웃.md)

### Phase 3: 관리자 모듈 - 사원관리 + 공통 컴포넌트 구현 (1.5주)
**⚠️ 중요**: 이 단계에서 **모든 공통 컴포넌트를 먼저 구현**하여 Phase 4부터 재사용

#### 공통 컴포넌트 구현 (1단계)
- `DataTable` 컴포넌트 (TanStack Table v8 기반)
- `EditableCell` 컴포넌트 (인라인 편집)
- `DeleteConfirmDialog` 컴포넌트
- `useKeyboardShortcuts` 훅 (F5-F8 단축키)
- `createCrudActions` 팩토리 (Server Actions)
- `SortableTable` 컴포넌트 (드래그 앤 드롭)

#### 사원관리 구현 (2단계)
- 공통 컴포넌트를 활용한 사원 목록 테이블
- 인라인 편집 기능 적용
- 사원 추가/수정/삭제 기능
- 권한별 기능 제한

**예상 효과**:
- 코드 중복 70% 감소
- Phase 4 개발 속도 50% 향상
- 일관된 UX 제공

**참고**: [Phase_3_사원관리.md](./Phase_3_사원관리.md), [공통 컴포넌트 가이드](./Common_Components_Guide.md)

### Phase 4: 관리자 모듈 - 회사관리 (1.5주 → 0.75주로 단축)
**전략**: Phase 3에서 구현한 공통 컴포넌트 재사용으로 개발 기간 **50% 단축**

- 회사 정보 관리 (DataTable + EditableCell + DeleteConfirmDialog 재사용)
- 부서 관리 (SortableTable 재사용)
- 직급 관리 (SortableTable 재사용)
- 은행계좌 관리 (DataTable + EditableCell 재사용)
- 전체 모듈에 useKeyboardShortcuts 훅 적용

**참고**: [Phase_4_회사관리.md](./Phase_4_회사관리.md)

### Phase 5: UI/UX 최적화 및 PWA 구현 (1주)
- 다크 모드 구현
- 애니메이션 추가 (Framer Motion)
- 반응형 디자인 최적화
- PWA 설정 및 테스트

**참고**: [Phase_5_UI_UX_PWA.md](./Phase_5_UI_UX_PWA.md)

### Phase 6: 테스트 및 배포 (1주)
- E2E 테스트 작성 (Playwright)
- 공통 컴포넌트 단위 테스트
- 성능 최적화
- Vercel 배포 설정
- 프로덕션 배포 및 모니터링

**참고**: [Phase_6_테스트_배포.md](./Phase_6_테스트_배포.md)

**총 예상 기간**: 6.25주 (공통 컴포넌트 전략으로 **0.75주 단축**)

---

## 🎯 성공 지표

### 기술적 지표
- **성능**: Lighthouse 점수 90점 이상
- **접근성**: WCAG 2.1 AA 준수
- **SEO**: 검색 엔진 최적화 완료
- **보안**: 모든 RLS 정책 적용 완료

### 사용자 경험 지표
- **로그인 성공률**: 95% 이상
- **페이지 로딩 시간**: 3초 이내
- **모바일 사용성**: 모든 기능 모바일에서 사용 가능
- **에러율**: 1% 미만

### 비즈니스 지표
- **데이터 일관성**: 엑셀 대비 100% 표준화
- **작업 효율**: 50% 시간 단축
- **사용자 만족도**: 8/10 이상
- **시스템 가동률**: 99.9% 이상

---

## 📚 참고 자료

### 공식 문서
- [Next.js 15 문서](https://nextjs.org/docs)
- [React 19 문서](https://react.dev/)
- [Supabase 문서](https://supabase.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)
- [Framer Motion 문서](https://www.framer.com/motion/)

### 베스트 프랙티스
- Next.js 15 App Router 패턴
- React 19 Server Components
- Supabase RLS 보안 가이드
- 인라인 편집 UX 패턴
- 2025 UI/UX 디자인 트렌드

---

## 🔄 다음 단계

1. ✅ **청사진 문서 작성 완료**
2. 📝 **Phase 1 문서**: 프로젝트 초기 설정 상세 가이드
3. 📝 **Phase 2 문서**: 인증 및 레이아웃 구현 가이드
4. 📝 **Phase 3 문서**: 사원관리 구현 가이드
5. 📝 **Phase 4 문서**: 회사관리 구현 가이드
6. 📝 **Phase 5 문서**: UI/UX 최적화 가이드
7. 📝 **Phase 6 문서**: 테스트 및 배포 가이드

---

**작성일**: 2025년 9월 30일
**버전**: 1.0.0
**작성자**: Claude Code SuperClaude
**프로젝트명**: 인광 토양정화 ERP 시스템