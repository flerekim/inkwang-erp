# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **최종 업데이트**: 2025년 10월 18일
> **프로젝트 타입**: Enterprise Resource Planning (ERP) System
> **배포 환경**: Production-ready with CI/CD

## Quick Start

```bash
# 개발 환경 시작 (Turbopack 사용)
pnpm dev

# 프로덕션 빌드 (Turbopack Beta 활성화)
pnpm build

# 프로덕션 서버 실행
pnpm start

# 코드 품질 검사
pnpm lint          # ESLint 실행
pnpm type-check    # TypeScript 타입 체크
pnpm type-check:watch  # 타입 체크 (감시 모드)

# Supabase 타입 생성 (스키마 변경 시)
pnpm types:gen
```

**개발 서버**: http://localhost:3001 (기본 포트 설정됨)

## Tech Stack (2025년 1월 기준)

### Core Framework
- **Framework**: Next.js 15.5.4 (App Router, Turbopack Beta)
  - Turbopack으로 4배 빠른 빌드 속도
  - Node.js Middleware 지원 (Stable)
  - 향상된 TypeScript 통합 (Typed routes, route validation)
- **React**: 19.1.0 (최신 안정 버전)
- **TypeScript**: 5.x (Strict mode 활성화)
- **Package Manager**: pnpm 10.17.0 (워크스페이스 지원)

### Styling & UI
- **CSS Framework**: Tailwind CSS v4.0 (2025년 1월 22일 출시)
  - Rust 기반 새 엔진으로 5배 빠른 빌드
  - 네이티브 cascade layers 지원
  - P3 컬러 팔레트 및 container queries 내장
- **Component Library**: Radix UI + shadcn/ui (최신 패턴)
- **Animation**: Framer Motion 12.x
- **Icons**: Lucide React (최적화된 SVG 아이콘)

### Data Management
- **Database**: Supabase (2025년 1월 업데이트)
  - 향상된 AI Assistant 통합
  - Edge Functions 대시보드 직접 편집
  - Database Messaging 시스템
  - Vercel Branching Integration
- **State Management**: React 19 built-in hooks + Context API
- **Forms**: React Hook Form 7.x + Zod 4.x (타입 안전 검증)
- **Tables**: TanStack Table v8 (고성능 데이터 테이블)
- **Drag & Drop**: @dnd-kit (접근성 준수)

### Developer Experience
- **Analytics**: Vercel Analytics + Speed Insights
- **PWA Support**: Service Worker + Web App Manifest
- **Theme System**: next-themes (다크 모드 지원)
- **Excel Export**: xlsx (데이터 내보내기)
- **Print Support**: react-to-print (인쇄 기능)

## Project Structure

```
inkwang-erp/
├── src/
│   ├── actions/          # Server Actions (Next.js 15 패턴)
│   │   ├── auth.ts      # 인증 관련 액션
│   │   ├── employees.ts # 직원 관리 액션
│   │   ├── orders.ts    # 주문 관리 액션
│   │   └── ...
│   ├── app/             # App Router (라우팅 시스템)
│   │   ├── (auth)/      # 인증 라우트 그룹
│   │   │   └── login/
│   │   ├── (dashboard)/ # 대시보드 라우트 그룹
│   │   │   ├── admin/   # 관리자 페이지
│   │   │   │   ├── employees/     # 직원 관리
│   │   │   │   │   ├── hooks/           # 직원 관련 커스텀 훅
│   │   │   │   │   │   ├── useEmployeeData.ts    # 데이터 관리
│   │   │   │   │   │   └── useEmployeeActions.ts # 액션 관리
│   │   │   │   │   ├── components/      # 직원 관련 컴포넌트
│   │   │   │   │   │   └── EmployeeToolbar.tsx  # 툴바 컴포넌트
│   │   │   │   │   ├── employees-table.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   └── company/       # 회사 정보 관리
│   │   │   └── inkwang-es/        # 인광ES 전용
│   │   │       ├── basics/        # 기본 정보
│   │   │       │   └── customers/ # 고객 관리
│   │   │       └── sales/         # 영업 관리
│   │   │           └── orders/    # 주문 관리
│   │   └── layout.tsx   # 루트 레이아웃
│   ├── components/      # 재사용 컴포넌트
│   │   ├── common/      # 공통 컴포넌트
│   │   │   ├── data-table.tsx         # 데이터 테이블
│   │   │   ├── editable-cell.tsx      # 인라인 편집 셀
│   │   │   ├── crud-table-toolbar.tsx # CRUD 툴바
│   │   │   └── ...
│   │   ├── ui/          # shadcn/ui 컴포넌트
│   │   ├── layout/      # 레이아웃 컴포넌트
│   │   ├── dialogs/     # 다이얼로그 컴포넌트
│   │   └── charts/      # 차트 컴포넌트
│   ├── hooks/           # 커스텀 React 훅
│   ├── lib/             # 유틸리티 및 설정
│   │   ├── supabase/    # Supabase 클라이언트
│   │   │   ├── client.ts    # 브라우저 클라이언트
│   │   │   ├── server.ts    # 서버 클라이언트
│   │   │   └── middleware.ts # 미들웨어 클라이언트
│   │   ├── server-actions.ts # CRUD 팩토리 패턴
│   │   ├── auth.ts          # 인증 헬퍼
│   │   ├── validations.ts   # Zod 스키마
│   │   └── utils.ts         # 유틸리티 함수
│   └── types/           # TypeScript 타입 정의
│       ├── index.ts     # 타입 내보내기
│       └── database.ts  # Supabase 생성 타입
├── supabase/            # Supabase 설정
│   ├── migrations/      # 데이터베이스 마이그레이션
│   └── .temp/          # 임시 파일 (git ignore)
├── public/             # 정적 파일
│   └── manifest.json   # PWA 매니페스트
├── pnpm-workspace.yaml # pnpm 워크스페이스 설정
└── next.config.ts      # Next.js 설정 (Turbopack 활성화)
```

