'use client';

import * as React from 'react';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Users } from 'lucide-react';
import { EditableCell } from '@/components/common/editable-cell';
import type { Book } from '@/types/reading';

interface GetBookColumnsParams {
  handleUpdate: (id: string, field: string, value: string | number | null) => Promise<void>;
}

/**
 * 도서 목록 테이블 컬럼 정의
 */
export const getBookColumns = ({
  handleUpdate,
}: GetBookColumnsParams): ColumnDef<Book>[] => [
  // 표지 및 제목
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="w-full justify-start"
      >
        도서명
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, table }) => {
      const book = row.original;
      const rowIndex = row.index;
      const coverUrl = book.cover_url || book.cover_image_path;

      return (
        <div className="flex items-center gap-3 min-w-[300px]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={book.title}
              width={48}
              height={64}
              className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
              표지<br />없음
            </div>
          )}
          <div className="flex-1 min-w-0">
            <EditableCell
              value={book.title}
              rowIndex={rowIndex}
              columnId="title"
              onUpdate={async (rowIndex, columnId, value) => {
                const id = table.getRow(rowIndex.toString()).original.id;
                await handleUpdate(id, columnId, value);
              }}
              className="font-medium"
            />
            {book.is_manual_entry && (
              <Badge variant="outline" className="mt-1 text-xs">
                수동 등록
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },

  // 저자
  {
    accessorKey: 'author',
    header: '저자',
    cell: ({ row, table }) => {
      const rowIndex = row.index;
      const author = row.original.author || '';

      return (
        <EditableCell
          value={author}
          rowIndex={rowIndex}
          columnId="author"
          onUpdate={async (rowIndex, columnId, value) => {
            const id = table.getRow(rowIndex.toString()).original.id;
            await handleUpdate(id, columnId, value || null);
          }}
        />
      );
    },
  },

  // 출판사
  {
    accessorKey: 'publisher',
    header: '출판사',
    cell: ({ row, table }) => {
      const rowIndex = row.index;
      const publisher = row.original.publisher || '';

      return (
        <EditableCell
          value={publisher}
          rowIndex={rowIndex}
          columnId="publisher"
          onUpdate={async (rowIndex, columnId, value) => {
            const id = table.getRow(rowIndex.toString()).original.id;
            await handleUpdate(id, columnId, value || null);
          }}
        />
      );
    },
  },

  // ISBN
  {
    accessorKey: 'isbn',
    header: 'ISBN',
    cell: ({ row }) => {
      const isbn = row.original.isbn || row.original.isbn13;
      return isbn ? (
        <span className="text-sm font-mono">{isbn}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },

  // 카테고리
  {
    accessorKey: 'category',
    header: '카테고리',
    cell: ({ row, table }) => {
      const rowIndex = row.index;
      const category = row.original.category || '';

      return (
        <EditableCell
          value={category}
          rowIndex={rowIndex}
          columnId="category"
          onUpdate={async (rowIndex, columnId, value) => {
            const id = table.getRow(rowIndex.toString()).original.id;
            await handleUpdate(id, columnId, value || null);
          }}
        />
      );
    },
  },

  // 페이지 수
  {
    accessorKey: 'page_count',
    header: '페이지',
    cell: ({ row }) => {
      const pageCount = row.original.page_count;
      return pageCount ? (
        <span className="text-sm">{pageCount.toLocaleString()}쪽</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },

  // 독서자 수
  {
    accessorKey: 'reader_count',
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
      const count = row.original.reader_count;

      if (count === 0) {
        return <span className="text-muted-foreground">없음</span>;
      }

      return (
        <Badge variant="secondary" className="gap-1">
          <Users className="w-3 h-3" />
          {count}명
        </Badge>
      );
    },
  },

  // 출판일
  {
    accessorKey: 'pub_date',
    header: '출판일',
    cell: ({ row }) => {
      const pubDate = row.original.pub_date;
      return pubDate ? (
        <span className="text-sm">{pubDate}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
];
