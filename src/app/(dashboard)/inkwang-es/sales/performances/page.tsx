import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PerformancesPageClient } from './performances-page-client';
import { getPerformances } from '@/actions/performances';

/**
 * 실적관리 페이지 (서버 컴포넌트)
 *
 * - 인증 확인
 * - 실적 데이터 조회 (서버)
 * - 클라이언트 컴포넌트에 데이터 전달
 */
export const revalidate = 0; // 항상 최신 데이터 조회

export default async function PerformancesPage() {
  // 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 실적 데이터 조회
  const { data: performances, error } = await getPerformances();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">데이터 로드 실패</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <PerformancesPageClient performances={performances || []} />;
}
