import { Suspense } from 'react';
import { Metadata } from 'next';
import { Library, Loader2 } from 'lucide-react';
import { BooksTable } from './books-table';
import { getBooks } from '@/actions/books';

export const metadata: Metadata = {
  title: '도서 목록 | 인광ERP',
  description: '등록된 도서 목록 관리',
};

/**
 * 도서 목록 관리 페이지
 */
export default async function BooksPage() {
  // 도서 목록 데이터 로드
  const books = await getBooks();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Library className="h-8 w-8 text-primary" />
            도서 목록
          </h2>
          <p className="text-muted-foreground">
            독서 관리에 등록된 도서 목록을 조회하고 관리합니다
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="전체 도서"
          value={books.length}
          description="등록된 총 도서 수"
          icon={<Library className="h-4 w-4" />}
        />
        <StatCard
          title="알라딘 등록"
          value={books.filter((b) => !b.is_manual_entry).length}
          description="알라딘 API로 등록된 도서"
          icon={<Library className="h-4 w-4" />}
        />
        <StatCard
          title="수동 등록"
          value={books.filter((b) => b.is_manual_entry).length}
          description="수동으로 등록된 도서"
          icon={<Library className="h-4 w-4" />}
        />
        <StatCard
          title="총 독서자"
          value={books.reduce((sum, b) => sum + b.reader_count, 0)}
          description="전체 독서 기록 수"
          icon={<Library className="h-4 w-4" />}
        />
      </div>

      {/* 도서 목록 테이블 */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <BooksTable initialData={books} />
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
