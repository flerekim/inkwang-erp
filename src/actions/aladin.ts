'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AladinSearchResult, AladinBook, AladinBookConverted } from '@/types/reading';

const ALADIN_API_KEY = process.env.ALADIN_API_KEY;
const ALADIN_API_URL = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

/**
 * 알라딘 API로 도서 검색
 * @param query - 검색어
 * @returns 검색된 도서 목록
 */
export async function searchBooksFromAladin(query: string): Promise<AladinBookConverted[]> {
  if (!ALADIN_API_KEY) {
    throw new Error('알라딘 API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
  }

  if (!query.trim()) {
    throw new Error('검색어를 입력해주세요.');
  }

  const params = new URLSearchParams({
    ttbkey: ALADIN_API_KEY,
    Query: query,
    QueryType: 'Title',
    MaxResults: '20',
    Start: '1',
    SearchTarget: 'Book',
    Output: 'js',
    Version: '20131101',
    Cover: 'Big'
  });

  try {
    const response = await fetch(`${ALADIN_API_URL}?${params}`, {
      next: { revalidate: 3600 } // 1시간 캐싱
    });

    if (!response.ok) {
      throw new Error(`알라딘 API 요청 실패: ${response.status}`);
    }

    const data: AladinSearchResult = await response.json();

    // API 결과를 우리 DB 포맷으로 변환
    const books: AladinBookConverted[] = data.item.map((item: AladinBook) => ({
      isbn: item.isbn || '',
      isbn13: item.isbn13 || '',
      aladin_item_id: String(item.itemId),
      title: item.title,
      author: item.author,
      publisher: item.publisher,
      page_count: item.subInfo?.itemPage || null,
      category: item.categoryName || null,
      cover_url: item.cover,
      description: item.description,
      pub_date: item.pubDate,
      is_manual_entry: false
    }));

    return books;
  } catch (error) {
    console.error('알라딘 API 검색 실패:', error);

    if (error instanceof Error) {
      throw new Error(`도서 검색 중 오류가 발생했습니다: ${error.message}`);
    }

    throw new Error('도서 검색 중 오류가 발생했습니다.');
  }
}

/**
 * 알라딘 도서를 로컬 DB에 저장
 * @param bookData - 저장할 도서 데이터
 * @returns 저장된 도서 정보
 */
export async function saveAladinBook(bookData: AladinBookConverted) {
  const supabase = await createClient();

  try {
    // ISBN으로 이미 존재하는지 확인
    if (bookData.isbn) {
      const { data: existing } = await supabase
        .from('books')
        .select('id, title, author, publisher, cover_url, page_count, category')
        .eq('isbn', bookData.isbn)
        .single();

      if (existing) {
        return existing;
      }
    }

    // ISBN13으로도 확인
    if (bookData.isbn13) {
      const { data: existing } = await supabase
        .from('books')
        .select('id, title, author, publisher, cover_url, page_count, category')
        .eq('isbn13', bookData.isbn13)
        .single();

      if (existing) {
        return existing;
      }
    }

    // 새 도서 저장
    const { data: newBook, error } = await supabase
      .from('books')
      .insert({
        isbn: bookData.isbn || null,
        isbn13: bookData.isbn13 || null,
        aladin_item_id: bookData.aladin_item_id,
        title: bookData.title,
        author: bookData.author,
        publisher: bookData.publisher,
        page_count: bookData.page_count,
        category: bookData.category,
        cover_url: bookData.cover_url,
        description: bookData.description,
        pub_date: bookData.pub_date,
        is_manual_entry: false
      })
      .select()
      .single();

    if (error) {
      console.error('도서 저장 실패:', error);
      throw new Error('도서 저장에 실패했습니다.');
    }

    revalidatePath('/culture/reading/books');
    revalidatePath('/culture/reading');

    return newBook;
  } catch (error) {
    console.error('도서 저장 중 오류:', error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('도서 저장 중 오류가 발생했습니다.');
  }
}

/**
 * 로컬 DB에서 도서 검색 (알라딘 API 실패 시 폴백)
 * @param query - 검색어
 * @returns 검색된 도서 목록
 */
export async function searchBooksFromLocal(query: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, publisher, cover_url, cover_image_path, page_count, category')
      .or(`title.ilike.%${query}%,author.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('로컬 도서 검색 실패:', error);
      throw new Error('로컬 도서 검색에 실패했습니다.');
    }

    return data || [];
  } catch (error) {
    console.error('로컬 도서 검색 중 오류:', error);
    throw new Error('로컬 도서 검색 중 오류가 발생했습니다.');
  }
}