## Architecture Patterns

### 1. Server Actions Pattern (Next.js 15)

**⚠️ Critical**: `'use server'` 디렉티브 사용 시 destructuring export 불가

```typescript
// ❌ 잘못된 예시 - destructuring 사용 불가
export const { getAll, create } = createCrudActions('table');

// ✅ 올바른 예시 - 명시적 async 함수 래퍼
const crudActions = createCrudActions<Entity>('table_name', ['/revalidate/path']);

export async function getAll(orderBy?: { column: string; desc: boolean }) {
  return crudActions.getAll(orderBy);
}

export async function create(data: Partial<Entity>) {
  return crudActions.create(data);
}

export async function update(id: string, data: Partial<Entity>) {
  return crudActions.update(id, data);
}

export async function remove(id: string) {
  return crudActions.remove(id);
}
```

### 2. Authentication & Authorization

```typescript
// 세션 관리 패턴
import { createClient } from '@/lib/supabase/server';

export async function checkAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return user;
}
```

**역할 기반 접근 제어 (RBAC)**:
- `admin` - 전체 권한 (모든 모듈 접근 가능)
- `manager` - 제한된 권한 (할당된 모듈만 접근)
- `employee` - 읽기 전용 (조회만 가능)

### 3. Data Table Pattern

**메모이제이션 필수** (무한 렌더링 방지):

```typescript
// ✅ 항상 useMemo로 데이터와 컬럼 메모이제이션
const data = useMemo(() => users, [users]);

const columns = useMemo<ColumnDef<User>[]>(() => [
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
    cell: ({ row, getValue }) => (
      <EditableCell
        id={row.original.id}
        field="name"
        value={getValue<string>()}
        onSave={handleSave}
      />
    ),
  },
  // ... 추가 컬럼
], [handleSave]); // 의존성 배열에 콜백 함수 포함
```

### 4. Component Separation Pattern (관심사 분리)

**복잡한 테이블 컴포넌트 분리 패턴**:

