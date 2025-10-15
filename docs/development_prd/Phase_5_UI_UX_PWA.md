# Phase 5: UI/UX 최적화 및 PWA 구현

## 📋 개요
- **예상 기간**: 1주 (5일)
- **목표**: 2025 최신 UI/UX 트렌드 적용 및 PWA 기능 구현
- **결과물**: 시각적으로 감탄사가 나오는 UI + 설치 가능한 PWA

---

## ✅ 체크리스트

### 1단계: 고급 애니메이션 구현
- [ ] Framer Motion 페이지 전환
- [ ] 마이크로 인터랙션 (버튼, 카드 등)
- [ ] 스켈레톤 로딩 애니메이션
- [ ] 스무스 스크롤 및 패럴랙스 효과

### 2단계: 데이터 시각화
- [ ] 대시보드 차트 구현 (Recharts)
- [ ] 실시간 데이터 업데이트
- [ ] 인터랙티브 그래프
- [ ] 통계 카드 애니메이션

### 3단계: 반응형 디자인 최적화
- [ ] 모바일 최적화 (320px~)
- [ ] 태블릿 최적화 (768px~)
- [ ] 데스크톱 최적화 (1024px~)
- [ ] 터치 제스처 지원

### 4단계: 접근성 향상
- [ ] ARIA 레이블 추가
- [ ] 키보드 네비게이션 개선
- [ ] 색상 대비 확인 (WCAG AA)
- [ ] 스크린 리더 지원

### 5단계: PWA 구현
- [ ] Service Worker 설정
- [ ] 앱 매니페스트 작성
- [ ] 오프라인 지원
- [ ] 설치 프롬프트 구현
- [ ] 푸시 알림 준비

### 6단계: 성능 최적화
- [ ] 이미지 최적화 (WebP, AVIF)
- [ ] 코드 스플리팅
- [ ] 레이지 로딩
- [ ] Core Web Vitals 최적화

---

## 📚 상세 구현 가이드

### 1단계: 고급 애니메이션 구현

#### 1.1 페이지 전환 애니메이션 개선

**`components/animations/page-variants.ts`**:
```typescript
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.6, -0.05, 0.01, 0.99],
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
    },
  },
};

export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};
```

**적용 예시**:
```typescript
'use client';

import { motion } from 'framer-motion';
import { pageVariants, itemVariants } from '@/components/animations/page-variants';

export default function AnimatedPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div variants={itemVariants}>
        <h1>제목</h1>
      </motion.div>
      <motion.div variants={itemVariants}>
        <p>내용</p>
      </motion.div>
    </motion.div>
  );
}
```

#### 1.2 마이크로 인터랙션

**`components/ui/animated-button.tsx`**:
```typescript
'use client';

import { motion } from 'framer-motion';
import { Button, type ButtonProps } from '@/components/ui/button';

export function AnimatedButton({ children, ...props }: ButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}
```

**`components/ui/animated-card.tsx`**:
```typescript
'use client';

import { motion } from 'framer-motion';
import { Card, type CardProps } from '@/components/ui/card';

export function AnimatedCard({ children, ...props }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -8,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }}
      transition={{ duration: 0.3 }}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  );
}
```

#### 1.3 스켈레톤 로딩

**`components/ui/skeleton-table.tsx`**:
```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### 2단계: 데이터 시각화

**차트 라이브러리 설치**:
```bash
pnpm add recharts
```

**`components/charts/statistics-card.tsx`**:
```typescript
'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatisticsCardProps {
  title: string;
  value: number;
  change: number;
  icon?: React.ReactNode;
  format?: (value: number) => string;
}

