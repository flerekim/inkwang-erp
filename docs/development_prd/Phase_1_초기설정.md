# Phase 1: 프로젝트 초기 설정 및 인프라 구축

## 📋 개요
- **예상 기간**: 1주 (5일)
- **목표**: 프로젝트의 기반이 되는 개발 환경과 인프라를 완벽하게 구축
- **결과물**: 실행 가능한 Next.js 프로젝트 + Supabase 데이터베이스

---

## ✅ 체크리스트

### 1단계: 개발 환경 준비
- [x] Node.js 20+ 설치 확인
- [x] pnpm 설치 (`npm install -g pnpm`)
- [x] Git 설치 및 설정
- [x] VSCode 설치 및 필수 확장 프로그램 설치
- [x] GitHub/GitLab 저장소 생성

### 2단계: Next.js 프로젝트 초기화
- [x] Next.js 15 프로젝트 생성
- [x] TypeScript 설정
- [x] 프로젝트 구조 생성
- [x] 기본 설정 파일 작성

### 3단계: Supabase 프로젝트 설정
- [x] Supabase 계정 생성
- [x] 새 프로젝트 생성
- [x] 데이터베이스 비밀번호 설정
- [x] 환경 변수 설정

### 4단계: 데이터베이스 스키마 설계
- [x] 마이그레이션 파일 생성
- [x] 테이블 스키마 작성
- [x] RLS 정책 설정
- [x] 마이그레이션 실행

### 5단계: 개발 도구 및 라이브러리 설치
- [x] shadcn/ui 설치 및 설정
- [x] Supabase 클라이언트 설치
- [x] Framer Motion 설치
- [x] 기타 필수 라이브러리 설치

### 6단계: 기본 설정 및 유틸리티
- [x] Tailwind CSS 설정
- [x] 타입 정의 생성
- [x] Supabase 클라이언트 래퍼 작성
- [x] 공통 유틸 함수 작성

### 7단계: Git 초기 커밋
- [x] .gitignore 설정
- [x] 초기 커밋
- [x] 원격 저장소 연결

---

## 📚 상세 구현 가이드

### 1단계: 개발 환경 준비

#### 1.1 Node.js 설치 확인
```bash
# 버전 확인 (20 이상이어야 함)
node --version

# 20 미만이면 https://nodejs.org/ 에서 LTS 버전 설치
```

#### 1.2 pnpm 설치
```bash
# pnpm 설치 (더 빠르고 효율적인 패키지 매니저)
npm install -g pnpm

# 버전 확인
pnpm --version
```

#### 1.3 VSCode 필수 확장 프로그램
설치해야 할 확장 프로그램:
- **ESLint**: 코드 품질 검사
- **Prettier - Code formatter**: 코드 포맷팅
- **Tailwind CSS IntelliSense**: Tailwind 자동완성 (v4 호환)
- **TypeScript Vue Plugin (Volar)**: TypeScript 지원
- **GitLens**: Git 히스토리 및 비교
- **Error Lens**: 인라인 에러 표시
- **Auto Rename Tag**: HTML 태그 자동 변경

**⚠️ Tailwind CSS v4 브라우저 호환성**:
- **Safari**: 16.4 이상
- **Chrome**: 111 이상
- **Firefox**: 128 이상
- **Edge**: Chromium 기반 최신 버전

**참고**: 위 브라우저 버전 미만에서는 일부 기능이 작동하지 않을 수 있습니다.

#### 1.4 Git 저장소 생성
```bash
# GitHub에서 새 저장소 생성 후
git init
git remote add origin <your-repository-url>
```

---

### 2단계: Next.js 프로젝트 초기화

