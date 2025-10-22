'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { updateBookReaderCount } from './books';
import type { ReadingRecord, ReadingFormData } from '@/types/reading';

/**
 * 독서 기록 조회 (관계 데이터 포함)
 * @returns 독서 기록 목록
 */
export async function getReadingRecords(): Promise<ReadingRecord[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('reading_records')
      .select(`
        *,
        book:books(
          id, title, author, publisher,
          page_count, category, cover_url, cover_image_path
        ),
        user:users!reading_records_user_id_fkey(id, name, email),
        company:companies(id, name),
        department:departments(id, name)
      `)
      .order('completed_date', { ascending: false });

    if (error) {
      console.error('독서 기록 조회 실패:', error);
      throw new Error('독서 기록을 불러올 수 없습니다.');
    }

    // Supabase 타입과 우리 타입 간 불일치 해결을 위한 타입 단언
    return (data || []) as unknown as ReadingRecord[];
  } catch (error) {
    console.error('독서 기록 조회 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('독서 기록 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 독서 기록 생성
 * @param data - 독서 기록 정보
 * @returns 생성된 독서 기록
 */
export async function createReadingRecord(data: ReadingFormData): Promise<ReadingRecord> {
  const supabase = await createClient();

  try {
    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data: record, error } = await supabase
      .from('reading_records')
      .insert({
        ...data,
        created_by: user.id
      })
      .select(`
        *,
        book:books(
          id, title, author, publisher,
          page_count, category, cover_url, cover_image_path
        ),
        user:users!reading_records_user_id_fkey(id, name, email),
        company:companies(id, name),
        department:departments(id, name)
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('이미 등록된 독서 기록입니다.');
      }
      console.error('독서 기록 등록 실패:', error);
      throw new Error('독서 기록 등록에 실패했습니다.');
    }

    // 도서별 독서자 수 업데이트
    await updateBookReaderCount(data.book_id);

    revalidatePath('/culture/reading');

    return record as unknown as ReadingRecord;
  } catch (error) {
    console.error('독서 기록 생성 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('독서 기록 생성 중 오류가 발생했습니다.');
  }
}

/**
 * 독서 기록 수정
 * @param id - 독서 기록 ID
 * @param data - 수정할 정보
 */
export async function updateReadingRecord(
  id: string,
  data: Partial<ReadingFormData>
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('reading_records')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('독서 기록 수정 실패:', error);
      return { error: '독서 기록 수정에 실패했습니다.' };
    }

    revalidatePath('/culture/reading');
    return { success: true };
  } catch (error) {
    console.error('독서 기록 업데이트 중 오류:', error);
    return { error: error instanceof Error ? error.message : '독서 기록 업데이트 중 오류가 발생했습니다.' };
  }
}

/**
 * 독서 기록 삭제
 * @param id - 독서 기록 ID
 */
export async function deleteReadingRecord(id: string): Promise<void> {
  const supabase = await createClient();

  try {
    // 삭제 전 book_id 가져오기
    const { data: record } = await supabase
      .from('reading_records')
      .select('book_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('reading_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('독서 기록 삭제 실패:', error);
      throw new Error('독서 기록 삭제에 실패했습니다.');
    }

    // 도서별 독서자 수 업데이트
    if (record?.book_id) {
      await updateBookReaderCount(record.book_id);
    }

    revalidatePath('/culture/reading');
  } catch (error) {
    console.error('독서 기록 삭제 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('독서 기록 삭제 중 오류가 발생했습니다.');
  }
}

/**
 * 여러 독서 기록 삭제 (일괄 삭제)
 * @param ids - 삭제할 독서 기록 ID 목록
 */
export async function deleteReadingRecords(ids: string[]): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  try {
    // 삭제 전 book_id 목록 가져오기
    const { data: records } = await supabase
      .from('reading_records')
      .select('book_id')
      .in('id', ids);

    const { error } = await supabase
      .from('reading_records')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('독서 기록 일괄 삭제 실패:', error);
      return { error: '독서 기록 삭제에 실패했습니다.' };
    }

    // 도서별 독서자 수 업데이트
    if (records) {
      const uniqueBookIds = [...new Set(records.map(r => r.book_id).filter((id): id is string => id !== null))];
      for (const bookId of uniqueBookIds) {
        await updateBookReaderCount(bookId);
      }
    }

    revalidatePath('/culture/reading');
    return { success: true };
  } catch (error) {
    console.error('독서 기록 일괄 삭제 중 오류:', error);
    return { error: error instanceof Error ? error.message : '독서 기록 일괄 삭제 중 오류가 발생했습니다.' };
  }
}
