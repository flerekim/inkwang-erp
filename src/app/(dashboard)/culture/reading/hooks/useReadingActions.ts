import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateReadingRecord, deleteReadingRecords, createReadingRecord } from '@/actions/reading';
import { useTableActions } from '@/hooks/use-table-actions';
import type { ReadingRecord, Book } from '@/types';
import type { UseTableStateReturn } from '@/hooks/use-table-state';

/**
 * useReadingActions Hook
 *
 * 독서 기록 테이블의 CRUD 작업과 비즈니스 로직 관리
 *
 * @param tableState - useTableState에서 반환된 상태 객체
 * @param books - 도서 목록 (새 독서 기록 추가 시 기본값 설정용)
 * @param currentUserId - 현재 로그인한 사용자 ID
 */
export function useReadingActions(
  tableState: UseTableStateReturn<ReadingRecord>,
  books: Book[],
  currentUserId: string
) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    tableData,
    setTableData,
    rowSelection,
    setRowSelection,
    newRowData,
    setNewRowData,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  } = tableState;

  // createAction 래퍼: Partial<ReadingRecord>를 ReadingFormData로 변환
  const createReadingWrapper = useCallback(
    async (data: Partial<ReadingRecord>) => {
      if (!data.book_id || !data.user_id || !data.completed_date) {
        return { error: '도서, 독서자, 완독일은 필수 입력 항목입니다.' };
      }

      return await createReadingRecord({
        book_id: data.book_id,
        user_id: data.user_id,
        company_id: data.company_id || '',
        department_id: data.department_id || undefined,
        completed_date: data.completed_date,
        notes: data.notes || undefined,
      });
    },
    []
  );

  // deleteAction 래퍼: 여러 ID를 한 번에 삭제
  const deleteReadingWrapper = useCallback(async (id: string) => {
    return await deleteReadingRecords([id]);
  }, []);

  // CRUD 액션 훅 사용
  const {
    handleUpdateCell,
    handleDeleteSelected: deleteSelectedAction,
    handleSaveNewRow: saveNewRowAction,
  } = useTableActions<ReadingRecord, Parameters<typeof createReadingRecord>[0]>({
    tableData,
    setTableData,
    originalData: tableState.tableData,
    updateAction: updateReadingRecord as (
      id: string,
      data: Partial<ReadingRecord>
    ) => Promise<{ error?: string; success?: boolean }>,
    deleteAction: deleteReadingWrapper,
    createAction: createReadingWrapper as (
      data: Parameters<typeof createReadingRecord>[0]
    ) => Promise<
      | { error?: string; success?: boolean; data?: ReadingRecord }
      | { data: ReadingRecord; error: null }
      | { data: null; error: string }
    >,
    setIsDeleting,
    setDeleteDialogOpen,
    setIsSavingNewRow,
  });

  // 삭제 액션 래퍼 (rowSelection을 selectedIndices로 변환)
  const handleDeleteSelected = useCallback(async () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    await deleteSelectedAction(selectedIndices);
    setRowSelection({}); // 삭제 후 선택 초기화
  }, [rowSelection, deleteSelectedAction, setRowSelection]);

  // 독서 기록 추가 (인라인 방식)
  const handleAddReading = useCallback(() => {
    if (newRowData) {
      toast({
        variant: 'destructive',
        title: '추가 중인 독서 기록이 있습니다',
        description: '먼저 현재 독서 기록을 저장하거나 취소해주세요.',
      });
      return;
    }

    // 새 행 데이터 초기화 (임시 ID 사용)
    const tempId = `temp-${Date.now()}`;
    const newRow: Partial<ReadingRecord> = {
      id: tempId,
      book_id: books[0]?.id || '',
      user_id: currentUserId,
      company_id: '',
      department_id: '',
      completed_date: new Date().toISOString().split('T')[0],
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUserId,
    };

    setNewRowData(newRow);
  }, [newRowData, books, currentUserId, toast, setNewRowData]);

  // 새 행 데이터 업데이트
  const handleUpdateNewRow = useCallback(
    (field: string, value: unknown) => {
      if (!newRowData) return;
      setNewRowData({ ...newRowData, [field]: value });
    },
    [newRowData, setNewRowData]
  );

  // 새 행 저장 (useTableActions 훅 활용 + reading-specific 로직)
  const handleSaveNewRow = useCallback(async () => {
    if (!newRowData) return;

    // Reading-specific validation
    const validate = (data: Record<string, unknown>) => {
      if (!data.book_id || !data.user_id || !data.completed_date) {
        return { error: '도서, 독서자, 완독일은 필수 입력 항목입니다.' };
      }
      return true;
    };

    // useTableActions의 saveNewRowAction 호출
    const preparedData = {
      book_id: newRowData.book_id!,
      user_id: newRowData.user_id!,
      company_id: newRowData.company_id!,
      department_id: newRowData.department_id || undefined,
      completed_date: newRowData.completed_date!,
      notes: newRowData.notes || undefined,
    };

    const result = await saveNewRowAction(preparedData, validate);

    if (result.success) {
      toast({
        title: '독서 기록 추가 완료',
        description: '독서 기록이 추가되었습니다.',
      });
      setNewRowData(null);
      router.refresh();
    }
  }, [newRowData, saveNewRowAction, toast, setNewRowData, router]);

  // 새 행 취소
  const handleCancelNewRow = useCallback(() => {
    setNewRowData(null);
  }, [setNewRowData]);

  return {
    // CRUD 작업
    handleUpdateCell,
    handleDeleteSelected,
    handleAddReading,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
  };
}
