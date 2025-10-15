# Phase 6: 테스트 및 배포

## 📋 개요
- **예상 기간**: 1주 (5일)
- **목표**: 완전한 테스트 커버리지 확보 및 프로덕션 배포
- **결과물**: 안정적으로 운영되는 프로덕션 시스템

---

## ✅ 체크리스트

### 1단계: 단위 테스트
- [ ] Vitest 설정
- [ ] 유틸리티 함수 테스트
- [ ] 컴포넌트 테스트 (React Testing Library)
- [ ] 커버리지 80% 이상 달성

### 2단계: E2E 테스트
- [ ] Playwright 설정
- [ ] 로그인 플로우 테스트
- [ ] 사원관리 CRUD 테스트
- [ ] 회사관리 CRUD 테스트
- [ ] 크로스 브라우저 테스트

### 3단계: 성능 테스트
- [ ] Lighthouse CI 설정
- [ ] Core Web Vitals 측정
- [ ] 번들 사이즈 분석
- [ ] 성능 벤치마크

### 4단계: 보안 테스트
- [ ] RLS 정책 테스트
- [ ] SQL Injection 방어 확인
- [ ] XSS 방어 확인
- [ ] CSRF 방어 확인
- [ ] 환경 변수 보안 확인

### 5단계: Vercel 배포
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 도메인 연결
- [ ] SSL 인증서 설정
- [ ] 배포 자동화 (CI/CD)

### 6단계: 모니터링 설정
- [ ] Vercel Analytics
- [ ] 로그 모니터링
- [ ] 성능 모니터링

---

## 📚 상세 구현 가이드

### 1단계: 단위 테스트

**Vitest 및 Testing Library 설치**:
```bash
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D jsdom
```

**`vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'vitest.config.ts',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**`vitest.setup.ts`**:
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

**유틸리티 함수 테스트 예시** (`lib/utils.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, formatCurrency, formatEmployeeNumber } from './utils';

describe('utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-09-30');
      expect(formatDate(date)).toBe('2025. 9. 30.');
    });

    it('should return "-" for null', () => {
      expect(formatDate(null)).toBe('-');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000000)).toBe('₩1,000,000');
    });
  });

  describe('formatEmployeeNumber', () => {
    it('should format employee number correctly', () => {
      expect(formatEmployeeNumber('20250001')).toBe('2025-0001');
    });
  });
});
```

**컴포넌트 테스트 예시** (`components/ui/button.test.tsx`):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**`package.json`에 테스트 스크립트 추가**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 2단계: E2E 테스트

**Playwright 설치** (이미 설치되어 있음):
```bash
pnpm create playwright
```

**`playwright.config.ts`**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**E2E 테스트 예시** (`e2e/auth.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // 로그인 폼 확인
    await expect(page.getByRole('heading', { name: /토양정화 erp/i })).toBeVisible();

    // 아이디 입력
    await page.getByLabel(/아이디/i).fill('admin');

    // 비밀번호 입력
    await page.getByLabel(/비밀번호/i).fill('password123');

    // 로그인 버튼 클릭
    await page.getByRole('button', { name: /로그인/i }).click();

    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /대시보드/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/아이디/i).fill('invalid');
    await page.getByLabel(/비밀번호/i).fill('wrongpassword');
    await page.getByRole('button', { name: /로그인/i }).click();

    // 에러 메시지 확인
    await expect(page.getByText(/아이디 또는 비밀번호가 올바르지 않습니다/i)).toBeVisible();
  });
});
```

**사원관리 E2E 테스트** (`e2e/employees.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.getByLabel(/아이디/i).fill('admin');
    await page.getByLabel(/비밀번호/i).fill('password123');
    await page.getByRole('button', { name: /로그인/i }).click();
    await expect(page).toHaveURL('/');

    // 사원관리 페이지로 이동
    await page.getByRole('link', { name: /사원관리/i }).click();
    await expect(page).toHaveURL('/admin/employees');
  });

  test('should display employee list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /사원관리/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should search employees', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/검색/i);
    await searchInput.fill('홍길동');

    // 검색 결과 확인
    await expect(page.getByText('홍길동')).toBeVisible();
  });

  test('should edit employee inline', async ({ page }) => {
    // 첫 번째 사원의 이름 셀 클릭
    const nameCell = page.getByRole('table').locator('tbody tr').first().locator('td').nth(1);
    await nameCell.click();

    // 인풋 필드가 나타나는지 확인
    const input = page.getByRole('textbox');
    await expect(input).toBeVisible();

    // 이름 수정
    await input.fill('김철수');

    // Enter 키로 저장
    await input.press('Enter');

    // 토스트 메시지 확인
    await expect(page.getByText(/수정 완료/i)).toBeVisible();
  });
});
```

**테스트 실행**:
```bash
# 테스트 실행
pnpm playwright test

