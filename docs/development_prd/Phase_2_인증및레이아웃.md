# Phase 2: 인증 및 공통 레이아웃 구현

## 📋 개요
- **예상 기간**: 1주 (5일)
- **목표**: Supabase Auth 기반 인증 시스템 구축 및 2025 최신 UI/UX 트렌드를 반영한 공통 레이아웃 구현
- **결과물**: 완전히 작동하는 로그인 시스템 + 고정 헤더/사이드바가 있는 대시보드 레이아웃

---

## ✅ 체크리스트

### 1단계: Supabase Auth 설정
- [ ] Auth 스키마 확장
- [ ] 사용자 생성 트리거 함수 작성
- [ ] Auth Hook 설정
- [ ] 이메일 템플릿 커스터마이징

### 2단계: 인증 미들웨어 구현
- [ ] Next.js 미들웨어 작성
- [ ] 라우트 보호 로직 구현
- [ ] 권한 기반 리다이렉트 구현

### 3단계: 로그인 페이지 구현
- [ ] 로그인 페이지 UI 디자인
- [ ] 폼 유효성 검사
- [ ] 로그인 Server Action 작성
- [ ] 에러 처리 및 토스트 알림

### 4단계: 공통 레이아웃 구현
- [ ] 대시보드 레이아웃 구조 설계
- [ ] 헤더 컴포넌트 구현
- [ ] 사이드바 컴포넌트 구현
- [ ] 반응형 네비게이션 구현

### 5단계: 다크 모드 구현
- [ ] 테마 Provider 설정
- [ ] 테마 토글 컴포넌트
- [ ] 시스템 설정 연동
- [ ] 로컬 스토리지 저장

### 6단계: 사용자 프로필 및 로그아웃
- [ ] 사용자 정보 표시
- [ ] 프로필 드롭다운 메뉴
- [ ] 로그아웃 기능 구현

### 7단계: 애니메이션 및 인터랙션
- [ ] Framer Motion 설정
- [ ] 페이지 전환 애니메이션
- [ ] 사이드바 호버 효과
- [ ] 스무스 스크롤

---

## 📚 상세 구현 가이드

### 1단계: Supabase Auth 설정

#### 1.1 Auth 스키마 확장 마이그레이션

**`supabase/migrations/20250930000002_auth_setup.sql`**:
```sql
-- ============================================
-- Supabase Auth 설정 및 확장
-- ============================================

-- 1. 사용자 생성 시 자동으로 users 테이블에 데이터 삽입하는 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_number TEXT;
    v_default_company_id UUID;
BEGIN
    -- 기본 회사 ID 가져오기 (인광)
    SELECT id INTO v_default_company_id
    FROM companies
    WHERE name = '인광'
    LIMIT 1;

    -- 사번 자동 생성
    v_employee_number := generate_employee_number();

    -- users 테이블에 데이터 삽입
    INSERT INTO public.users (
        id,
        email,
        name,
        employee_number,
        company_id,
        role,
        employment_status,
        hire_date
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        v_employee_number,
        COALESCE((NEW.raw_user_meta_data->>'company_id')::UUID, v_default_company_id),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
        'active',
        COALESCE((NEW.raw_user_meta_data->>'hire_date')::DATE, CURRENT_DATE)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 2. 사용자 삭제 시 users 테이블 데이터도 삭제 (CASCADE로 자동 처리됨)
-- 추가 정리 작업이 필요하면 여기에 작성

-- 3. 이메일 도메인 검증 함수
CREATE OR REPLACE FUNCTION validate_inkwang_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email LIKE '%@inkwang.co.kr';
END;
$$ LANGUAGE plpgsql;

-- 4. 관리자가 사용자 생성하는 함수
CREATE OR REPLACE FUNCTION admin_create_user(
    p_user_id TEXT,
    p_password TEXT,
    p_name TEXT,
    p_department_id UUID DEFAULT NULL,
    p_position_id UUID DEFAULT NULL,
    p_role user_role DEFAULT 'user',
    p_hire_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    v_email TEXT;
    v_employee_number TEXT;
    v_company_id UUID;
    v_result JSON;
BEGIN
    -- 권한 확인 (호출자가 admin인지)
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION '권한이 없습니다';
    END IF;

    -- 이메일 생성
    v_email := p_user_id || '@inkwang.co.kr';

    -- 기본 회사 ID 가져오기
    SELECT id INTO v_company_id
    FROM companies
    WHERE name = '인광'
    LIMIT 1;

    -- 사번 생성
    v_employee_number := generate_employee_number();

    -- 결과 반환 (실제 사용자 생성은 애플리케이션에서 Supabase Admin API 사용)
    v_result := json_build_object(
        'email', v_email,
        'employee_number', v_employee_number,
        'company_id', v_company_id,
        'metadata', json_build_object(
            'name', p_name,
            'department_id', p_department_id,
            'position_id', p_position_id,
            'role', p_role,
            'hire_date', p_hire_date
        )
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ Auth 설정 완료';
    RAISE NOTICE '🔐 사용자 생성 트리거 활성화';
    RAISE NOTICE '📧 이메일 도메인 검증 함수 생성';
END $$;
```