```typescript
// ❌ 잘못된 예시 - 모든 로직이 하나의 파일에 (500+ 줄)
export function EmployeesTable({ data }: Props) {
  // 100+ 줄의 상태 관리
  // 100+ 줄의 데이터 페칭
  // 100+ 줄의 CRUD 핸들러
  // 200+ 줄의 JSX
}

// ✅ 올바른 예시 - 관심사별 분리
// 1. hooks/useEmployeeData.ts - 데이터 관리
export function useEmployeeData(initialData: UserWithDetails[]) {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  // 관계형 데이터 로드
  useEffect(() => {
    // ... 데이터 로딩 로직
  }, []);

  return { companies, departments, positions, ... };
}

// 2. hooks/useEmployeeActions.ts - 액션 관리
export function useEmployeeActions(
  tableState: UseTableStateReturn<UserWithDetails>,
  companies: Company[]
) {
  // CRUD 작업과 비즈니스 로직
  const handleAddEmployee = useCallback(() => { ... }, []);
  const handleSaveNewRow = useCallback(async () => { ... }, []);

  return { handleAddEmployee, handleSaveNewRow, ... };
}

// 3. components/EmployeeToolbar.tsx - UI 컴포넌트
export function EmployeeToolbar({ ... }: Props) {
  // 툴바 UI와 Excel/Print 기능
  return <CrudTableToolbar ... />;
}

// 4. employees-table.tsx - 메인 컴포넌트 (오케스트레이션)
export function EmployeesTable({ data, currentUser }: Props) {
  // 훅 조합
  const tableState = useTableState<UserWithDetails>(data);
  const employeeData = useEmployeeData(tableState.displayData);
  const employeeActions = useEmployeeActions(tableState, employeeData.companies);

  return (
    <>
      <DataTable toolbar={<EmployeeToolbar ... />} />
      <MobileView ... />
    </>
  );
}
```

**분리 효과**:
- 코드 라인: 569줄 → 약 250줄 (57% 감소)
- 재사용성: 훅과 컴포넌트 독립적 재사용 가능
- 테스트 용이성: 각 모듈 독립적 테스트 가능
- 유지보수성: 명확한 책임 분리로 수정 범위 축소

### 5. Form Validation Pattern

```typescript
// Zod 스키마 정의
export const userSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일을 입력하세요'),
  role: z.enum(['admin', 'manager', 'employee']),
  company_id: z.string().uuid('회사를 선택하세요'),
});

// React Hook Form과 통합
const form = useForm<z.infer<typeof userSchema>>({
  resolver: zodResolver(userSchema),
  defaultValues: {
    name: '',
    email: '',
    role: 'employee',
  },
});
```

## Component Library

### Core Components (필수 사용)

| 컴포넌트 | 용도 | 위치 |
|---------|------|------|
| **DataTable** | 모든 리스트/테이블 뷰 | `components/common/data-table.tsx` |
| **EditableCell** | 인라인 텍스트 편집 | `components/common/editable-cell.tsx` |
| **EditableSelectCell** | 인라인 드롭다운 편집 | `components/common/editable-select-cell.tsx` |
| **EditableDateCell** | 인라인 날짜 편집 | `components/common/editable-date-cell.tsx` |
| **CrudTableToolbar** | CRUD 작업 툴바 | `components/common/crud-table-toolbar.tsx` |
| **ExportToExcel** | Excel 내보내기 | `components/common/export-to-excel.tsx` |
| **PrintTable** | 테이블 인쇄 | `components/common/print-table.tsx` |
| **FormDialog** | 폼 다이얼로그 | `components/dialogs/form-dialog.tsx` |
| **DeleteConfirmDialog** | 삭제 확인 | `components/dialogs/delete-confirm-dialog.tsx` |

### Mobile-Responsive Pattern

```typescript
// 반응형 테이블 구현
const EmployeesPage = () => {
  // 모바일 감지
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <MobileEmployeeCards data={employees} />;
  }

  return <DataTable columns={columns} data={employees} />;
};
```

## Database Schema

### 주요 테이블 구조

```sql
-- 사용자 (직원)
users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  name text NOT NULL,
  role user_role NOT NULL,
  company_id uuid REFERENCES companies(id),
  department_id uuid REFERENCES departments(id),
  position_id uuid REFERENCES positions(id),
  created_at timestamptz DEFAULT now()
)

-- 회사 정보
companies (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  business_number text UNIQUE,
  ceo_name text,
  created_at timestamptz DEFAULT now()
)

-- 주문 관리 (인광ES)
orders (
  id uuid PRIMARY KEY,
  order_number text UNIQUE,
  contract_name text NOT NULL,
  contract_date date,
  contract_amount decimal,
  status order_status,
  customer_id uuid REFERENCES customers(id),
  created_at timestamptz DEFAULT now()
)

-- 오염물질 (다대다 관계)
order_pollutants (
  order_id uuid REFERENCES orders(id),
  pollutant_id uuid REFERENCES pollutants(id),
  concentration decimal,
  group_name text,
  PRIMARY KEY (order_id, pollutant_id)
)
```

## Performance Optimization