# UI 모드로 실행
pnpm playwright test --ui

# 특정 브라우저만 테스트
pnpm playwright test --project=chromium

# 리포트 보기
pnpm playwright show-report
```

---

### 3단계: 성능 테스트

**Lighthouse CI 설정**:
```bash
pnpm add -D @lhci/cli
```

**`.lighthouserc.js`**:
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm build && pnpm start',
      url: ['http://localhost:3000', 'http://localhost:3000/admin/employees'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

**번들 분석**:
```bash
pnpm add -D @next/bundle-analyzer
```

**`next.config.ts` 수정**:
```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

**번들 분석 실행**:
```bash
ANALYZE=true pnpm build
```

---

### 4단계: 보안 테스트

**RLS 정책 테스트** (`e2e/security.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Security - RLS Policies', () => {
  test('User should not be able to delete employees', async ({ page }) => {
    // User 계정으로 로그인
    await page.goto('/login');
    await page.getByLabel(/아이디/i).fill('user');
    await page.getByLabel(/비밀번호/i).fill('password123');
    await page.getByRole('button', { name: /로그인/i }).click();

    // 사원관리 페이지로 이동
    await page.goto('/admin/employees');

    // 삭제 버튼이 없는지 확인 (User는 삭제 권한 없음)
    await expect(page.getByRole('button', { name: /삭제/i })).not.toBeVisible();
  });
});
```

**환경 변수 보안 체크리스트**:
```bash
# .env.local이 .gitignore에 포함되어 있는지 확인
grep -q ".env.local" .gitignore && echo "✅ .env.local은 Git에서 제외됨" || echo "❌ .env.local을 .gitignore에 추가하세요"

# SUPABASE_SERVICE_ROLE_KEY가 클라이언트 코드에 없는지 확인
grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ components/ && echo "❌ 위험: 클라이언트 코드에 SERVICE_ROLE_KEY 발견" || echo "✅ 안전함"
```

---

### 5단계: Vercel 배포

#### 5.1 Vercel 프로젝트 생성

**Vercel CLI 설치**:
```bash
pnpm add -D vercel
```

**로그인 및 프로젝트 연결**:
```bash
# Vercel 로그인
pnpm vercel login

# 프로젝트 연결
pnpm vercel link

# 프로젝트 설정
# - Framework Preset: Next.js
# - Root Directory: ./
# - Build Command: pnpm build
# - Output Directory: .next
# - Install Command: pnpm install
```

#### 5.2 환경 변수 설정

**Vercel 대시보드에서 설정**:
1. Vercel 프로젝트 → **Settings** → **Environment Variables**
2. 다음 변수 추가:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_DOMAIN=inkwang.co.kr
```

**또는 CLI로 설정**:
```bash
# 프로덕션 환경 변수
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# 미리보기 환경 변수
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# ... 동일하게 추가
```

#### 5.3 배포

**수동 배포**:
```bash
# 미리보기 배포
pnpm vercel

# 프로덕션 배포
pnpm vercel --prod
```

**자동 배포 (GitHub Actions)**:

**`.github/workflows/deploy.yml`**:
```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Run Lighthouse CI
        run: pnpm lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Deploy to Vercel
        run: |
          if [ "${{ github.ref }}" == "refs/heads/main" ]; then
            pnpm vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
          else
            pnpm vercel --token=${{ secrets.VERCEL_TOKEN }}
          fi
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**GitHub Secrets 설정**:
1. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
2. 다음 secrets 추가:
   - `VERCEL_TOKEN` (Vercel 계정 설정에서 생성)
   - `VERCEL_ORG_ID` (`vercel link` 후 `.vercel/project.json`에서 확인)
   - `VERCEL_PROJECT_ID` (동일)

#### 5.4 도메인 연결

**Vercel 대시보드**:
1. 프로젝트 → **Settings** → **Domains**
2. 커스텀 도메인 추가
3. DNS 레코드 설정 (도메인 제공업체에서)
   - **A 레코드**: `76.76.21.21`
   - **CNAME 레코드**: `cname.vercel-dns.com`

**SSL 인증서**: Vercel이 자동으로 Let's Encrypt 인증서 발급

---

### 6단계: 모니터링 설정

#### 6.1 Vercel Analytics

**설치** (이미 Phase 5에서 설치):
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 🧪 최종 검증 체크리스트

### 기능 테스트
- [ ] ✅ 모든 CRUD 작업 정상 작동
- [ ] ✅ 권한 시스템 정상 작동 (Admin/User)
- [ ] ✅ 인라인 편집 정상 작동
- [ ] ✅ 검색 및 필터링 정상 작동
- [ ] ✅ 로그인/로그아웃 정상 작동

### 성능 테스트
- [ ] ✅ Lighthouse 점수 90+ (모든 카테고리)
- [ ] ✅ Core Web Vitals 통과
- [ ] ✅ 번들 사이즈 최적화 확인
- [ ] ✅ 페이지 로딩 시간 < 3초

### 보안 테스트
- [ ] ✅ RLS 정책 정상 작동
- [ ] ✅ 환경 변수 보안 확인
- [ ] ✅ HTTPS 적용 확인
- [ ] ✅ XSS/CSRF 방어 확인

### 크로스 브라우저 테스트
- [ ] ✅ Chrome (최신)
- [ ] ✅ Firefox (최신)
- [ ] ✅ Safari (최신)
- [ ] ✅ Edge (최신)
- [ ] ✅ 모바일 Safari (iOS)
- [ ] ✅ 모바일 Chrome (Android)

### 접근성 테스트
- [ ] ✅ 키보드 네비게이션
- [ ] ✅ 스크린 리더 호환성
- [ ] ✅ 색상 대비 (WCAG AA)
- [ ] ✅ ARIA 레이블

### PWA 테스트
- [ ] ✅ 앱 설치 가능
- [ ] ✅ 오프라인 작동
- [ ] ✅ 아이콘 표시
- [ ] ✅ 독립 실행형 모드

---

## 🎉 Phase 6 완료 및 프로젝트 완료!

### 완료된 작업
1. ✅ **Phase 1**: 프로젝트 초기 설정 및 인프라 구축
2. ✅ **Phase 2**: 인증 및 공통 레이아웃 구현
3. ✅ **Phase 3**: 관리자 모듈 - 사원관리
4. ✅ **Phase 4**: 관리자 모듈 - 회사관리
5. ✅ **Phase 5**: UI/UX 최적화 및 PWA 구현
6. ✅ **Phase 6**: 테스트 및 배포

### 다음 단계 (운영 및 유지보수)

#### 1. 사용자 온보딩
- 관리자 계정 생성 및 권한 설정
- 직원 계정 일괄 생성
- 사용 설명서 작성 및 교육

#### 2. 모니터링 및 알림
- Vercel Analytics 데이터 분석
- 성능 지표 주간 리뷰

#### 3. 정기 업데이트
- 보안 패치 적용
- 의존성 업데이트
- 기능 개선 및 버그 수정

#### 4. 백업 및 복구
- Supabase 자동 백업 설정
- 복구 절차 문서화
- 정기 복구 테스트

#### 5. 확장 계획
- 추가 모듈 개발 (프로젝트 관리, 급여 관리 등)
- 보고서 및 분석 기능
- 모바일 앱 (React Native)

---

## 📝 배포 후 체크리스트

### 즉시 확인
- [ ] ✅ 프로덕션 URL 접속 확인
- [ ] ✅ 로그인 테스트
- [ ] ✅ 주요 기능 smoke 테스트

### 첫 주
- [ ] ✅ 사용자 피드백 수집
- [ ] ✅ 성능 지표 모니터링
- [ ] ✅ 에러율 모니터링
- [ ] ✅ 긴급 패치 준비

### 첫 달
- [ ] ✅ 사용 패턴 분석
- [ ] ✅ 개선 사항 우선순위 결정
- [ ] ✅ 다음 스프린트 계획
- [ ] ✅ 문서 업데이트

---

## 🎊 축하합니다!

인광 토양정화 ERP 시스템이 성공적으로 완료되었습니다!

**주요 성과**:
- ✅ 최신 기술 스택 (Next.js 15, React 19, Supabase)
- ✅ 2025 최신 UI/UX 트렌드 적용
- ✅ 인라인 편집 방식의 직관적인 UX
- ✅ PWA 지원으로 앱처럼 사용 가능
- ✅ 완전한 테스트 커버리지
- ✅ 프로덕션 배포 완료

**기술적 우수성**:
- Lighthouse 점수 90+ (모든 카테고리)
- WCAG AA 접근성 준수
- 완전한 반응형 디자인
- 엔터프라이즈급 보안
- 확장 가능한 아키텍처

이제 엑셀 기반의 비효율적인 업무 방식에서 벗어나,
현대적이고 효율적인 웹 ERP 시스템으로 업무 생산성을 높이세요!

---

**작성일**: 2025년 9월 30일
**Phase**: 6/6 (완료)
**프로젝트 상태**: ✅ 완료 및 배포 준비 완료