**마이그레이션 실행**:
```bash
# SQL Editor에서 실행하거나
supabase db push
```

#### 1.2 Supabase Auth 설정 (대시보드)

1. **Supabase 대시보드** → **Authentication** → **Settings** 이동

2. **Site URL** 설정:
   - `http://localhost:3000` (개발)
   - `https://your-domain.com` (프로덕션)

3. **Redirect URLs** 추가:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

4. **Email Auth** 설정:
   - **Enable Email Signup**: ✅ (활성화)
   - **Enable Email Confirmations**: ❌ (비활성화 - 관리자가 계정 생성)
   - **Secure Email Change**: ✅

5. **Email Templates** 커스터마이징:
   - **Invite User** 템플릿 수정 (관리자가 초대할 때 사용)

---

### 2단계: 인증 미들웨어 구현

#### 2.1 Next.js 미들웨어

**`middleware.ts`** (루트):
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Supabase 세션 업데이트
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - public 폴더 파일
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

#### 2.2 라우트 보호 유틸리티

**`lib/auth.ts`**:
```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';

/**
 * 현재 인증된 사용자 가져오기
 * 인증되지 않은 경우 로그인 페이지로 리다이렉트
 */
export async function getCurrentUser(): Promise<User> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login');
  }

  // users 테이블에서 전체 사용자 정보 가져오기
  const { data: user, error } = await supabase
    .from('users')
    .select(
      `
      *,
      department:departments(*),
      position:positions(*),
      company:companies(*)
    `
    )
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    redirect('/login');
  }

  return user as User;
}

/**
 * 관리자 권한 확인
 * Admin이 아니면 홈으로 리다이렉트
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();

  if (user.role !== 'admin') {
    redirect('/');
  }

  return user;
}

/**
 * 인증 여부만 확인 (리다이렉트 없음)
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select(
      `
      *,
      department:departments(*),
      position:positions(*),
      company:companies(*)
    `
    )
    .eq('id', authUser.id)
    .single();

  return (user as User) || null;
}
```

---

### 3단계: 로그인 페이지 구현

#### 3.1 로그인 Server Action

**`actions/auth.ts`**:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';