### 1. Next.js 15 최적화
- **Turbopack**: 개발 및 프로덕션 빌드에서 4배 빠른 속도
- **Server Components**: 기본적으로 서버 컴포넌트 사용
- **Streaming SSR**: 점진적 렌더링으로 초기 로딩 개선
- **Automatic Code Splitting**: 자동 코드 분할

### 2. Tailwind CSS v4 최적화
- **Lightning CSS**: Rust 기반 파서로 100배 빠른 증분 빌드
- **Native Layers**: CSS cascade layers로 스타일 우선순위 제어
- **Automatic Purging**: 사용하지 않는 스타일 자동 제거

### 3. 이미지 최적화
```typescript
// Next.js Image 컴포넌트 사용
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Company Logo"
  width={200}
  height={50}
  priority // LCP 이미지에 사용
  placeholder="blur" // 블러 플레이스홀더
/>
```

### 4. 데이터 캐싱

**⚠️ Next.js 15 캐싱 주의사항**:

```typescript
// ❌ 잘못된 예시 - unstable_cache에서 cookies() 사용 불가
export const getEmployees = unstable_cache(
  async () => {
    const supabase = await createClient(); // 내부적으로 cookies() 사용
    // Error: Route used "cookies" inside a function cached with "unstable_cache(...)"
  },
  ['employees-list'],
  { revalidate: 60 }
);

// ✅ 올바른 예시 1 - Page 레벨 캐싱
// page.tsx
export const revalidate = 60; // Page 레벨 캐싱

export default async function EmployeesPage() {
  const result = await getEmployees();
  return <EmployeesTable data={result.data} />;
}

// actions/employees.ts
export async function getEmployees() {
  const supabase = await createClient();
  // ... 쿼리 로직
}

// ✅ 올바른 예시 2 - Server Action에서 revalidatePath 사용
export async function updateUser(id: string, data: Partial<User>) {
  const result = await supabase
    .from('users')
    .update(data)
    .eq('id', id);

  // 캐시 무효화
  revalidatePath('/admin/employees');
  revalidateTag('employees'); // 태그 기반 재검증

  return result;
}
```

**캐싱 전략**:
- **Page 레벨**: `export const revalidate = 60` (초 단위)
- **Tag 기반**: `revalidateTag('employees')` (수동 무효화)
- **Path 기반**: `revalidatePath('/admin/employees')` (경로 무효화)

## Testing Strategy

### E2E Testing (Playwright)
```typescript
// 브라우저 자동화 테스트
test('사용자 생성 플로우', async ({ page }) => {
  // 페이지 이동
  await page.goto('http://localhost:3001/admin/employees');

  // 버튼 클릭
  await page.click('button:has-text("직원 추가")');

  // 폼 입력
  await page.fill('input[name="name"]', '홍길동');
  await page.fill('input[name="email"]', 'hong@example.com');

  // 제출 및 검증
  await page.click('button:has-text("저장")');
  await expect(page.locator('text=홍길동')).toBeVisible();
});
```

### Unit Testing
```typescript
// Zod 스키마 테스트
describe('User Validation', () => {
  it('should validate correct user data', () => {
    const validData = {
      name: '홍길동',
      email: 'hong@example.com',
      role: 'employee',
    };

    expect(() => userSchema.parse(validData)).not.toThrow();
  });
});
```

## Security Best Practices

### 1. 환경 변수 관리
```bash
# .env.local (절대 커밋하지 않음)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key # 서버 전용
```

### 2. RLS (Row Level Security)
```sql
-- Supabase RLS 정책 예시
CREATE POLICY "Users can view own company data"
ON users FOR SELECT
USING (auth.uid() = id OR
       company_id IN (
         SELECT company_id FROM users
         WHERE id = auth.uid()
       ));
```

### 3. Input Validation
- 모든 사용자 입력은 Zod로 검증
- SQL Injection 방지 (Supabase 파라미터화된 쿼리)
- XSS 방지 (React 자동 이스케이핑)

## Deployment

### Vercel 배포 (권장)
```bash
# Vercel CLI로 배포
vercel --prod

# 환경 변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Docker 배포
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
RUN npm install -g pnpm && pnpm install --prod
EXPOSE 3000
CMD ["pnpm", "start"]
```

## Troubleshooting

### Common Issues

