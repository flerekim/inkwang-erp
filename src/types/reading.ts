// 독서관리 시스템 타입 정의

// 도서 타입
export interface Book {
  id: string;
  isbn: string | null;
  isbn13: string | null;
  aladin_item_id: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  page_count: number | null;
  category: string | null;
  cover_url: string | null;
  cover_image_path: string | null;
  description: string | null;
  pub_date: string | null;
  is_manual_entry: boolean;
  reader_count: number;
  created_at: string;
  updated_at: string;
}

// 독서 기록 타입
export interface ReadingRecord {
  id: string;
  book_id: string;
  user_id: string;
  company_id: string;
  department_id: string;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;

  // 관계 데이터 (조인 쿼리 결과)
  book?: Book;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
  };
  department?: {
    id: string;
    name: string;
  };
}

// 알라딘 API 응답 타입
export interface AladinBook {
  itemId: number;
  title: string;
  author: string;
  pubDate: string;
  description: string;
  isbn: string;
  isbn13: string;
  priceSales: number;
  priceStandard: number;
  cover: string;
  categoryName: string;
  publisher: string;
  adult: boolean;
  customerReviewRank: number;
  subInfo?: {
    itemPage?: number;
    originalTitle?: string;
    subTitle?: string;
  };
}

export interface AladinSearchResult {
  version: string;
  title: string;
  link: string;
  pubDate: string;
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  query: string;
  searchCategoryId: number;
  searchCategoryName: string;
  item: AladinBook[];
}

// 폼 데이터 타입
export interface BookFormData {
  title: string;
  author?: string | null;
  publisher?: string | null;
  page_count?: number | null;
  category?: string | null;
  cover_url?: string | null;
  cover_image_path?: string | null;
  description?: string | null;
  isbn?: string | null;
  isbn13?: string | null;
  pub_date?: string | null;
}

export interface ReadingFormData {
  book_id: string;
  user_id: string;
  company_id: string;
  department_id?: string;
  completed_date?: string | null;
  notes?: string | null;
}

// 알라딘 API에서 우리 DB 형식으로 변환된 도서 타입
export interface AladinBookConverted {
  isbn: string;
  isbn13: string;
  aladin_item_id: string;
  title: string;
  author: string;
  publisher: string;
  page_count: number | null;
  category: string | null;
  cover_url: string;
  description: string;
  pub_date: string;
  is_manual_entry: false;
}
