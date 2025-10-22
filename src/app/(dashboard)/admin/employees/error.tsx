'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 (프로덕션 환경에서는 에러 추적 서비스로 전송)
    console.error('사원 페이지 에러:', error);
  }, [error]);

  return (
    <div className="flex min-h-[600px] flex-col items-center justify-center space-y-6 p-8">
      {/* 에러 아이콘 */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>

      {/* 에러 메시지 */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">문제가 발생했습니다</h2>
        <p className="text-muted-foreground max-w-md">
          사원 목록을 불러오는 중 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해주세요.
        </p>

        {/* 개발 환경에서만 에러 상세 정보 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
            <summary className="cursor-pointer font-semibold text-sm text-destructive">
              에러 상세 정보 (개발 모드)
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">
              {error.message}
              {error.digest && `\n\nError Digest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          다시 시도
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            대시보드로 이동
          </Button>
        </Link>
      </div>

      {/* 도움말 링크 */}
      <p className="text-sm text-muted-foreground">
        문제가 계속되면{' '}
        <Link href="/support" className="underline hover:text-foreground transition-colors">
          고객 지원팀에 문의
        </Link>
        해주세요.
      </p>
    </div>
  );
}