| 문제 | 원인 | 해결 방법 |
|-----|------|----------|
| **Server Actions 에러** | Destructuring export 사용 | 명시적 async 함수로 변경 |
| **unstable_cache + cookies 에러** | 캐시 함수 내부에서 cookies() 사용 | Page 레벨 캐싱으로 변경 (`export const revalidate = 60`) |
| **무한 렌더링** | useMemo 미사용 | 데이터와 컬럼 메모이제이션 |
| **Tailwind 스타일 미적용** | 캐시 문제 | `.next` 폴더 삭제 후 재시작 |
| **Supabase 타입 에러** | 스키마 변경 | `pnpm types:gen` 실행 |
| **세션 만료** | 미들웨어 설정 | middleware.ts 확인 |
| **빌드 실패** | 타입 에러 | `pnpm type-check` 실행 |

### Debug Commands

```bash
# 타입 체크
pnpm type-check

# 의존성 확인
pnpm ls

# 캐시 클리어
rm -rf .next node_modules
pnpm install
pnpm dev

# Supabase 로컬 개발
npx supabase start
npx supabase db reset
```

## Code Style Guidelines

### 명명 규칙
- **컴포넌트**: PascalCase (`UserTable.tsx`)
- **함수/변수**: camelCase (`getUserData`)
- **상수**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **타입/인터페이스**: PascalCase (`UserProfile`)
- **파일명**: kebab-case (`user-profile.tsx`)

### 주석 규칙
```typescript
// 한국어: 비즈니스 로직, 사용자 관련 설명
// 영어: 기술적 설명, 프레임워크 관련

/**
 * 사용자 정보를 업데이트합니다
 * @param id - 사용자 ID
 * @param data - 업데이트할 데이터
 * @returns 성공/실패 결과
 */
export async function updateUser(id: string, data: Partial<User>) {
  // Technical: Using Server Action pattern for revalidation
  const result = await crudActions.update(id, data);
  return result;
}
```

### Import 순서
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. 외부 라이브러리
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

// 3. 내부 컴포넌트
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';

// 4. 유틸리티/타입
import { cn } from '@/lib/utils';
import type { User } from '@/types';

// 5. 스타일/에셋
import styles from './styles.module.css';
```

## API Reference

### Server Actions API

```typescript
// CRUD 팩토리 패턴
const crudActions = createCrudActions<T>(
  tableName: string,
  revalidatePaths: string[]
);

// 제공되는 메서드
crudActions.getAll(orderBy?: OrderBy)        // 목록 조회
crudActions.getById(id: string)              // 단일 조회
crudActions.create(data: Partial<T>)         // 생성
crudActions.update(id: string, data: Partial<T>) // 수정
crudActions.remove(id: string)               // 삭제
crudActions.reorder(items: ReorderItem[])    // 순서 변경
```

### Supabase Client API

```typescript
// 서버 컴포넌트용
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();

// 클라이언트 컴포넌트용
import { createClient } from '@/lib/supabase/client';
const supabase = createClient();

// 미들웨어용
import { updateSession } from '@/lib/supabase/middleware';
await updateSession(request);
```

## Version History

- **v0.1.0** (2024-12) - 초기 릴리즈, 기본 CRUD 기능
- **v0.2.0** (2025-01) - 인광ES 모듈 추가, 주문 관리 시스템
- **v0.3.0** (2025-01) - Tailwind CSS v4 마이그레이션, 성능 최적화
- **v0.3.1** (2025-01) - 컴포넌트 분리 리팩토링, unstable_cache 이슈 수정
  - EmployeesTable 컴포넌트를 훅과 컴포넌트로 분리 (57% 코드 감소)
  - Next.js 15 캐싱 전략 개선 (Page 레벨 캐싱 적용)
  - 관심사 분리 패턴 적용으로 유지보수성 향상
- **v0.4.0** (예정) - 리포트 기능, 대시보드 고도화

## Contributing

### 브랜치 전략
- `main` - 프로덕션 브랜치
- `develop` - 개발 브랜치
- `feature/*` - 기능 개발
- `hotfix/*` - 긴급 수정

### 커밋 메시지 규칙
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 및 설정 변경
```

## Support

- **이슈 트래커**: GitHub Issues
- **문서**: 이 파일과 `/docs` 디렉토리
- **개발자 문의**: 프로젝트 관리자에게 문의

---

*이 문서는 Claude Code (claude.ai/code)가 프로젝트를 이해하고 효과적으로 작업할 수 있도록 작성되었습니다.*