export async function login(formData: FormData) {
  const supabase = await createClient();

  // 폼 데이터 추출
  const userId = formData.get('userId') as string;
  const password = formData.get('password') as string;

  // 유효성 검사
  const validation = loginSchema.safeParse({ userId, password });

  if (!validation.success) {
    return {
      error: validation.error.errors[0].message,
    };
  }

  // 이메일 생성 (@inkwang.co.kr 추가)
  const email = `${userId}@${process.env.NEXT_PUBLIC_DOMAIN}`;

  // 로그인 시도
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: '아이디 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 성공 시 대시보드로 리다이렉트
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: '로그아웃에 실패했습니다.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
```

#### 3.2 로그인 페이지 UI

**`app/(auth)/layout.tsx`**:
```typescript
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이미 로그인된 경우 대시보드로 리다이렉트
  const user = await getUser();

  if (user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {children}
    </div>
  );
}
```

**`app/(auth)/login/page.tsx`**:
```typescript
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="relative w-full max-w-md mx-4">
      {/* Glassmorphism 배경 효과 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20 animate-pulse" />

      {/* 메인 카드 - Glassmorphism 스타일 */}
      <div className="relative backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/30" />

        {/* 컨텐츠 */}
        <div className="relative p-8 sm:p-10">
          {/* 로고 영역 */}
          <div className="flex flex-col items-center space-y-6 mb-8">
            {/* 3D 효과 로고 */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl blur-xl opacity-50" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white drop-shadow-lg">인광</span>
              </div>
            </div>

            {/* 타이틀 */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                토양정화 ERP
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                업무 효율을 높이는 스마트한 관리 시스템
              </p>
            </div>
          </div>

          {/* 로그인 폼 */}
          <LoginForm />

          {/* 푸터 */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground">
              © {new Date().getFullYear()} 인광. All rights reserved.
            </p>
          </div>
        </div>

        {/* 하단 장식 라인 */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      </div>
    </div>
  );
}
```

**`app/(auth)/login/login-form.tsx`**:
```typescript
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, LogIn, Mail, Lock } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          로그인 중...
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" />
          로그인
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <form action={formAction} className="space-y-6">
      {/* 에러 메시지 */}
      {state?.error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in-50 slide-in-from-top-2 backdrop-blur-sm bg-red-50/90 dark:bg-red-950/90 border-red-200 dark:border-red-800"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* 아이디 입력 */}
      <div className="space-y-2">
        <Label htmlFor="userId" className="text-sm font-semibold text-foreground/80">
          아이디
        </Label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            id="userId"
            name="userId"
            type="text"
            placeholder="아이디를 입력하세요"
            className="h-12 pl-10 pr-32 text-base backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-2 focus:border-primary transition-all duration-200"
            required
            autoFocus
            autoComplete="username"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
            @inkwang.co.kr
          </span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          이메일 도메인은 자동으로 추가됩니다
        </p>
      </div>

      {/* 비밀번호 입력 */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">
          비밀번호
        </Label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="비밀번호를 입력하세요"
            className="h-12 pl-10 text-base backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 border-2 focus:border-primary transition-all duration-200"
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {/* 로그인 버튼 */}
      <div className="pt-2">
        <SubmitButton />
      </div>

      {/* 도움말 */}
      <div className="pt-6 border-t border-border/50">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            계정이 필요하신가요?
          </p>
          <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            관리자에게 문의하세요
          </p>
        </div>
      </div>
    </form>
  );
}
```

---

### 4단계: 공통 레이아웃 구현

#### 4.1 대시보드 레이아웃 구조

**`app/(dashboard)/layout.tsx`**:
```typescript
import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 확인 및 사용자 정보 가져오기
  const user = await getCurrentUser();

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
```

#### 4.2 헤더 컴포넌트

**`components/layout/header.tsx`**:
```typescript
'use client';

import { Menu, Bell, Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from './user-nav';
import type { User } from '@/types';

interface HeaderProps {
  user: User;
  onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        {/* 모바일 메뉴 버튼 */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden hover:bg-primary/10 transition-colors"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* 로고 */}
        <div className="flex items-center gap-3 font-bold text-xl">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative w-9 h-9 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold drop-shadow">인광</span>
            </div>
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            토양정화 ERP
          </span>
        </div>

        {/* 검색 (데스크톱) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder="검색... (Ctrl+K)"
              className="pl-10 pr-12 h-10 backdrop-blur-sm bg-muted/50 border-2 focus:border-primary transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </div>

        {/* 우측 액션 버튼들 */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* 검색 (모바일) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-primary/10"
            aria-label="검색"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* 알림 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-primary/10"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-gradient-to-r from-red-500 to-pink-500 border-2 border-background">
              <span className="text-[10px] font-bold">3</span>
            </Badge>
          </Button>

          {/* 다크 모드 토글 */}
          <ThemeToggle />

          {/* 사용자 메뉴 */}
          <UserNav user={user} />
        </div>
      </div>
    </header>
  );
}
```

#### 4.3 사이드바 컴포넌트

**`components/layout/sidebar.tsx`**:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: '관리자',
    href: '/admin',
    icon: Settings,
    adminOnly: true,
    children: [
      {
        title: '사원관리',
        href: '/admin/employees',
        icon: Users,
      },
      {
        title: '회사관리',
        href: '/admin/company',
        icon: Building2,
        children: [
          {
            title: '회사 정보',
            href: '/admin/company/companies',
            icon: Building2,
          },
          {
            title: '부서 관리',
            href: '/admin/company/departments',
            icon: Building2,
          },
          {
            title: '직급 관리',
            href: '/admin/company/positions',
            icon: Building2,
          },
          {
            title: '은행계좌',
            href: '/admin/company/bank-accounts',
            icon: Building2,
          },
        ],
      },
    ],
  },
];

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // 관리자가 아니면 관리자 메뉴 필터링
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user.role === 'admin'
  );

  return (
    <>
      {/* 모바일 오버레이 - Glassmorphism */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
          aria-label="사이드바 닫기"
        />
      )}

      {/* 사이드바 */}
      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 border-r bg-background/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="메인 네비게이션"
      >
        <ScrollArea className="h-full py-6">
          <div className="space-y-2 px-3">
            {filteredNavItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                pathname={pathname}
                onClose={onClose}
              />
            ))}
          </div>

          <Separator className="my-6 mx-3" />

          {/* 사용자 정보 카드 */}
          <div className="px-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 p-4 border border-blue-100 dark:border-blue-900">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                내 정보
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {user.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.role === 'admin' ? '관리자' : '사용자'}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-100 dark:border-blue-900 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center justify-between">
                    <span>부서</span>
                    <span className="font-medium">{user.department?.name || '-'}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>직급</span>
                    <span className="font-medium">{user.position?.name || '-'}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>사번</span>
                    <span className="font-mono font-medium">{user.employee_number}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}

function NavItemComponent({
  item,
  pathname,
  onClose,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const hasChildren = item.children && item.children.length > 0;

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          className={cn(
            'w-full justify-start gap-3 h-11 text-base font-medium transition-all duration-200',
            isActive && 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-100 dark:border-blue-900',
            !isActive && 'hover:bg-muted/50',
            depth > 0 && 'pl-8'
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Icon className={cn(
            'h-5 w-5 transition-colors',
            isActive && 'text-primary'
          )} />
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
        </Button>

        {isOpen && (
          <div className="mt-1 space-y-1 animate-in slide-in-from-top-2">
            {item.children.map((child) => (
              <NavItemComponent
                key={child.href}
                item={child}
                pathname={pathname}
                onClose={onClose}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className={cn(
        'w-full justify-start gap-3 h-11 text-base font-medium transition-all duration-200',
        isActive && 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-100 dark:border-blue-900 shadow-sm',
        !isActive && 'hover:bg-muted/50 hover:translate-x-1',
        depth > 0 && 'pl-8'
      )}
      asChild
    >
      <Link href={item.href} onClick={onClose}>
        <Icon className={cn(
          'h-5 w-5 transition-colors',
          isActive && 'text-primary'
        )} />
        {item.title}
      </Link>
    </Button>
  );
}
```

#### 4.4 대시보드 레이아웃 통합

**`components/layout/dashboard-layout.tsx`**:
```typescript
'use client';

import { useState } from 'react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import type { User } from '@/types';

interface DashboardLayoutProps {
  user: User;
  children: React.ReactNode;
}

export function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* 헤더 */}
      <Header user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* 사이드바 */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 메인 컨텐츠 */}
      <main className="lg:pl-72">
        <div className="container py-6 px-4 lg:px-8 animate-in fade-in-50 duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
```

---

### 5단계: 다크 모드 구현

#### 5.1 테마 Provider

**`components/theme-provider.tsx`**:
```typescript
'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**`app/layout.tsx`** 업데이트:
```typescript
import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '인광 토양정화 ERP',
  description: '효율적인 업무 관리 시스템',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 5.2 테마 토글 컴포넌트

**`components/theme-toggle.tsx`**:
```typescript
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // 하이드레이션 이후에만 렌더링
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all" />
      ) : (
        <Moon className="h-5 w-5 rotate-0 scale-100 transition-all" />
      )}
      <span className="sr-only">테마 전환</span>
    </Button>
  );
}
```

---

### 6단계: 사용자 프로필 및 로그아웃

**`components/layout/user-nav.tsx`**:
```typescript
'use client';

import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { logout } from '@/actions/auth';
import type { User } from '@/types';

interface UserNavProps {
  user: User;
}

export function UserNav({ user }: UserNavProps) {
  // 이름의 첫 글자 추출 (아바타용)
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-base font-semibold leading-none">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                {user.role === 'admin' ? '관리자' : '사용자'}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.employee_number}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <UserIcon className="mr-2 h-4 w-4" />
          <span>프로필</span>
        </DropdownMenuItem>

        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>설정</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          onClick={async () => {
            await logout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

### 7단계: 애니메이션 및 인터랙션

#### 7.1 페이지 전환 애니메이션

**`components/page-transition.tsx`**:
```typescript
'use client';

import { motion } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
}
```

#### 7.2 호버 효과

**`app/globals.css`** 추가:
```css
/* 스무스 스크롤 */
html {
  scroll-behavior: smooth;
}

/* 커스텀 스크롤바 (다크 모드 대응) */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(209 213 219);
  border-radius: 9999px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: rgb(55 65 81);
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgb(156 163 175);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: rgb(75 85 99);
}

/* 부드러운 포커스 링 */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--ring);
}

