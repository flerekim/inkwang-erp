import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

/**
 * 테이블 CRUD 액션 Props
 */
export interface UseTableActionsProps<T, CreateData = Partial<T>> {
  /** 테이블 데이터 */
  tableData: T[];
  /** 테이블 데이터 setter */
  setTableData: React.Dispatch<React.SetStateAction<T[]>>;
  /** 원본 데이터 (롤백용) */
  originalData: T[];

  /** Server Action: 업데이트 */
  updateAction: (id: string, data: Partial<T>) => Promise<{ error?: string; success?: boolean }>;
  /** Server Action: 삭제 */
  deleteAction: (id: string) => Promise<{ error?: string; success?: boolean }>;
  /**
   * Server Action: 생성
   * ActionResult<T> 형식도 지원 ({ data: T; error: null } | { data: null; error: string })
   */
  createAction: (data: CreateData) => Promise<
    | { error?: string; success?: boolean; data?: T }
    | { data: T; error: null }
    | { data: null; error: string }
  >;

  /** 삭제 상태 setter */
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>;
  /** 삭제 다이얼로그 상태 setter */
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  /** 새 행 저장 상태 setter */
  setIsSavingNewRow: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 테이블 CRUD 액션 훅의 반환 타입
 */
export interface UseTableActionsReturn {
  /** 셀 업데이트 핸들러 (낙관적 업데이트 + 서버 동기화) */
  handleUpdateCell: (rowIndex: number, columnId: string, value: string) => Promise<void>;
  /** 선택된 행 삭제 핸들러 */
  handleDeleteSelected: (selectedIndices: number[]) => Promise<void>;
  /** 새 행 저장 핸들러 */
  handleSaveNewRow: (
    newRowData: Record<string, unknown>,
    validate: (data: Record<string, unknown>) => boolean | { error: string }
  ) => Promise<{ error?: string; success?: boolean }>;
}

/**
 * 테이블 CRUD 액션 관리 훅
 *
 * @description
 * 모든 테이블 컴포넌트에서 반복되는 CRUD 핸들러 로직을 통합한 훅입니다.
 * - 낙관적 업데이트 + 에러 롤백
 * - 일관된 토스트 메시지
 * - router.refresh() 자동 호출
 *
 * @example
 * ```tsx
 * function EmployeesTable() {
 *   const { handleUpdateCell, handleDeleteSelected, handleSaveNewRow } = useTableActions({
 *     tableData,
 *     setTableData,
 *     originalData: data,
 *     updateAction: updateEmployee,
 *     deleteAction: deleteEmployee,
 *     createAction: createEmployee,
 *     setIsDeleting,
 *     setDeleteDialogOpen,
 *     setIsSavingNewRow,
 *   });
 *
 *   // ... 나머지 로직
 * }
 * ```
 *
 * @template T - 테이블 행 데이터 타입 (반드시 id 필드 포함)
 * @param props - CRUD 액션 설정
 * @returns CRUD 핸들러 함수들
 */
export function useTableActions<T extends { id: string }, CreateData = Partial<T>>({
  tableData,
  setTableData,
  originalData,
  updateAction,
  deleteAction,
  createAction,
  setIsDeleting,
  setDeleteDialogOpen,
  setIsSavingNewRow,
}: UseTableActionsProps<T, CreateData>): UseTableActionsReturn {
  const { toast } = useToast();
  const router = useRouter();

  /**
   * 셀 업데이트 핸들러
   * - 낙관적 업데이트: 즉시 UI 반영
   * - 서버 업데이트 실패 시: 원본 데이터로 롤백
   */
  const handleUpdateCell = useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const row = tableData[rowIndex];
      if (!row) return;

      // 낙관적 업데이트
      setTableData((old) =>
        old.map((r, idx) => (idx === rowIndex ? { ...r, [columnId]: value } : r))
      );

      // 서버 업데이트
      try {
        const result = await updateAction(row.id, { [columnId]: value } as Partial<T>);

        if (result.error) {
          // 롤백
          setTableData(originalData);
          toast({
            variant: 'destructive',
            title: '수정 실패',
            description: result.error,
          });
          throw new Error(result.error);
        }

        toast({
          title: '수정 완료',
          description: '정보가 성공적으로 수정되었습니다.',
        });

        router.refresh();
      } catch (error) {
        throw error;
      }
    },
    [tableData, originalData, updateAction, setTableData, toast, router]
  );

  /**
   * 선택된 행 삭제 핸들러
   * - 여러 행 동시 삭제 지원 (Promise.allSettled)
   * - 부분 실패 처리: 성공/실패 건수 피드백
   */
  const handleDeleteSelected = useCallback(
    async (selectedIndices: number[]) => {
      const selectedRows = selectedIndices.map((index) => tableData[index]).filter(Boolean);

      if (selectedRows.length === 0) {
        toast({
          variant: 'destructive',
          title: '선택 오류',
          description: '삭제할 항목을 선택해주세요.',
        });
        return;
      }

      setIsDeleting(true);

      try {
        // 각 행 삭제 요청
        const results = await Promise.allSettled(selectedRows.map((row) => deleteAction(row.id)));

        // 실패한 요청 확인
        const failures = results.filter(
          (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
        );
        const successes = results.filter((r) => r.status === 'fulfilled' && r.value.success);

        if (failures.length > 0) {
          toast({
            variant: 'destructive',
            title: '일부 삭제 실패',
            description: `${successes.length}개 삭제 성공, ${failures.length}개 실패`,
          });
        } else {
          toast({
            title: '삭제 완료',
            description: `${selectedRows.length}개 항목이 삭제되었습니다.`,
          });
        }

        router.refresh();
      } catch (error) {
        toast({
          variant: 'destructive',
          title: '삭제 실패',
          description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        });
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    },
    [tableData, deleteAction, toast, router, setIsDeleting, setDeleteDialogOpen]
  );

  /**
   * 새 행 저장 핸들러
   * - 컴포넌트에서 제공하는 validate 함수로 필수 필드 검증
   * - 생성 성공 시 router.refresh() 호출
   */
  const handleSaveNewRow = useCallback(
    async (
      newRowData: Record<string, unknown>,
      validate: (data: Record<string, unknown>) => boolean | { error: string }
    ): Promise<{ error?: string; success?: boolean }> => {
      // 필수 필드 검증
      const validationResult = validate(newRowData);
      if (typeof validationResult === 'object' && validationResult.error) {
        toast({
          variant: 'destructive',
          title: '입력 오류',
          description: validationResult.error,
        });
        return { error: validationResult.error };
      }

      setIsSavingNewRow(true);

      try {
        const result = await createAction(newRowData as CreateData);

        // ActionResult 형식 처리: { data: T; error: null } | { data: null; error: string }
        const error = result.error === null ? undefined : result.error;

        if (error) {
          toast({
            variant: 'destructive',
            title: '추가 실패',
            description: error,
          });
          return { error };
        }

        toast({
          title: '추가 완료',
          description: '새로운 항목이 추가되었습니다.',
        });

        router.refresh();
        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
        toast({
          variant: 'destructive',
          title: '추가 실패',
          description: errorMessage,
        });
        return { error: errorMessage };
      } finally {
        setIsSavingNewRow(false);
      }
    },
    [createAction, toast, router, setIsSavingNewRow]
  );

  return {
    handleUpdateCell,
    handleDeleteSelected,
    handleSaveNewRow,
  };
}
