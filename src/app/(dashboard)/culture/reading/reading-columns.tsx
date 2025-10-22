'use client';

import * as React from 'react';
import Image from 'next/image';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUpDown, BookOpen } from 'lucide-react';
import { EditableCell } from '@/components/common/editable-cell';
import { EditableDateCell } from '@/components/common/editable-date-cell';
import { EditableSelectCell } from '@/components/common/editable-select-cell';
import type { ReadingRecord, Book, UserWithDetails, Company, Department } from '@/types';
import { cn } from '@/lib/utils';

interface GetReadingColumnsParams {
  handleUpdateCell: (rowIndex: number, columnId: string, value: unknown) => Promise<void>;
  handleUpdateNewRow?: (field: string, value: unknown) => void;
  allRecords: ReadingRecord[];
  books: Book[];
  users: UserWithDetails[];
  companies: Company[];
  departments: Department[];
  onOpenBookDialog?: () => void; // 도서 고급 검색 다이얼로그 열기
}

/**
 * 독서 기록 테이블 컬럼 정의
 * - 중복 독서 감지 및 시각적 표시
 * - 인라인 편집 지원
 * - 정렬 기능
 */
export const getReadingColumns = ({
  handleUpdateCell,
  handleUpdateNewRow,
  allRecords,
  books,
  users,
  companies,
  departments,
  onOpenBookDialog,
}: GetReadingColumnsParams): ColumnDef<ReadingRecord>[] => [
  // 체크박스 (선택)
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="모두 선택"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="행 선택"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // 도서 (편집 가능)
  {
    accessorKey: 'book_id',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="w-full justify-start"
      >
        도서
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const bookId = getValue<string>();
      const book = books.find((b) => b.id === bookId);

      // 편집 모드 (새 행)
      if (isNewRow) {
        return (
          <EditableSelectCell
            value={bookId || ''}
            rowIndex={row.index}
            columnId="book_id"
            type="combobox"
            options={books.map((b) => ({
              id: b.id,
              name: `${b.title} - ${b.author || '저자 미상'}`,
            }))}
            onUpdate={handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            placeholder="도서 선택..."
            searchPlaceholder="도서 검색..."
            onAdvancedSearch={onOpenBookDialog}
            advancedSearchLabel="🔍 알라딘 검색 (새 도서 추가)"
          />
        );
      }

      // 읽기 모드
      if (!book) return <span className="text-muted-foreground">-</span>;
      const coverUrl = book.cover_url || book.cover_image_path;

      return (
        <div className="flex items-center gap-3 min-w-[250px]">
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
            <p className="font-medium text-sm line-clamp-2">{book.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {book.author || '-'} | {book.publisher || '-'}
            </p>
          </div>
        </div>
      );
    },
  },

  // 카테고리
  {
    accessorKey: 'book.category',
    header: '카테고리',
    cell: ({ row }) => {
      const category = row.original.book?.category;
      if (!category) return <span className="text-muted-foreground">-</span>;

      return (
        <Badge variant="outline" className="font-normal">
          {category}
        </Badge>
      );
    },
  },

  // 페이지 수
  {
    accessorKey: 'book.page_count',
    header: '페이지',
    cell: ({ row }) => {
      const pageCount = row.original.book?.page_count;
      if (!pageCount) return <span className="text-muted-foreground">-</span>;

      return <span className="text-sm">{pageCount.toLocaleString()}쪽</span>;
    },
  },

  // 독서자 (편집 가능, 중복 감지 포함)
  {
    accessorKey: 'user_id',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        독서자
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const userId = getValue<string>();
      const user = users.find((u) => u.id === userId);

      // 편집 모드 (새 행)
      if (isNewRow) {
        return (
          <EditableSelectCell
            value={userId || ''}
            rowIndex={row.index}
            columnId="user_id"
            options={users.map((u) => ({
              id: u.id,
              name: `${u.name} (${u.email})`,
            }))}
            onUpdate={handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            placeholder="독서자 선택..."
          />
        );
      }

      // 읽기 모드
      if (!user) return <span className="text-muted-foreground">-</span>;

      // 중복 독서 감지
      const duplicateReadings = allRecords.filter(
        (record) =>
          record.user_id === userId &&
          record.book_id === row.original.book_id &&
          record.id !== row.original.id
      );

      const readCount = duplicateReadings.length;
      const isDuplicate = readCount > 0;

      return (
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', isDuplicate && 'font-medium')}>
            {user.name}
          </span>
          {isDuplicate && (
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-700 border-amber-300 text-xs"
            >
              <BookOpen className="w-3 h-3 mr-1" />
              {readCount + 1}회
            </Badge>
          )}
        </div>
      );
    },
  },

  // 회사 (편집 가능)
  {
    accessorKey: 'company_id',
    header: '회사',
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const companyId = getValue<string>();
      const company = companies.find((c) => c.id === companyId);

      // 편집 모드 (새 행)
      if (isNewRow) {
        return (
          <EditableSelectCell
            value={companyId || ''}
            rowIndex={row.index}
            columnId="company_id"
            options={companies.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
            onUpdate={handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            placeholder="회사 선택..."
          />
        );
      }

      // 읽기 모드
      return company ? (
        <span className="text-sm">{company.name}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },

  // 부서 (편집 가능)
  {
    accessorKey: 'department_id',
    header: '부서',
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const deptId = getValue<string | null>();
      const dept = deptId ? departments.find((d) => d.id === deptId) : null;

      // 편집 모드 (새 행)
      if (isNewRow) {
        return (
          <EditableSelectCell
            value={deptId || ''}
            rowIndex={row.index}
            columnId="department_id"
            options={[
              { id: '', name: '선택 안 함' },
              ...departments.map((d) => ({
                id: d.id,
                name: d.name,
              })),
            ]}
            onUpdate={handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value || null) : handleUpdateCell}
            className={isNewRow ? 'border border-primary/50' : ''}
            placeholder="부서 선택..."
          />
        );
      }

      // 읽기 모드
      return dept ? (
        <span className="text-sm">{dept.name}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },

  // 완독일 (편집 가능)
  {
    accessorKey: 'completed_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        완독일
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const completedDate = getValue<string>() || '';

      return (
        <EditableDateCell
          value={completedDate}
          rowIndex={row.index}
          columnId="completed_date"
          onUpdate={isNewRow && handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value) : handleUpdateCell}
          className={isNewRow ? 'border border-primary/50' : ''}
        />
      );
    },
  },

  // 독서 노트 (편집 가능)
  {
    accessorKey: 'notes',
    header: '독서 노트',
    cell: ({ row, getValue }) => {
      const isNewRow = row.original.id?.startsWith('temp-');
      const notes = getValue<string>() || '';

      return (
        <EditableCell
          value={notes}
          rowIndex={row.index}
          columnId="notes"
          onUpdate={isNewRow && handleUpdateNewRow ? async (idx, field, value) => handleUpdateNewRow(field, value || null) : handleUpdateCell}
          className={cn('min-w-[200px]', isNewRow && 'border border-primary/50')}
        />
      );
    },
  },
];

/**
 * 행 스타일 결정 함수
 * - 중복 독서 시 배경색 변경
 */
export const getRowClassName = (
  record: ReadingRecord,
  allRecords: ReadingRecord[]
): string => {
  // 중복 독서 감지
  const duplicateReadings = allRecords.filter(
    (r) =>
      r.user_id === record.user_id &&
      r.book_id === record.book_id &&
      r.id !== record.id
  );

  if (duplicateReadings.length > 0) {
    return 'bg-amber-50 border-l-4 border-l-amber-400';
  }

  return '';
};
