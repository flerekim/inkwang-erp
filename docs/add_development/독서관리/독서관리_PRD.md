# 독서관리 시스템 상세 PRD (Product Requirements Document)

> 작성일: 2025-01-21
> 버전: 1.0.0
> 대상: 주니어 개발자 및 개발팀

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [API 설계](#4-api-설계)
5. [화면 설계](#5-화면-설계)
6. [컴포넌트 구조](#6-컴포넌트-구조)
7. [구현 단계별 가이드](#7-구현-단계별-가이드)
8. [알라딘 API 연동](#8-알라딘-api-연동)
9. [테스트 계획](#9-테스트-계획)
10. [배포 및 운영](#10-배포-및-운영)

---

## 1. 프로젝트 개요

### 1.1 목적
조직 구성원들의 독서 활동을 체계적으로 관리하고 추적하는 시스템 구축

### 1.2 핵심 기능
- 알라딘 API를 통한 도서 정보 자동 조회
- 도서 목록 관리 (알라딘 조회 + 수동 입력)
- 직원별 독서 이력 관리
- **중복 독서 표시** (같은 사람이 같은 책을 여러 번 읽은 경우 시각적 표시)
- 도서별 독서 통계
- Excel 내보내기 및 인쇄 기능

### 1.3 기술 스택
- **Frontend**: Next.js 15.5.4, React 19.1.0, TypeScript
- **UI**: Tailwind CSS v4.0, Radix UI, shadcn/ui
- **Backend**: Supabase (PostgreSQL)
- **State Management**: React Context API
- **Forms**: React Hook Form + Zod
- **Table**: TanStack Table v8
- **외부 API**: 알라딘 Open API

### 1.4 개발 규칙 및 주의사항
- **Server Actions 패턴** 사용 (destructuring export 불가)
- **메모이제이션 필수** (무한 렌더링 방지)
- **공통 컴포넌트 최대한 활용**
- **한국어 주석 사용** (비즈니스 로직)
- **kebab-case 파일명** 사용

---

## 2. 시스템 아키텍처

### 2.1 폴더 구조
```
src/
├── app/(dashboard)/
│   └── culture/                    # 조직문화 메인 폴더 (신규)
│       └── reading/                # 독서관리
│           ├── page.tsx            # 독서관리 메인 페이지
│           ├── reading-table.tsx   # 독서 목록 테이블
│           ├── reading-columns.tsx # 테이블 컬럼 정의
│           ├── books/              # 도서 목록 관리
│           │   ├── page.tsx        # 도서 목록 페이지
│           │   ├── book-table.tsx  # 도서 테이블
│           │   └── book-columns.tsx # 도서 컬럼 정의
│           ├── components/         # 독서관리 컴포넌트
│           │   ├── BookSearchDialog.tsx    # 도서 검색 다이얼로그
│           │   ├── BookImageUpload.tsx     # 표지 이미지 업로드
│           │   ├── ReadingToolbar.tsx      # 툴바 컴포넌트
│           │   └── BookManualInput.tsx     # 수동 입력 폼
│           └── hooks/              # 커스텀 훅
│               ├── useReadingData.ts       # 독서 데이터 관리
│               ├── useReadingActions.ts    # 독서 액션 관리
│               └── useAladinSearch.ts      # 알라딘 API 훅
├── actions/
│   ├── reading.ts                  # 독서 관리 Server Actions
│   ├── books.ts                    # 도서 관리 Server Actions
│   └── aladin.ts                   # 알라딘 API Server Actions
└── types/
    └── reading.ts                   # 독서관리 타입 정의
```

### 2.2 데이터 흐름
```
사용자 입력
    ↓
도서 검색 (알라딘 API → 로컬 DB 캐시)
    ↓
독서 기록 생성
    ↓
Supabase 저장
    ↓
UI 업데이트 (revalidatePath)
```

---

## 3. 데이터베이스 설계

### 3.1 테이블 구조

#### books (도서 목록)
```sql
CREATE TABLE books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn varchar(20) UNIQUE,               -- ISBN (알라딘 API)
  isbn13 varchar(20),                    -- 13자리 ISBN
  aladin_item_id varchar(50),            -- 알라딘 상품 ID
  title text NOT NULL,                   -- 도서명
  author text,                          -- 저자
  publisher text,                       -- 출판사
  page_count integer,                   -- 쪽수
  category text,                        -- 분류
  cover_url text,                       -- 표지 URL
  cover_image_path text,                -- 업로드된 표지 경로
  description text,                     -- 책 소개
  pub_date date,                        -- 출간일
  is_manual_entry boolean DEFAULT false, -- 수동 입력 여부
  reader_count integer DEFAULT 0,       -- 독서자 수
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
```

#### reading_records (독서 기록)
```sql
CREATE TABLE reading_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),    -- 독서자 (직원)
  company_id uuid REFERENCES companies(id), -- 소속회사
  department_id uuid REFERENCES departments(id), -- 부서
  completed_date date,                  -- 독서완료일
  notes text,                           -- 메모
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),

  -- 중복 방지: 같은 사람이 같은 날짜에 같은 책을 읽은 것만 방지
  -- 같은 사람이 같은 책을 다른 날짜에 여러 번 읽는 것은 허용됨
  UNIQUE(book_id, user_id, completed_date)
);

-- 인덱스
CREATE INDEX idx_reading_user ON reading_records(user_id);
CREATE INDEX idx_reading_book ON reading_records(book_id);
CREATE INDEX idx_reading_date ON reading_records(completed_date);
```

### 3.2 RLS (Row Level Security) 정책
```sql
-- books 테이블 정책
CREATE POLICY "Books are viewable by all authenticated users"
  ON books FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Books can be managed by admin and managers"
  ON books FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('admin', 'manager')
    )
  );

-- reading_records 테이블 정책
CREATE POLICY "Reading records viewable by same company users"
  ON reading_records FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Reading records managed by admin and managers"
  ON reading_records FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('admin', 'manager')
      AND company_id = reading_records.company_id
    )
  );
```

---

## 4. API 설계

### 4.1 Server Actions 구조

#### `/src/actions/books.ts`
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Book, BookFormData } from '@/types/reading';

// 도서 목록 조회
export async function getBooks(search?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('도서 목록 조회 실패:', error);
    throw new Error('도서 목록을 불러올 수 없습니다.');
  }

  return data as Book[];
}

// 도서 생성 (수동)
export async function createBook(data: BookFormData) {
  const supabase = await createClient();

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
    throw new Error('도서 등록에 실패했습니다.');
  }

  revalidatePath('/culture/reading');
  revalidatePath('/culture/reading/books');

  return book;
}

// 도서 업데이트
export async function updateBook(id: string, data: Partial<BookFormData>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('books')
    .update(data)
    .eq('id', id);

  if (error) {
    throw new Error('도서 정보 수정에 실패했습니다.');
  }

  revalidatePath('/culture/reading');
  revalidatePath('/culture/reading/books');
}

// 도서 삭제
export async function deleteBook(id: string) {
  const supabase = await createClient();

  // 독서 기록이 있는지 확인
  const { count } = await supabase
    .from('reading_records')
    .select('id', { count: 'exact' })
    .eq('book_id', id);

  if (count && count > 0) {
    throw new Error('독서 기록이 있는 도서는 삭제할 수 없습니다.');
  }

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('도서 삭제에 실패했습니다.');
  }

  revalidatePath('/culture/reading/books');
}
```

#### `/src/actions/aladin.ts`
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AladinSearchResult, AladinBook } from '@/types/reading';

const ALADIN_API_KEY = process.env.ALADIN_TTB_KEY;
const ALADIN_API_URL = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

// 알라딘 API 도서 검색
export async function searchBooksFromAladin(query: string) {
  if (!ALADIN_API_KEY) {
    throw new Error('알라딘 API 키가 설정되지 않았습니다.');
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
    const response = await fetch(`${ALADIN_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error('알라딘 API 요청 실패');
    }

    const data: AladinSearchResult = await response.json();

    // API 결과를 우리 DB 포맷으로 변환
    const books = data.item.map((item: AladinBook) => ({
      isbn: item.isbn,
      isbn13: item.isbn13,
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
    throw new Error('도서 검색 중 오류가 발생했습니다.');
  }
}

// 알라딘 도서를 로컬 DB에 저장
export async function saveAladinBook(bookData: any) {
  const supabase = await createClient();

  // 이미 존재하는지 확인 (ISBN 기준)
  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .eq('isbn', bookData.isbn)
    .single();

  if (existing) {
    return existing;
  }

  // 새 도서 저장
  const { data: newBook, error } = await supabase
    .from('books')
    .insert(bookData)
    .select()
    .single();

  if (error) {
    throw new Error('도서 저장에 실패했습니다.');
  }

  revalidatePath('/culture/reading/books');

  return newBook;
}
```

#### `/src/actions/reading.ts`
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ReadingRecord, ReadingFormData } from '@/types/reading';

// 독서 기록 조회 (관계 데이터 포함)
export async function getReadingRecords() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reading_records')
    .select(`
      *,
      book:books(
        id, title, author, publisher,
        page_count, category, cover_url, cover_image_path
      ),
      user:users(id, name, email),
      company:companies(id, name),
      department:departments(id, name)
    `)
    .order('completed_date', { ascending: false });

  if (error) {
    console.error('독서 기록 조회 실패:', error);
    throw new Error('독서 기록을 불러올 수 없습니다.');
  }

  // 도서별 독서자 수 업데이트
  await updateReaderCounts();

  return data as ReadingRecord[];
}

// 독서 기록 생성
export async function createReadingRecord(data: ReadingFormData) {
  const supabase = await createClient();

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
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 등록된 독서 기록입니다.');
    }
    throw new Error('독서 기록 등록에 실패했습니다.');
  }

  // 도서별 독서자 수 업데이트
  await updateBookReaderCount(data.book_id);

  revalidatePath('/culture/reading');

  return record;
}

// 독서 기록 수정
export async function updateReadingRecord(id: string, data: Partial<ReadingFormData>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reading_records')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    throw new Error('독서 기록 수정에 실패했습니다.');
  }

  revalidatePath('/culture/reading');
}

// 독서 기록 삭제
export async function deleteReadingRecord(id: string) {
  const supabase = await createClient();

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
    throw new Error('독서 기록 삭제에 실패했습니다.');
  }

  // 도서별 독서자 수 업데이트
  if (record) {
    await updateBookReaderCount(record.book_id);
  }

  revalidatePath('/culture/reading');
}

// 도서별 독서자 수 업데이트 (헬퍼 함수)
async function updateBookReaderCount(bookId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from('reading_records')
    .select('id', { count: 'exact' })
    .eq('book_id', bookId);

  await supabase
    .from('books')
    .update({ reader_count: count || 0 })
    .eq('id', bookId);
}

// 모든 도서의 독서자 수 업데이트
async function updateReaderCounts() {
  const supabase = await createClient();

  const { data: books } = await supabase
    .from('books')
    .select('id');

  if (books) {
    for (const book of books) {
      await updateBookReaderCount(book.id);
    }
  }
}
```

---

## 5. 화면 설계

### 5.1 독서관리 메인 화면 (`/culture/reading`)

#### 화면 구성
```
┌─────────────────────────────────────────────────────────┐
│ 독서관리                                                 │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐   │
│ │ [독서 기록 추가] [도서 목록 관리] [Excel] [인쇄]     │   │ <- 툴바
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 표지 | 도서명 | 저자 | 출판사 | 독서자 | 부서 | ... │   │ <- 테이블 헤더
│ ├───────────────────────────────────────────────────┤   │
│ │ [이미지] | 클린코드 | 로버트... | 인사이트 | 홍길동 [2회] │ <- 중복 독서 표시
│ │ [이미지] | 리팩터링 | 마틴 파... | 한빛미디어 | 김철수│
│ │ [이미지] | 클린코드 | 로버트... | 인사이트 | 홍길동 [2회] │ <- 배경색 표시
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ [■] 중복 독서 (같은 사람이 같은 책을 여러 번 읽음)       │ <- 범례
│                                                           │
│ [이전] [1] [2] [3] ... [다음]                            │ <- 페이징
└─────────────────────────────────────────────────────────┘
```

### 5.2 도서 검색 다이얼로그

#### 화면 구성
```
┌─────────────────────────────────────────────┐
│ 도서 검색                              [X] │
├─────────────────────────────────────────────┤
│ [검색어 입력____________________] [검색]    │
│                                              │
│ 검색 결과:                                   │
│ ┌──────────────────────────────────────┐    │
│ │ □ [표지] 클린코드                     │    │
│ │   로버트 C. 마틴 | 인사이트           │    │
│ │   464쪽 | 프로그래밍                  │    │
│ ├──────────────────────────────────────┤    │
│ │ □ [표지] 리팩터링                     │    │
│ │   마틴 파울러 | 한빛미디어            │    │
│ │   500쪽 | 프로그래밍                  │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ 검색 결과가 없습니다.                        │
│ [수동으로 도서 정보 입력]                    │
│                                              │
│ [취소] [선택한 도서 추가]                    │
└─────────────────────────────────────────────┘
```

### 5.3 도서 목록 관리 화면 (`/culture/reading/books`)

#### 화면 구성
```
┌─────────────────────────────────────────────────────────┐
│ 도서 목록 관리                                           │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐   │
│ │ [도서 추가] [Excel 내보내기] [인쇄]                 │   │
│ └───────────────────────────────────────────────────┘   │
│                                                           │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 표지 | 도서명 | 저자 | 출판사 | 읽은 사람 수 | ... │   │
│ ├───────────────────────────────────────────────────┤   │
│ │ [이미지] | 클린코드 | ... | ... | 15명 | [수정][삭제]│
│ └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 컴포넌트 구조

### 6.1 주요 컴포넌트 상세 설계

#### `BookSearchDialog.tsx` - 도서 검색 다이얼로그
```typescript
'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { searchBooksFromAladin, saveAladinBook } from '@/actions/aladin';
import { useToast } from '@/components/ui/use-toast';

interface BookSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookSelect: (book: any) => void;
}

export function BookSearchDialog({
  open,
  onOpenChange,
  onBookSelect
}: BookSearchDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [selectedBook, setSelectedBook] = React.useState<any>(null);
  const [showManualInput, setShowManualInput] = React.useState(false);
  const { toast } = useToast();

  // 알라딘 API 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: '검색어를 입력해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchBooksFromAladin(searchQuery);
      setSearchResults(results);

      if (results.length === 0) {
        setShowManualInput(true);
        toast({
          title: '검색 결과가 없습니다',
          description: '수동으로 도서 정보를 입력할 수 있습니다.',
        });
      }
    } catch (error) {
      toast({
        title: '검색 실패',
        description: '도서 검색 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setShowManualInput(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 도서 선택 및 저장
  const handleBookAdd = async () => {
    if (!selectedBook) {
      toast({
        title: '도서를 선택해주세요',
        variant: 'destructive',
      });
      return;
    }

    try {
      const savedBook = await saveAladinBook(selectedBook);
      onBookSelect(savedBook);
      onOpenChange(false);

      // 상태 초기화
      setSearchQuery('');
      setSearchResults([]);
      setSelectedBook(null);
      setShowManualInput(false);

      toast({
        title: '도서가 추가되었습니다',
      });
    } catch (error) {
      toast({
        title: '도서 추가 실패',
        description: '도서 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>도서 검색</DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="flex gap-2">
          <Input
            placeholder="도서명을 입력하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-4">
              {searchResults.map((book, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-4 p-3 rounded-lg border cursor-pointer hover:bg-muted",
                    selectedBook?.isbn === book.isbn && "bg-muted"
                  )}
                  onClick={() => setSelectedBook(book)}
                >
                  {/* 표지 이미지 */}
                  {book.cover_url && (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-16 h-20 object-cover rounded"
                    />
                  )}

                  {/* 도서 정보 */}
                  <div className="flex-1">
                    <h4 className="font-medium">{book.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {book.author} | {book.publisher}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {book.page_count}쪽 | {book.category}
                    </p>
                  </div>

                  {/* 선택 체크박스 */}
                  <Checkbox
                    checked={selectedBook?.isbn === book.isbn}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedBook(book);
                      else setSelectedBook(null);
                    }}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 검색 결과 없음 */}
        {searchResults.length === 0 && showManualInput && (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              검색 결과가 없습니다.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // BookManualInput 다이얼로그 열기
                onOpenChange(false);
                // 부모 컴포넌트에서 수동 입력 모드 처리
              }}
            >
              수동으로 도서 정보 입력
            </Button>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleBookAdd}
            disabled={!selectedBook}
          >
            선택한 도서 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### `reading-columns.tsx` - 테이블 컬럼 정의
```typescript
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, BookOpen } from 'lucide-react';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ReadingRecord } from '@/types/reading';

export const getReadingColumns = (
  handleUpdate: (id: string, field: string, value: any) => Promise<void>,
  allRecords: ReadingRecord[] // 중복 확인을 위한 전체 레코드
): ColumnDef<ReadingRecord>[] => [
  {
    accessorKey: 'cover',
    header: '표지',
    cell: ({ row }) => {
      const coverUrl = row.original.book?.cover_url;
      const coverPath = row.original.book?.cover_image_path;
      const imageUrl = coverUrl || coverPath;

      return (
        <div className="w-16 h-20">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={row.original.book?.title || ''}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
              표지 없음
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'book.title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        도서명
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.book?.title || '-'}
      </div>
    ),
  },
  {
    accessorKey: 'book.author',
    header: '저자',
    cell: ({ row }) => row.original.book?.author || '-',
  },
  {
    accessorKey: 'book.publisher',
    header: '출판사',
    cell: ({ row }) => row.original.book?.publisher || '-',
  },
  {
    accessorKey: 'book.page_count',
    header: '쪽수',
    cell: ({ row }) => {
      const pages = row.original.book?.page_count;
      return pages ? `${pages}쪽` : '-';
    },
  },
  {
    accessorKey: 'user.name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        독서자
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const currentRecord = row.original;
      const userName = currentRecord.user?.name || '-';

      // 같은 사용자가 같은 책을 읽은 기록 확인
      const duplicateReading = allRecords.filter(
        record =>
          record.user_id === currentRecord.user_id &&
          record.book_id === currentRecord.book_id &&
          record.id !== currentRecord.id // 현재 레코드 제외
      );

      const readCount = duplicateReading.length;

      return (
        <div className="flex items-center gap-2">
          <span>{userName}</span>
          {readCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 border-amber-300"
              title={`이 책을 ${readCount + 1}번 읽음`}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              {readCount + 1}회
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'company.name',
    header: '소속',
    cell: ({ row }) => row.original.company?.name || '-',
  },
  {
    accessorKey: 'department.name',
    header: '부서',
    cell: ({ row }) => row.original.department?.name || '-',
  },
  {
    accessorKey: 'book.category',
    header: '분류',
    cell: ({ row }) => row.original.book?.category || '-',
  },
  {
    accessorKey: 'completed_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        독서완료일
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <EditableDateCell
        value={row.original.completed_date || ''}
        rowIndex={row.index}
        columnId="completed_date"
        onUpdate={async (rowIndex, columnId, value) => {
          await handleUpdate(row.original.id, columnId, value);
        }}
      />
    ),
  },
  {
    accessorKey: 'notes',
    header: '메모',
    cell: ({ row }) => (
      <EditableCell
        value={row.original.notes || ''}
        rowIndex={row.index}
        columnId="notes"
        onUpdate={async (rowIndex, columnId, value) => {
          await handleUpdate(row.original.id, columnId, value);
        }}
      />
    ),
  },
];
```

#### `reading-table.tsx` - 독서관리 테이블 (중복 독서 표시)
```typescript
'use client';

import * as React from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { getReadingColumns } from './reading-columns';
import { getReadingRecords, updateReadingRecord } from '@/actions/reading';
import { useToast } from '@/components/ui/use-toast';
import type { ReadingRecord } from '@/types/reading';

interface ReadingTableProps {
  initialData: ReadingRecord[];
}

export function ReadingTable({ initialData }: ReadingTableProps) {
  const [readingRecords, setReadingRecords] = React.useState(initialData);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  // 업데이트 핸들러
  const handleUpdate = React.useCallback(
    async (id: string, field: string, value: any) => {
      try {
        await updateReadingRecord(id, { [field]: value });

        // 로컬 상태 업데이트
        setReadingRecords((prev) =>
          prev.map((record) =>
            record.id === id ? { ...record, [field]: value } : record
          )
        );

        toast({
          title: '업데이트 완료',
          description: '독서 기록이 수정되었습니다.',
        });
      } catch (error) {
        toast({
          title: '업데이트 실패',
          description: '독서 기록 수정에 실패했습니다.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // 컬럼 정의 (전체 레코드를 전달하여 중복 확인)
  const columns = React.useMemo(
    () => getReadingColumns(handleUpdate, readingRecords),
    [handleUpdate, readingRecords]
  );

  // 테이블 데이터 메모이제이션
  const data = React.useMemo(() => readingRecords, [readingRecords]);

  // 중복 독서 여부 확인 함수
  const checkDuplicateReading = React.useCallback(
    (record: ReadingRecord) => {
      return readingRecords.some(
        (r) =>
          r.user_id === record.user_id &&
          r.book_id === record.book_id &&
          r.id !== record.id
      );
    },
    [readingRecords]
  );

  // 테이블 행 스타일 커스터마이징
  const getRowClassName = React.useCallback(
    (record: ReadingRecord) => {
      if (checkDuplicateReading(record)) {
        // 중복 독서 기록이 있는 경우 배경색 추가
        return 'bg-amber-50 hover:bg-amber-100 border-l-4 border-l-amber-400';
      }
      return '';
    },
    [checkDuplicateReading]
  );

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        toolbar={
          <CrudTableToolbar
            onAdd={() => {
              // 독서 기록 추가 다이얼로그 열기
            }}
            addButtonText="독서 기록 추가"
            extraActions={
              <Button
                variant="outline"
                onClick={() => {
                  // 도서 목록 관리 페이지로 이동
                  window.location.href = '/culture/reading/books';
                }}
              >
                도서 목록 관리
              </Button>
            }
          />
        }
        // 테이블 행 스타일 적용
        tableProps={{
          rowProps: (row) => ({
            className: getRowClassName(row),
            // 중복 독서인 경우 툴팁 추가
            title: checkDuplicateReading(row)
              ? '이 사용자가 이 책을 여러 번 읽었습니다.'
              : undefined,
          }),
        }}
      />

      {/* 범례 표시 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-50 border border-amber-400 rounded" />
          <span>중복 독서 (같은 사람이 같은 책을 여러 번 읽음)</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. 구현 단계별 가이드

### 7.1 구현 순서

#### Phase 1: 기본 설정 (Day 1)
1. **환경 변수 설정**
   ```bash
   # .env.local에 추가
   ALADIN_TTB_KEY=your_aladin_api_key
   ```

2. **데이터베이스 마이그레이션 생성**
   ```bash
   # 새 마이그레이션 파일 생성
   touch supabase/migrations/$(date +%Y%m%d_%H%M%S)_create_reading_tables.sql
   ```

3. **타입 정의 파일 생성**
   - `/src/types/reading.ts` 작성

#### Phase 2: Server Actions 구현 (Day 2)
1. **알라딘 API 연동**
   - `/src/actions/aladin.ts` 구현
   - API 응답 타입 매핑
   - 에러 처리

2. **도서 관리 Actions**
   - `/src/actions/books.ts` 구현
   - CRUD 작업 구현

3. **독서 기록 Actions**
   - `/src/actions/reading.ts` 구현
   - 관계 데이터 조회 최적화

#### Phase 3: UI 컴포넌트 구현 (Day 3-4)
1. **공통 컴포넌트 활용**
   - DataTable 적용
   - EditableCell 활용
   - CrudTableToolbar 적용

2. **커스텀 컴포넌트 개발**
   - BookSearchDialog
   - BookImageUpload
   - BookManualInput

3. **메인 페이지 구현**
   - reading-table.tsx
   - reading-columns.tsx
   - page.tsx

#### Phase 4: 통합 테스트 (Day 5)
1. **기능 테스트**
   - 알라딘 API 검색
   - 도서 CRUD
   - 독서 기록 CRUD

2. **엣지 케이스 처리**
   - 네트워크 오류
   - 중복 데이터
   - 권한 검증

### 7.2 중요 구현 포인트

#### 메모이제이션 적용
```typescript
// 무한 렌더링 방지
const columns = useMemo(
  () => getReadingColumns(handleUpdate),
  [handleUpdate]
);

const data = useMemo(
  () => readingRecords,
  [readingRecords]
);
```

#### Server Actions 패턴
```typescript
// ❌ 잘못된 예시
export const { getAll, create } = createCrudActions('reading_records');

// ✅ 올바른 예시
const crudActions = createCrudActions<ReadingRecord>('reading_records');

export async function getReadingRecords() {
  return crudActions.getAll();
}
```

#### 관심사 분리
```typescript
// hooks/useReadingData.ts - 데이터 관리
export function useReadingData() {
  // 데이터 페칭 로직
}

// hooks/useReadingActions.ts - 액션 관리
export function useReadingActions() {
  // CRUD 핸들러
}

// reading-table.tsx - UI 오케스트레이션
export function ReadingTable() {
  const data = useReadingData();
  const actions = useReadingActions();
  // UI 렌더링
}
```

---

## 8. 알라딘 API 연동

### 8.1 API 키 발급
1. 알라딘 API 센터 가입 (https://www.aladin.co.kr/ttb/wblog_manage.aspx)
2. TTBKey 발급
3. `.env.local`에 키 저장

### 8.2 API 사용 제한
- 초당 1회 호출 제한
- 한 페이지 최대 50개, 총 200개까지 조회
- 캐싱 전략 필요

### 8.3 에러 처리
```typescript
// API 호출 실패 시 로컬 DB 검색
try {
  const aladinResults = await searchBooksFromAladin(query);
  return aladinResults;
} catch (error) {
  // 로컬 DB에서 검색
  const localResults = await searchBooksFromLocal(query);
  return localResults;
}
```

---

## 9. 테스트 계획

### 9.1 단위 테스트
- Server Actions 테스트
- 유틸리티 함수 테스트
- Zod 스키마 검증 테스트

### 9.2 통합 테스트
- 알라딘 API 연동 테스트
- CRUD 작업 플로우 테스트
- 권한 검증 테스트

### 9.3 E2E 테스트 (Playwright)
```typescript
test('독서 기록 추가 플로우', async ({ page }) => {
  await page.goto('/culture/reading');

  // 독서 기록 추가 버튼 클릭
  await page.click('button:has-text("독서 기록 추가")');

  // 도서 검색
  await page.fill('input[placeholder="도서명을 입력하세요"]', '클린코드');
  await page.click('button:has-text("검색")');

  // 도서 선택
  await page.click('text=클린코드');
  await page.click('button:has-text("선택한 도서 추가")');

  // 독서자 선택
  await page.selectOption('select[name="user_id"]', 'user-1');

  // 독서완료일 입력
  await page.fill('input[type="date"]', '2025-01-20');

  // 저장
  await page.click('button:has-text("저장")');

  // 확인
  await expect(page.locator('text=클린코드')).toBeVisible();
});
```

---

## 10. 배포 및 운영

### 10.1 배포 체크리스트
- [ ] 환경 변수 설정 확인
- [ ] 데이터베이스 마이그레이션 실행
- [ ] RLS 정책 적용
- [ ] 타입 생성 (`pnpm types:gen`)
- [ ] 빌드 테스트 (`pnpm build`)

### 10.2 모니터링
- Supabase 대시보드에서 API 사용량 모니터링
- 알라딘 API 호출 횟수 추적
- 에러 로그 수집

### 10.3 유지보수
- 정기적인 도서 정보 업데이트
- 중복 도서 데이터 정리
- 독서 통계 리포트 생성

---

## 부록

### A. 타입 정의 (`/src/types/reading.ts`)
```typescript
// 도서 타입
export interface Book {
  id: string;
  isbn?: string;
  isbn13?: string;
  aladin_item_id?: string;
  title: string;
  author?: string;
  publisher?: string;
  page_count?: number;
  category?: string;
  cover_url?: string;
  cover_image_path?: string;
  description?: string;
  pub_date?: string;
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
  completed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by: string;

  // 관계 데이터
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
  author?: string;
  publisher?: string;
  page_count?: number;
  category?: string;
  cover_url?: string;
  cover_image_path?: string;
  description?: string;
  isbn?: string;
  isbn13?: string;
  pub_date?: string;
}

export interface ReadingFormData {
  book_id: string;
  user_id: string;
  company_id: string;
  department_id: string;
  completed_date?: string;
  notes?: string;
}
```

### B. 사이드바 메뉴 추가
```typescript
// /src/components/layout/sidebar.tsx에 추가

// 조직문화 메뉴 추가
{
  title: '조직문화',
  icon: Users2,
  items: [
    {
      title: '독서관리',
      href: '/culture/reading',
      icon: BookOpen,
    },
    {
      title: '도서 목록',
      href: '/culture/reading/books',
      icon: Library,
    },
  ],
}
```

### C. 필수 패키지 설치
```bash
# 이미 설치된 패키지 확인 후 필요시 설치
pnpm add date-fns
```

---

## 개발자 체크리스트

### 시작 전 확인사항
- [ ] CLAUDE.md 파일 숙지
- [ ] 프로젝트 구조 이해
- [ ] 공통 컴포넌트 사용법 확인
- [ ] Server Actions 패턴 이해

### 개발 중 확인사항
- [ ] 메모이제이션 적용 여부
- [ ] 에러 처리 구현
- [ ] 로딩 상태 처리
- [ ] 모바일 반응형 고려

### 완료 후 확인사항
- [ ] 타입 체크 통과 (`pnpm type-check`)
- [ ] ESLint 검사 통과 (`pnpm lint`)
- [ ] 빌드 성공 (`pnpm build`)
- [ ] 기능 테스트 완료

---

**참고**: 이 PRD는 주니어 개발자도 쉽게 따라할 수 있도록 상세하게 작성되었습니다. 각 단계별로 구현하면서 막히는 부분이 있다면 기존 코드(예: employees 페이지)를 참고하시기 바랍니다.