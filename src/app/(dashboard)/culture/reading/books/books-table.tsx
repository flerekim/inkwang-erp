'use client';

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { DataTable } from '@/components/common/data-table';
import { CrudTableToolbar } from '@/components/common/crud-table-toolbar';
import { ExportToExcel } from '@/components/common/export-to-excel';
import { PrintTable } from '@/components/common/print-table';
import { useToast } from '@/hooks/use-toast';
import { getBookColumns } from './book-columns';
import { updateBook, deleteBook } from '@/actions/books';
import type { Book } from '@/types/reading';
import type { RowSelectionState } from '@tanstack/react-table';

interface BooksTableProps {
  initialData: Book[];
}

/**
 * 도서 목록 관리 테이블 컴포넌트
 */
export function BooksTable({ initialData }: BooksTableProps) {
  const { toast } = useToast();
  const [data, setData] = useState<Book[]>(initialData);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeleting, setIsDeleting] = useState(false);

  // 메모이제이션된 데이터
  const memoizedData = useMemo(() => data, [data]);

  // 필드 업데이트 핸들러
  const handleUpdate = useCallback(
    async (id: string, field: string, value: string | number | null) => {
      try {
        await updateBook(id, { [field]: value });

        // 로컬 상태 업데이트
        setData((prevData) =>
          prevData.map((book) =>
            book.id === id ? { ...book, [field]: value } : book
          )
        );

        toast({
          title: '수정 완료',
          description: '도서 정보가 수정되었습니다.',
        });
      } catch (error) {
        console.error('도서 정보 수정 실패:', error);
        toast({
          title: '수정 실패',
          description:
            error instanceof Error
              ? error.message
              : '도서 정보 수정 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  // 컬럼 정의 메모이제이션
  const columns = useMemo(
    () => getBookColumns({ handleUpdate }),
    [handleUpdate]
  );

  // 선택된 행 ID 목록 계산
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((index) => memoizedData[parseInt(index)].id);
  }, [rowSelection, memoizedData]);

  // 선택된 행 삭제 핸들러
  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) {
      toast({
        title: '항목을 선택하세요',
        description: '삭제할 도서를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      // 각 도서 삭제 (독서 기록이 있으면 실패)
      for (const id of selectedIds) {
        await deleteBook(id);
      }

      // 로컬 상태 업데이트
      setData((prevData) =>
        prevData.filter((book) => !selectedIds.includes(book.id))
      );
      setRowSelection({});

      toast({
        title: '삭제 완료',
        description: `${selectedIds.length}개의 도서가 삭제되었습니다.`,
      });
    } catch (error) {
      console.error('도서 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description:
          error instanceof Error
            ? error.message
            : '도서 삭제 중 오류가 발생했습니다. 독서 기록이 있는 도서는 삭제할 수 없습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, toast]);

  // Excel 내보내기용 데이터 및 컬럼 정의
  const exportData = useMemo(() => memoizedData, [memoizedData]);

  const exportColumns = useMemo(() => [
    { key: 'title', header: '도서명' },
    { key: 'author', header: '저자' },
    { key: 'publisher', header: '출판사' },
    { key: 'isbn', header: 'ISBN', format: (value: unknown, row: Book) => row.isbn || row.isbn13 || '-' },
    { key: 'category', header: '카테고리' },
    { key: 'page_count', header: '페이지' },
    { key: 'reader_count', header: '독서자수' },
    { key: 'pub_date', header: '출판일' },
    { key: 'is_manual_entry', header: '등록구분', format: (value: unknown) => value ? '수동' : '알라딘' },
  ], []);


  return (
    <div className="space-y-4">
      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={memoizedData}
        searchKey="title"
        searchPlaceholder="도서명, 저자, 출판사로 검색..."
        pageSize={10}
        enableRowSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        enableFuzzyFilter={true}
        enableColumnVisibility={true}
        enablePageSizeSelection={true}
        enablePageJump={true}
        toolbar={
          <CrudTableToolbar
            selectedCount={selectedIds.length}
            isDeleting={isDeleting}
            onDelete={handleDelete}
            exportButton={
              <ExportToExcel
                data={exportData}
                columns={exportColumns}
                filename="도서목록"
              />
            }
            printButton={
              <PrintTable
                data={exportData}
                columns={exportColumns}
                title="도서 목록"
              />
            }
          />
        }
      />

      {/* 안내 문구 */}
      <div className="text-sm text-muted-foreground">
        <p>💡 도서는 독서 기록 추가 시 자동으로 등록됩니다.</p>
        <p className="mt-1">⚠️ 독서 기록이 있는 도서는 삭제할 수 없습니다.</p>
      </div>
    </div>
  );
}