#### 2.1 Next.js 15 프로젝트 생성
```bash
# 프로젝트 생성 (대화형 설치)
pnpm create next-app@latest inkwang-erp

# 설정 옵션 선택:
# ✅ Would you like to use TypeScript? Yes
# ✅ Would you like to use ESLint? Yes
# ✅ Would you like to use Tailwind CSS? Yes
# ✅ Would you like to use `src/` directory? No
# ✅ Would you like to use App Router? Yes
# ✅ Would you like to customize the default import alias? No

# 프로젝트 디렉토리로 이동
cd inkwang-erp
```

#### 2.2 프로젝트 구조 생성
```bash
# 디렉토리 생성
mkdir -p app/(auth)/login
mkdir -p app/(dashboard)/admin/employees/components
mkdir -p app/(dashboard)/admin/company/companies
mkdir -p app/(dashboard)/admin/company/departments
mkdir -p app/(dashboard)/admin/company/positions
mkdir -p app/(dashboard)/admin/company/bank-accounts
mkdir -p components/ui
mkdir -p components/layout
mkdir -p components/tables
mkdir -p components/forms
mkdir -p lib/supabase
mkdir -p lib/utils
mkdir -p types
mkdir -p hooks
mkdir -p actions
mkdir -p supabase/migrations
```

#### 2.3 기본 설정 파일

**tsconfig.json** (생성된 파일에 추가 설정)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "isolatedModules": true,
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/types/*": ["./types/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/actions/*": ["./actions/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**next.config.ts**
```typescript
import type { NextConfig } from 'next';
import tailwindcss from '@tailwindcss/vite';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Tailwind CSS v4 Vite 플러그인 통합
  experimental: {
    turbo: {
      resolveExtensions: [
        '.mdx',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.json',
      ],
    },
  },

  // PWA 설정 (Phase 5에서 구현)
  // experimental: {
  //   pwa: {
  //     dest: 'public',
  //     disable: process.env.NODE_ENV === 'development'
  //   }
  // },

  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },

  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Webpack 설정 (Tailwind v4 지원)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Tailwind CSS v4 PostCSS 처리
      config.module.rules.push({
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      });
    }
    return config;
  },
};

export default nextConfig;
```

**⚠️ Tailwind v4 Next.js 통합 참고사항**:
- Tailwind CSS v4는 Vite 기반 최적화를 제공합니다
- Next.js 15와의 호환성을 위해 `@tailwindcss/vite` 플러그인을 사용합니다
- 개발 서버 재시작 후 변경사항이 적용됩니다

**tailwind.config.ts** (v4 방식 - 선택적 사용)
```typescript
import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 설정
 *
 * v4에서는 대부분의 설정을 CSS 변수로 관리하므로
 * 이 파일은 선택적으로 사용됩니다.
 *
 * 기본 테마 커스터마이징은 app/globals.css에서
 * CSS 변수를 통해 관리하는 것을 권장합니다.
 */
