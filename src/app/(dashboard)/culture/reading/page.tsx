import { Suspense } from 'react';
import { Metadata } from 'next';
import { BookOpen, Loader2 } from 'lucide-react';
import { ReadingTable } from './reading-table';
import { getReadingRecords } from '@/actions/reading';
import { getEmployees } from '@/actions/employees';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '독서 관리 | 인광ERP',
  description: '직원 독서 기록 및 도서 관리',
};

/**
 * 독서 관리 메인 페이지
 * - 독서 기록 조회 및 관리
 * - 중복 독서 시각적 표시
 * - 도서 검색 및 추가
 */
export default async function ReadingPage() {
  // 현재 로그인한 사용자 정보 가져오기
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 독서 기록 데이터 로드
  const result = await getReadingRecords();

  // 사용자 목록 로드
  const usersResult = await getEmployees();
  const users = usersResult.data || [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            독서 관리
          </h2>
          <p className="text-muted-foreground">
            직원들의 독서 기록을 관리하고 추적합니다
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="전체 독서 기록"
          value={result.length}
          description="등록된 총 독서 기록 수"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          title="등록된 도서"
          value={getUniqueBookCount(result)}
          description="독서 기록에 있는 도서 수"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          title="독서자 수"
          value={getUniqueReaderCount(result)}
          description="독서 기록이 있는 직원 수"
          icon={<BookOpen className="h-4 w-4" />}
        />
        <StatCard
          title="중복 독서"
          value={getDuplicateReadingCount(result)}
          description="같은 책을 여러 번 읽은 경우"
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      {/* 독서 관리 테이블 */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ReadingTable initialData={result} users={users} currentUserId={user.id} />
      </Suspense>
    </div>
  );
}

/**
 * 통계 카드 컴포넌트
 */
interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between space-x-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon}
      </div>
      <div className="mt-2">
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

/**
 * 고유 도서 수 계산
 */
function getUniqueBookCount(
  records: Awaited<ReturnType<typeof getReadingRecords>>
): number {
  const uniqueBooks = new Set(records.map((r) => r.book_id));
  return uniqueBooks.size;
}

/**
 * 고유 독서자 수 계산
 */
function getUniqueReaderCount(
  records: Awaited<ReturnType<typeof getReadingRecords>>
): number {
  const uniqueReaders = new Set(records.map((r) => r.user_id));
  return uniqueReaders.size;
}

/**
 * 중복 독서 건수 계산
 */
function getDuplicateReadingCount(
  records: Awaited<ReturnType<typeof getReadingRecords>>
): number {
  const seen = new Set<string>();
  let count = 0;

  records.forEach((record) => {
    const key = `${record.user_id}-${record.book_id}`;
    if (seen.has(key)) {
      count++;
    } else {
      seen.add(key);
    }
  });

  return count;
}
