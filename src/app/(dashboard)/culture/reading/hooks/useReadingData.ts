import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getBooks } from '@/actions/books';
import { getCompanies, getDepartments } from '@/actions/employees';
import type { ReadingRecord, Book, Company, Department } from '@/types';

/**
 * useReadingData Hook
 *
 * 독서 기록 테이블에 필요한 관련 데이터 로딩 및 상태 관리
 *
 * @param initialData - 초기 독서 기록 데이터 (displayData from useTableState)
 */
export function useReadingData(initialData: ReadingRecord[]) {
  const { toast } = useToast();

  // 관계형 데이터 상태
  const [books, setBooks] = useState<Book[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // 관계형 데이터 로드 (마운트 시 1회)
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [booksData, comps, depts] = await Promise.all([
          getBooks(),
          getCompanies(),
          getDepartments(),
        ]);
        setBooks(booksData);
        setCompanies(comps);
        setDepartments(depts);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '데이터 로드 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      }
    };
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 한 번만 실행

  // 중복 독서 건수 계산
  const duplicateCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;

    initialData.forEach((record) => {
      const key = `${record.user_id}-${record.book_id}`;
      if (seen.has(key)) {
        count++;
      } else {
        seen.add(key);
      }
    });

    return count;
  }, [initialData]);

  return {
    // 관계형 데이터
    books,
    companies,
    departments,

    // 통계
    duplicateCount,
  };
}