const config: Config = {
  // v4에서는 content 자동 감지
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],

  // 다크모드는 CSS 변수로 자동 처리
  darkMode: ['class'],

  theme: {
    // v4에서는 대부분 CSS 변수로 대체 가능
    // 필요한 경우에만 여기서 확장
    extend: {
      fontFamily: {
        sans: ['var(--font-pretendard)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },

  plugins: [
    // v4 호환 플러그인만 추가
    require('tailwindcss-animate'),
  ],
};

export default config;
```

**⚠️ Tailwind CSS v4 주요 변경사항**:
- 색상, 간격, 테두리 등 대부분의 테마는 `app/globals.css`의 CSS 변수로 관리
- JavaScript 설정 파일이 더 이상 자동 감지되지 않음
- `@tailwind` 지시어 대신 `@import "tailwindcss"` 사용
- Vite 플러그인 방식으로 Next.js와 통합

**.eslintrc.json**
```json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

**.prettierrc**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 80,
  "arrowParens": "always"
}
```

---

### 3단계: Supabase 프로젝트 설정

#### 3.1 Supabase 계정 및 프로젝트 생성

1. **Supabase 웹사이트 접속**
   - https://supabase.com 방문
   - "Start your project" 클릭

2. **계정 생성**
   - GitHub 계정으로 로그인 (권장)
   - 이메일로 회원가입

3. **새 프로젝트 생성**
   - "New Project" 클릭
   - **Organization**: 개인 또는 회사 선택
   - **Project Name**: `inkwang-erp`
   - **Database Password**: 강력한 비밀번호 생성 (꼭 저장!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국)
   - **Pricing Plan**: Free (개발용) → 나중에 Pro로 업그레이드

4. **프로젝트 생성 대기**
   - 약 2-3분 소요
   - 데이터베이스와 API 자동 생성됨

#### 3.2 환경 변수 설정

**프로젝트 설정 확인**:
1. Supabase 대시보드에서 **Settings** → **API** 이동
2. 다음 정보 복사:
   - **Project URL**
   - **anon public** key
   - **service_role** key (주의: 절대 클라이언트에 노출 금지!)

**`.env.local` 파일 생성**:
```bash
# 프로젝트 루트에 .env.local 파일 생성
touch .env.local
```

**`.env.local` 내용**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DOMAIN=inkwang.co.kr
```

**⚠️ 보안 주의사항**:
- `.env.local`은 절대 Git에 커밋하지 말 것!
- `.gitignore`에 `.env.local` 포함 확인
- 프로덕션 환경에서는 Vercel 환경 변수 사용

---

### 4단계: 데이터베이스 스키마 설계

#### 4.1 마이그레이션 파일 생성

**`supabase/migrations/20250930000001_initial_schema.sql`**:
```sql
-- ============================================
-- 인광 토양정화 ERP 시스템 - 초기 스키마
-- ============================================

-- Extension 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ENUM 타입 정의
-- ============================================

-- 사용자 권한 타입
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- 재직 상태 타입
CREATE TYPE employment_status AS ENUM ('active', 'inactive');

-- ============================================
-- 2. 테이블 생성
-- ============================================

-- 회사 테이블
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    business_number TEXT UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 부서 테이블
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 직급 테이블
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 은행계좌 테이블
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, account_number)
);

-- 사용자 테이블 (Supabase Auth와 연동)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    employee_number TEXT UNIQUE NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'user',
    employment_status employment_status NOT NULL DEFAULT 'active',
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. 인덱스 생성 (성능 최적화)
-- ============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_employee_number ON users(employee_number);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_employment_status ON users(employment_status);
CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX idx_companies_business_number ON companies(business_number);

-- ============================================
-- 4. 자동 업데이트 함수 및 트리거
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 추가
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 사번 자동 생성 함수
-- ============================================

CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    -- 입사 연도 (예: 2025)
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- 해당 연도의 최대 사번 찾기
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 5) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM users
    WHERE employee_number LIKE year_prefix || '%';

    -- 4자리 패딩 (예: 0001, 0002, ...)
    new_number := year_prefix || LPAD(sequence_num::TEXT, 4, '0');

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. RLS (Row Level Security) 활성화
-- ============================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS 정책 생성
-- ============================================

-- Companies 정책
CREATE POLICY "모든 인증된 사용자는 회사 정보를 조회할 수 있음"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin만 회사 정보를 삽입할 수 있음"
    ON companies FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 회사 정보를 수정할 수 있음"
    ON companies FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 회사 정보를 삭제할 수 있음"
    ON companies FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Departments 정책 (Companies와 동일한 패턴)
CREATE POLICY "모든 인증된 사용자는 부서 정보를 조회할 수 있음"
    ON departments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin만 부서 정보를 삽입할 수 있음"
    ON departments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 부서 정보를 수정할 수 있음"
    ON departments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 부서 정보를 삭제할 수 있음"
    ON departments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Positions 정책 (Companies와 동일한 패턴)
CREATE POLICY "모든 인증된 사용자는 직급 정보를 조회할 수 있음"
    ON positions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin만 직급 정보를 삽입할 수 있음"
    ON positions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 직급 정보를 수정할 수 있음"
    ON positions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 직급 정보를 삭제할 수 있음"
    ON positions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Bank Accounts 정책
CREATE POLICY "모든 인증된 사용자는 은행계좌 정보를 조회할 수 있음"
    ON bank_accounts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin만 은행계좌를 생성할 수 있음"
    ON bank_accounts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 은행계좌를 수정할 수 있음"
    ON bank_accounts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 은행계좌를 삭제할 수 있음"
    ON bank_accounts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Users 정책
CREATE POLICY "모든 인증된 사용자는 사용자 정보를 조회할 수 있음"
    ON users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admin만 사용자를 생성할 수 있음"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin과 본인만 사용자 정보를 수정할 수 있음"
    ON users FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin만 사용자를 삭제할 수 있음"
    ON users FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ============================================
-- 8. 초기 데이터 삽입
-- ============================================

-- 기본 회사 데이터
INSERT INTO companies (name, business_number, sort_order) VALUES
('인광', '123-45-67890', 1);

-- 기본 부서 데이터
INSERT INTO departments (name, sort_order) VALUES
('경영지원팀', 1),
('영업팀', 2),
('기술팀', 3),
('현장관리팀', 4);

-- 기본 직급 데이터
INSERT INTO positions (name, sort_order) VALUES
('대표이사', 1),
('이사', 2),
('부장', 3),
('차장', 4),
('과장', 5),
('대리', 6),
('사원', 7);

-- ============================================
-- 9. 함수 및 프로시저
-- ============================================

-- 사용자 생성 함수 (관리자 전용)
CREATE OR REPLACE FUNCTION create_user(
    p_email TEXT,
    p_name TEXT,
    p_department_id UUID,
    p_position_id UUID,
    p_role user_role,
    p_hire_date DATE,
    p_company_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_employee_number TEXT;
    v_user_id UUID;
BEGIN
    -- 사번 자동 생성
    v_employee_number := generate_employee_number();

    -- 사용자 생성 (실제 Auth는 별도 처리)
    -- 이 함수는 users 테이블에만 데이터 삽입
    -- Supabase Auth는 별도 API로 처리

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 완료
-- ============================================

-- 마이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE '✅ 초기 스키마 마이그레이션 완료';
    RAISE NOTICE '📊 생성된 테이블: companies, departments, positions, bank_accounts, users';
    RAISE NOTICE '🔒 RLS 정책 적용 완료';
    RAISE NOTICE '📝 초기 데이터 삽입 완료';
END $$;
```

#### 4.2 마이그레이션 실행

**Supabase CLI 설치**:
```bash
# npm을 통한 설치
npm install -g supabase

# 버전 확인
supabase --version
```

**Supabase 로그인**:
```bash
# 로그인
supabase login

# 브라우저가 열리면 인증 진행
```

**프로젝트 링크**:
```bash
# Supabase 프로젝트와 로컬 연결
supabase link --project-ref your-project-ref

# project-ref는 Supabase 대시보드의 Settings > General에서 확인
```

**마이그레이션 실행**:
```bash
# SQL 파일을 Supabase에 직접 실행
supabase db push

# 또는 SQL Editor에서 직접 실행:
# 1. Supabase 대시보드 → SQL Editor
# 2. 위의 SQL 코드 복사 & 붙여넣기
# 3. "Run" 버튼 클릭
```

**마이그레이션 확인**:
```bash
# 테이블 생성 확인
# Supabase 대시보드 → Table Editor에서 확인

# 또는 SQL Editor에서 실행:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

### 5단계: 개발 도구 및 라이브러리 설치

#### 5.1 필수 패키지 설치
```bash
# Supabase 클라이언트
pnpm add @supabase/supabase-js @supabase/ssr

# Tailwind CSS v4 설치 (Vite 플러그인 방식)
pnpm add tailwindcss@latest @tailwindcss/vite

# shadcn/ui 설치 및 초기화
pnpm dlx shadcn@latest init

# shadcn 설정 옵션:
# ✅ Would you like to use TypeScript? yes
# ✅ Which style would you like to use? New York
# ✅ Which color would you like to use as base color? Slate
# ✅ Where is your global CSS file? app/globals.css
# ✅ Would you like to use CSS variables for colors? yes
# ✅ Where is your tailwind.config.js located? tailwind.config.ts
# ✅ Configure the import alias for components? @/components
# ✅ Configure the import alias for utils? @/lib/utils

# ⚠️ 주의: Tailwind CSS v4 호환성 확인
# shadcn/ui가 정상 작동하는지 첫 컴포넌트 설치 후 테스트 필요

# Framer Motion
pnpm add framer-motion

# 폼 관리
pnpm add react-hook-form @hookform/resolvers zod

# TanStack Table (데이터 테이블용)
pnpm add @tanstack/react-table

# 날짜 처리
pnpm add date-fns

# 유틸리티
pnpm add clsx tailwind-merge class-variance-authority

# 아이콘
pnpm add lucide-react

# 개발 의존성
pnpm add -D @types/node
pnpm add -D tailwindcss-animate
```

#### 5.2 기본 shadcn/ui 컴포넌트 설치
```bash
# ⚠️ Tailwind v4 호환성 테스트를 위해 먼저 button 컴포넌트만 설치
pnpm dlx shadcn@latest add button

# 브라우저에서 button 컴포넌트 정상 작동 확인 후 나머지 설치
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add checkbox
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add skeleton
```

**🧪 Tailwind v4 호환성 테스트 단계**:
1. **Button 컴포넌트 설치 후 테스트 페이지 생성**:
   ```tsx
   // app/test-tailwind/page.tsx
   import { Button } from '@/components/ui/button';

   export default function TestTailwindPage() {
     return (
       <div className="p-8 space-y-4">
         <h1 className="text-2xl font-bold">Tailwind v4 테스트</h1>
         <Button>기본 버튼</Button>
         <Button variant="destructive">삭제 버튼</Button>
         <Button variant="outline">외곽선 버튼</Button>
       </div>
     );
   }
   ```

2. **개발 서버 실행 및 확인**:
   ```bash
   pnpm dev
   # http://localhost:3000/test-tailwind 접속
   ```

3. **확인 사항**:
   - ✅ 버튼 스타일이 정상적으로 적용되는지
   - ✅ 호버/포커스 효과가 작동하는지
   - ✅ 다크모드 전환이 정상인지
   - ✅ 브라우저 콘솔에 에러가 없는지

4. **문제 발생 시 조치**:
   - Tailwind v3로 다운그레이드 고려
   - `npx @tailwindcss/upgrade --help` 로 업그레이드 도구 확인
   - shadcn/ui 최신 버전으로 재설치

---

### 6단계: 기본 설정 및 유틸리티

#### 6.1 Tailwind CSS v4 글로벌 스타일 설정

**`app/globals.css`**:
```css
/**
 * Tailwind CSS v4 Import
 * v3의 @tailwind 지시어 대신 @import 사용
 */
@import "tailwindcss";

/**
 * CSS 변수 기반 테마 설정
 * Tailwind v4에서는 대부분의 커스터마이징을 CSS 변수로 관리
 */
@layer base {
  :root {
    /* 색상 시스템 */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --success: 142.1 76.2% 36.3%;
    --success-foreground: 355.7 100% 97.3%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --success: 142.1 70.6% 45.3%;
    --success-foreground: 144.9 80.4% 10%;
    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 89%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}
```

**⚠️ Tailwind v4 CSS 변경사항**:
- `@tailwind base/components/utilities` → `@import "tailwindcss"` 변경
- 모든 테마 커스터마이징은 CSS 변수로 관리
- `@layer` 지시어로 스타일 계층 구조화
- 다크모드는 `.dark` 클래스로 자동 전환

#### 6.2 Supabase 클라이언트 래퍼

**`lib/supabase/client.ts`**:
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`lib/supabase/server.ts`**:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 설정이 안될 수 있음
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 삭제가 안될 수 있음
          }
        },
      },
    }
  );
}
```

**`lib/supabase/middleware.ts`**:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // 세션 새로고침
  await supabase.auth.getUser();

  return response;
}
```

#### 6.2 타입 정의 생성

**Supabase 타입 자동 생성**:
```bash
# Supabase CLI로 타입 생성
supabase gen types typescript --project-id your-project-ref > types/database.ts

# project-id는 Supabase 대시보드의 Settings > General에서 확인
```

**`types/index.ts`** (커스텀 타입):
```typescript
import type { Database } from './database';

// 테이블 타입
export type Company = Database['public']['Tables']['companies']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];
export type Position = Database['public']['Tables']['positions']['Row'];
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
export type User = Database['public']['Tables']['users']['Row'];

// Insert 타입
export type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
export type PositionInsert = Database['public']['Tables']['positions']['Insert'];
export type BankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];

