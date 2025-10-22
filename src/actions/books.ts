'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Book, BookFormData } from '@/types/reading';

/**
 * 도서 목록 조회
 * @param search - 검색어 (선택사항)
 * @returns 도서 목록
 */
export async function getBooks(search?: string): Promise<Book[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (search && search.trim()) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,publisher.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('도서 목록 조회 실패:', error);
      throw new Error('도서 목록을 불러올 수 없습니다.');
    }

    return (data || []) as Book[];
  } catch (error) {
    console.error('도서 목록 조회 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 목록 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 도서 ID로 조회
 * @param id - 도서 ID
 * @returns 도서 정보
 */
export async function getBookById(id: string): Promise<Book> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('도서 조회 실패:', error);
      throw new Error('도서를 찾을 수 없습니다.');
    }

    return data as Book;
  } catch (error) {
    console.error('도서 조회 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 도서 생성 (수동 입력)
 * @param data - 도서 정보
 * @returns 생성된 도서
 */
export async function createBook(data: BookFormData): Promise<Book> {
  const supabase = await createClient();

  try {
    const { data: book, error } = await supabase
      .from('books')
      .insert({
        ...data,
        is_manual_entry: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('이미 등록된 도서입니다.');
      }
      console.error('도서 등록 실패:', error);
      throw new Error('도서 등록에 실패했습니다.');
    }

    revalidatePath('/culture/reading');
    revalidatePath('/culture/reading/books');

    return book as Book;
  } catch (error) {
    console.error('도서 생성 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 생성 중 오류가 발생했습니다.');
  }
}

/**
 * 도서 정보 업데이트
 * @param id - 도서 ID
 * @param data - 업데이트할 정보
 */
export async function updateBook(id: string, data: Partial<BookFormData>): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('books')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('도서 수정 실패:', error);
      throw new Error('도서 정보 수정에 실패했습니다.');
    }

    revalidatePath('/culture/reading');
    revalidatePath('/culture/reading/books');
  } catch (error) {
    console.error('도서 업데이트 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 업데이트 중 오류가 발생했습니다.');
  }
}

/**
 * 도서 삭제
 * @param id - 도서 ID
 */
export async function deleteBook(id: string): Promise<void> {
  const supabase = await createClient();

  try {
    // 독서 기록이 있는지 확인
    const { count } = await supabase
      .from('reading_records')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', id);

    if (count && count > 0) {
      throw new Error('독서 기록이 있는 도서는 삭제할 수 없습니다.');
    }

    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('도서 삭제 실패:', error);
      throw new Error('도서 삭제에 실패했습니다.');
    }

    revalidatePath('/culture/reading');
    revalidatePath('/culture/reading/books');
  } catch (error) {
    console.error('도서 삭제 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 삭제 중 오류가 발생했습니다.');
  }
}

/**
 * 도서별 독서자 수 업데이트 (헬퍼 함수)
 * @param bookId - 도서 ID
 */
export async function updateBookReaderCount(bookId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { count } = await supabase
      .from('reading_records')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', bookId);

    await supabase
      .from('books')
      .update({ reader_count: count || 0 })
      .eq('id', bookId);
  } catch (error) {
    console.error('독서자 수 업데이트 중 오류:', error);
    // 에러가 발생해도 메인 로직에는 영향 없도록 throw하지 않음
  }
}