/* 애니메이션 최적화 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 🧪 테스트 및 검증

### 홈 페이지 생성

**`app/(dashboard)/page.tsx`**:
```typescript
import { PageTransition } from '@/components/page-transition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground mt-2">
            인광 토양정화 ERP 시스템에 오신 것을 환영합니다
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* 통계 카드 예시 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                전체 직원 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42명</div>
              <p className="text-xs text-muted-foreground">
                +2명 (전월 대비)
              </p>
            </CardContent>
          </Card>

          {/* 추가 카드들... */}
        </div>
      </div>
    </PageTransition>
  );
}
```

### 실행 및 테스트

```bash
# 개발 서버 실행
pnpm dev

# 테스트 시나리오:
# 1. http://localhost:3000 접속 → 로그인 페이지로 리다이렉트
# 2. 로그인 시도 (아직 사용자 없음)
# 3. Supabase 대시보드에서 테스트 사용자 생성
# 4. 로그인 성공 → 대시보드 표시
# 5. 다크 모드 토글 테스트
# 6. 사이드바 네비게이션 테스트
# 7. 로그아웃 테스트
```

---

## 🎉 Phase 2 완료 체크리스트

- [x] ✅ Supabase Auth 설정 완료
- [x] ✅ 로그인 페이지 구현 및 테스트
- [x] ✅ 인증 미들웨어 작동 확인
- [x] ✅ 공통 레이아웃 (헤더 + 사이드바) 구현
- [x] ✅ 다크 모드 정상 작동
- [x] ✅ 반응형 디자인 확인 (모바일/태블릿/데스크톱)
- [x] ✅ 사용자 프로필 및 로그아웃 기능 테스트
- [x] ✅ 페이지 전환 애니메이션 확인
- [x] ✅ 권한 기반 메뉴 표시 확인 (Admin/User)

---

## 📝 주의사항

### 보안
- 절대 클라이언트에서 `SUPABASE_SERVICE_ROLE_KEY` 사용 금지
- RLS 정책이 올바르게 작동하는지 반드시 테스트
- 세션 만료 처리 확인

### UI/UX
- 로딩 상태 명확히 표시
- 에러 메시지 사용자 친화적으로 작성
- 키보드 네비게이션 지원

### 성능
- 이미지 최적화
- 불필요한 리렌더링 방지
- Server Components 우선 사용

---

## 🔗 다음 단계

**Phase 3: 관리자 모듈 - 사원관리**로 진행하세요.

Phase 3에서는:
- 사원 목록 테이블 구현
- 인라인 편집 기능 구현
- 사원 추가/수정/삭제
- 권한별 기능 제한

---

**작성일**: 2025년 9월 30일
**Phase**: 2/6
**다음 Phase**: [Phase_3_사원관리.md](./Phase_3_사원관리.md)