// Update 타입
export type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];
export type PositionUpdate = Database['public']['Tables']['positions']['Update'];
export type BankAccountUpdate = Database['public']['Tables']['bank_accounts']['Update'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// 권한 타입
export type UserRole = Database['public']['Enums']['user_role'];
export type EmploymentStatus = Database['public']['Enums']['employment_status'];

// Join된 타입 (사용자 정보 + 부서 + 직급)
export type UserWithDetails = User & {
  department: Department | null;
  position: Position | null;
  company: Company;
};
```

#### 6.3 공통 유틸 함수

**`lib/utils.ts`** (이미 shadcn이 생성했지만 추가):
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 날짜 포맷팅
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR');
}

// 숫자 포맷팅 (금액)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

// 사번 포맷팅
export function formatEmployeeNumber(number: string): string {
  // 20250001 → 2025-0001
  return `${number.slice(0, 4)}-${number.slice(4)}`;
}

// 이메일 생성
export function generateEmail(userId: string): string {
  return `${userId}@${process.env.NEXT_PUBLIC_DOMAIN}`;
}

// 에러 메시지 추출
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// 디바운스 함수
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

**`lib/validations.ts`**:
```typescript
import { z } from 'zod';

// 사용자 유효성 검사
export const userSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  department_id: z.string().uuid('올바른 부서를 선택해주세요').nullable(),
  position_id: z.string().uuid('올바른 직급을 선택해주세요').nullable(),
  role: z.enum(['admin', 'user']),
  employment_status: z.enum(['active', 'inactive']),
  hire_date: z.string().or(z.date()),
  company_id: z.string().uuid(),
});

