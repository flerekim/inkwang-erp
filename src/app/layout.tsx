import type { Metadata, Viewport } from 'next';
import { Inter as FontSans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
// import { InstallPrompt } from '@/components/install-prompt'; // 사이드바로 이동
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cn } from '@/lib/utils';
import './globals.css';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: '인광 토양정화 ERP',
  description: '효율적인 업무 관리 시스템',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '인광 ERP',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* PWA Service Worker 등록 (Production에서만) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 개발 환경에서는 서비스 워커 비활성화 (캐싱 방지)
              const isDevelopment = window.location.hostname === 'localhost' ||
                                   window.location.hostname === '127.0.0.1';

              if ('serviceWorker' in navigator && !isDevelopment) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registered:', registration.scope);

                      // 업데이트 감지
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        console.log('Service Worker update found');

                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // 새 버전 사용 가능 - 커스텀 이벤트 발생
                            console.log('New Service Worker available');
                            window.dispatchEvent(new CustomEvent('swUpdateAvailable', { detail: newWorker }));
                          }
                        });
                      });

                      // 주기적으로 업데이트 확인 (1시간마다)
                      setInterval(function() {
                        registration.update();
                      }, 60 * 60 * 1000);
                    })
                    .catch(function(error) {
                      console.log('Service Worker registration failed:', error);
                    });
                });
              } else if (isDevelopment) {
                // 개발 환경에서 기존 서비스 워커 제거
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  registrations.forEach(function(registration) {
                    registration.unregister();
                    console.log('Development: Service Worker unregistered');
                  });
                });
              }
            `,
          }}
        />
      </head>
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
          {/* <InstallPrompt /> - 사이드바로 이동 */}
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