export function StatisticsCard({
  title,
  value,
  change,
  icon,
  format = (v) => v.toLocaleString(),
}: StatisticsCardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <motion.div
            className="text-2xl font-bold"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {format(value)}
          </motion.div>
          <div
            className={cn(
              'flex items-center text-xs mt-1',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {change.toFixed(1)}% 전월 대비
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**`components/charts/employee-chart.tsx`**:
```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EmployeeChartProps {
  data: Array<{ month: string; count: number }>;
}

export function EmployeeChart({ data }: EmployeeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 직원 수 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**대시보드 페이지에 적용**:
```typescript
import { StatisticsCard } from '@/components/charts/statistics-card';
import { EmployeeChart } from '@/components/charts/employee-chart';
import { Users, Building2, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  // 데이터 조회
  const stats = {
    employees: { total: 42, change: 4.8 },
    companies: { total: 3, change: 0 },
    departments: { total: 8, change: 12.5 },
  };

  const chartData = [
    { month: '1월', count: 38 },
    { month: '2월', count: 39 },
    { month: '3월', count: 40 },
    { month: '4월', count: 41 },
    { month: '5월', count: 41 },
    { month: '6월', count: 42 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatisticsCard
          title="전체 직원"
          value={stats.employees.total}
          change={stats.employees.change}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          format={(v) => `${v}명`}
        />
        <StatisticsCard
          title="회사 수"
          value={stats.companies.total}
          change={stats.companies.change}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
          format={(v) => `${v}개`}
        />
        <StatisticsCard
          title="부서 수"
          value={stats.departments.total}
          change={stats.departments.change}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          format={(v) => `${v}개`}
        />
      </div>

      <EmployeeChart data={chartData} />
    </div>
  );
}
```

---

### 3단계: 반응형 디자인 최적화

**Tailwind 브레이크포인트 커스터마이징** (`tailwind.config.ts`):
```typescript
theme: {
  screens: {
    'xs': '320px',
    'sm': '640px',
    'md': '768px',
    'lg': '1024px',
    'xl': '1280px',
    '2xl': '1536px',
  },
}
```

**반응형 레이아웃 예시**:
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* 모바일: 1열, 태블릿: 2열, 데스크톱: 4열 */}
</div>
```

**모바일 네비게이션 개선**:
```typescript
// 이미 Phase 2에서 구현된 사이드바가 모바일 최적화되어 있음
// 추가로 하단 네비게이션 바 구현 가능
```

---

### 4단계: 접근성 향상

**ARIA 레이블 추가**:
```typescript
<button
  aria-label="메뉴 열기"
  aria-expanded={isOpen}
  aria-controls="sidebar"
>
  <Menu />
</button>
```

**키보드 네비게이션**:
```typescript
// 이미 shadcn/ui 컴포넌트들이 키보드 네비게이션 지원
// 추가로 커스텀 단축키 구현 가능

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + K: 검색
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**색상 대비 확인**:
- Chrome DevTools의 Lighthouse 사용
- 최소 4.5:1 대비율 유지 (WCAG AA)
- shadcn/ui 기본 색상은 이미 접근성 준수

---

### 5단계: PWA 구현

**PWA 라이브러리 설치**:
```bash
pnpm add next-pwa
pnpm add -D @types/serviceworker
```

**`next.config.ts` 업데이트**:
```typescript
import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ... 기존 설정
};

export default withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
})(nextConfig);
```

**`public/manifest.json`**:
```json
{
  "name": "인광 토양정화 ERP",
  "short_name": "인광 ERP",
  "description": "효율적인 업무 관리 시스템",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

**`app/layout.tsx`에 매니페스트 추가**:
```typescript
export const metadata: Metadata = {
  title: '인광 토양정화 ERP',
  description: '효율적인 업무 관리 시스템',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '인광 ERP',
  },
  formatDetection: {
    telephone: false,
  },
};
```

**아이콘 생성**:
```bash
# 512x512 PNG 이미지를 준비한 후
# https://realfavicongenerator.net/ 에서 다양한 크기 생성
# public/icons/ 폴더에 저장
```

**설치 프롬프트 컴포넌트**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50 animate-in slide-in-from-bottom-5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">앱 설치</CardTitle>
            <CardDescription>
              홈 화면에 추가하여 더 빠르게 접속하세요
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowPrompt(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleInstall}>
          <Download className="mr-2 h-4 w-4" />
          설치하기
        </Button>
      </CardContent>
    </Card>
  );
}
```

**루트 레이아웃에 추가**:
```typescript
import { InstallPrompt } from '@/components/install-prompt';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <InstallPrompt />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### 6단계: 성능 최적화

**이미지 최적화**:
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="인광 로고"
  width={200}
  height={200}
  priority // 중요한 이미지는 우선 로딩
  quality={90}
/>
```

**동적 임포트 (코드 스플리팅)**:
```typescript
import dynamic from 'next/dynamic';

// 차트 컴포넌트를 동적 임포트
const EmployeeChart = dynamic(
  () => import('@/components/charts/employee-chart').then((mod) => mod.EmployeeChart),
  {
    loading: () => <Skeleton className="h-[300px]" />,
    ssr: false, // 클라이언트에서만 렌더링
  }
);
```

**레이지 로딩**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

export function LazyComponent() {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (inView) {
      setIsLoaded(true);
    }
  }, [inView]);

  return (
    <div ref={ref}>
      {isLoaded ? <HeavyComponent /> : <Skeleton />}
    </div>
  );
}
```

**Core Web Vitals 최적화**:
```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🧪 테스트 시나리오

### 성능 테스트
1. ✅ Lighthouse 점수 90+ (Performance, Accessibility, Best Practices, SEO)
2. ✅ Core Web Vitals 통과 (LCP < 2.5s, FID < 100ms, CLS < 0.1)
3. ✅ 번들 크기 최적화 확인

### PWA 테스트
1. ✅ 앱 설치 가능 확인 (Chrome, Safari)
2. ✅ 오프라인 작동 확인
3. ✅ 아이콘 및 스플래시 화면 표시 확인
4. ✅ 독립 실행형(Standalone) 모드 확인

### 반응형 테스트
1. ✅ 모바일 (320px, 375px, 414px)
2. ✅ 태블릿 (768px, 1024px)
3. ✅ 데스크톱 (1280px, 1920px)
4. ✅ 터치 제스처 작동 확인

### 접근성 테스트
1. ✅ 스크린 리더 테스트 (NVDA, VoiceOver)
2. ✅ 키보드 네비게이션 테스트
3. ✅ 색상 대비 확인
4. ✅ ARIA 레이블 확인

---

## 🎉 Phase 5 완료 체크리스트

- [ ] ✅ Framer Motion 애니메이션 구현
- [ ] ✅ 데이터 시각화 차트 구현
- [ ] ✅ 반응형 디자인 완료
- [ ] ✅ 접근성 개선 완료
- [ ] ✅ PWA 설치 및 테스트 완료
- [ ] ✅ 성능 최적화 완료 (Lighthouse 90+)
- [ ] ✅ Core Web Vitals 통과
- [ ] ✅ 모든 디바이스에서 테스트 완료

---

## 📝 주의사항

### PWA
- iOS Safari는 일부 PWA 기능 제한적 (푸시 알림 등)
- 매니페스트 파일 정확히 작성
- HTTPS 필수 (Vercel은 자동 제공)

### 성능
- 이미지는 반드시 next/image 사용
- 무거운 라이브러리는 동적 임포트
- 불필요한 리렌더링 방지

### 접근성
- 모든 인터랙티브 요소에 키보드 접근 가능
- 의미 있는 ARIA 레이블 사용
- 색상만으로 정보 전달 금지

---

**작성일**: 2025년 9월 30일
**Phase**: 5/6
**다음 Phase**: [Phase_6_테스트_배포.md](./Phase_6_테스트_배포.md)