// 회사 유효성 검사
export const companySchema = z.object({
  name: z.string().min(2, '회사명은 최소 2자 이상이어야 합니다'),
  business_number: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자등록번호 형식이 아닙니다')
    .nullable(),
  sort_order: z.number().int().min(0),
});

// 부서 유효성 검사
export const departmentSchema = z.object({
  name: z.string().min(2, '부서명은 최소 2자 이상이어야 합니다'),
  sort_order: z.number().int().min(0),
});

// 직급 유효성 검사
export const positionSchema = z.object({
  name: z.string().min(2, '직급명은 최소 2자 이상이어야 합니다'),
  sort_order: z.number().int().min(0),
});

// 은행계좌 유효성 검사
export const bankAccountSchema = z.object({
  company_id: z.string().uuid(),
  bank_name: z.string().min(2, '은행명은 최소 2자 이상이어야 합니다'),
  account_number: z.string().min(10, '계좌번호를 정확히 입력해주세요'),
  initial_balance: z.number().min(0, '금액은 0 이상이어야 합니다'),
  current_balance: z.number().min(0, '금액은 0 이상이어야 합니다'),
});

// 로그인 유효성 검사
export const loginSchema = z.object({
  userId: z.string().min(2, '아이디를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});
```

#### 6.4 환경 변수 타입 정의

**`types/env.d.ts`**:
```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_DOMAIN: string;

    // Node
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

---

### 7단계: Git 초기 커밋

#### 7.1 .gitignore 확인

**`.gitignore`** (Next.js가 자동 생성하지만 확인):
```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# ide
.vscode/
.idea/
*.swp
*.swo
*~

# supabase
.supabase
```

#### 7.2 Git 커밋

```bash
# Git 초기화 (아직 안했다면)
git init

# 모든 파일 추가
git add .

# 초기 커밋
git commit -m "chore: 프로젝트 초기 설정 완료

- Next.js 15 + React 19 프로젝트 생성
- Supabase 통합 및 데이터베이스 스키마 구축
- shadcn/ui, Framer Motion 등 필수 라이브러리 설치
- TypeScript 설정 및 타입 정의
- 공통 유틸리티 함수 작성
- RLS 정책 적용 완료"

# 원격 저장소 연결 (아직 안했다면)
git remote add origin <your-repository-url>

# 푸시
git push -u origin main
```

---

## 🧪 테스트 및 검증

### 개발 서버 실행
```bash
# 개발 서버 시작
pnpm dev

# 브라우저에서 http://localhost:3000 접속
# 기본 Next.js 페이지가 표시되면 성공!
```

### Supabase 연결 테스트

**간단한 테스트 페이지 생성** (`app/test/page.tsx`):
```typescript
import { createClient } from '@/lib/supabase/server';

export default async function TestPage() {
  const supabase = await createClient();

  // 데이터베이스 연결 테스트
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*');

  if (error) {
    return <div>❌ 에러: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">✅ Supabase 연결 성공!</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(companies, null, 2)}
      </pre>
    </div>
  );
}
```

브라우저에서 `http://localhost:3000/test` 접속하여 회사 데이터가 표시되면 성공!

---

## 🎉 Phase 1 완료 체크리스트

다음 항목이 모두 완료되었는지 확인하세요:

- [x] ✅ Next.js 15 프로젝트 생성 및 실행 확인
- [x] ✅ Supabase 프로젝트 생성 및 연결 확인
- [x] ✅ 데이터베이스 스키마 마이그레이션 완료
- [x] ✅ RLS 정책 적용 확인
- [x] ✅ 모든 필수 라이브러리 설치 완료
- [x] ✅ TypeScript 설정 및 타입 정의 완료
- [x] ✅ Supabase 클라이언트 래퍼 작성 완료
- [x] ✅ 공통 유틸리티 함수 작성 완료
- [x] ✅ Git 초기 커밋 및 푸시 완료
- [x] ✅ 개발 서버 실행 및 Supabase 연결 테스트 성공

---

## 📝 주의사항 및 팁

### 보안
- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용하세요
- RLS 정책이 제대로 작동하는지 반드시 테스트하세요

### 성능
- Server Components를 기본으로 사용하고, 필요할 때만 Client Components 사용
- 이미지는 `next/image` 사용
- 불필요한 리렌더링 방지 (React 19 컴파일러가 자동 처리)

### 개발
- 코드 변경 시 ESLint 경고 확인
- TypeScript 에러 즉시 수정
- 커밋 메시지는 명확하게 작성

---

## 🔗 다음 단계

Phase 1이 완료되면 **Phase 2: 인증 및 공통 레이아웃 구현**으로 진행하세요.

Phase 2에서는:
- Supabase Auth를 이용한 로그인 구현
- 공통 레이아웃 (헤더 + 사이드바) 구현
- 라우트 보호 미들웨어 구현
- 다크 모드 기본 설정

을 진행합니다.

---

**작성일**: 2025년 9월 30일
**Phase**: 1/6
**다음 Phase**: [Phase_2_인증및레이아웃.md](./Phase_2_인증및레이아웃.md)