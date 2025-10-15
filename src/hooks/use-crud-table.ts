/**
 * CRUD 테이블 공통 로직 훅 (React 19 useOptimistic 통합)
 *
 * 이 훅은 모든 CRUD 테이블에서 공통으로 사용하는 로직을 추상화합니다:
 * - 새 행 추가/저장/취소 (Escape 키로 취소 가능)
 * - 기존 행 수정/삭제 (낙관적 업데이트)
 * - 정렬/필터링
 * - 드래그앤드롭 순서 변경
 *
 * @example
 * ```tsx
 * const crud = useCrudTable({
 *   data: companies,
 *   actions: {
 *     create: createCompany,
 *     update: updateCompany,
 *     delete: deleteCompany,
 *     reorder: reorderCompanies,
 *   },
 *   defaultValues: { name: '', business_number: '' },
 *   requiredFields: ['name'],
 * });
 * ```
 *
 * @features
 * - Escape 키: 새 행 추가 취소 (document 레벨 리스너)
 * - 임시 ID 방어: NEW_ROW_ID를 가진 행은 삭제 방지
 * - 낙관적 업데이트: 즉각적인 UI 반응, 에러 시 자동 롤백
 */

'use client';

import * as React from 'react';
import { useOptimistic, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  BaseEntity,
  CrudTableConfig,
  UseCrudTableReturn,
} from '@/types/table';

// 새 행 임시 ID (모든 테이블에서 공통으로 사용)
export const NEW_ROW_ID = 'new-row-temp-id';

/**
 * 낙관적 업데이트 액션 타입
 */
type OptimisticAction<T> =
  | { type: 'update'; id: string; updates: Partial<T> }
  | { type: 'delete'; ids: string[] }
  | { type: 'create'; item: T };

/**
 * 낙관적 업데이트 리듀서
 */
function optimisticReducer<T extends BaseEntity>(
  state: T[],
  action: OptimisticAction<T>
): T[] {
  switch (action.type) {
    case 'update':
      return state.map((item) =>
        item.id === action.id ? { ...item, ...action.updates } : item
      );
    case 'delete':
      return state.filter((item) => !action.ids.includes(item.id));
    case 'create':
      return [action.item, ...state];
    default:
      return state;
  }
}

/**
 * CRUD 테이블 훅
 */
export function useCrudTable<T extends BaseEntity>(
  config: CrudTableConfig<T>
): UseCrudTableReturn<T> {
  const {
    data,
    actions,
    defaultValues,
    requiredFields,
    requiredFieldsMessage = '필수 입력 항목을 확인해주세요.',
    createSuccessMessage = '새로운 항목이 추가되었습니다.',
    updateSuccessMessage = '정보가 성공적으로 수정되었습니다.',
  } = config;

  const { toast } = useToast();

  // ===== 낙관적 업데이트 =====
  const [, startTransition] = useTransition();
  const [optimisticData, setOptimisticData] = useOptimistic(
    data,
    optimisticReducer<T>
  );

  // ===== 상태 관리 =====
  const [newRow, setNewRow] = React.useState<Partial<T> | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [customFilters, setCustomFilters] = React.useState<Record<string, string[]>>({});
  const [customSort, setCustomSort] = React.useState<{
    column: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // ===== 새 행 관리 =====

  /**
   * 새 행 추가 시작
   */
  const handleAddRow = React.useCallback(() => {
    if (newRow) {
      toast({
        variant: 'destructive',
        title: '진행 중인 작업이 있습니다',
        description: '현재 추가 중인 행을 먼저 저장하거나 취소해주세요.',
      });
      return;
    }

    const tempNewRow: Partial<T> & { id: string } = {
      id: NEW_ROW_ID,
      ...defaultValues,
    };

    setNewRow(tempNewRow);
    setEditingRowId(NEW_ROW_ID);
  }, [newRow, defaultValues, toast]);

  /**
   * 새 행 필드 업데이트
   */
  const handleUpdateNewRow = React.useCallback(
    (field: string, value: string | number) => {
      if (!newRow) return;
      setNewRow({ ...newRow, [field]: value });
    },
    [newRow]
  );

  /**
   * 새 행 저장
   */
  const handleSaveNewRow = React.useCallback(async () => {
    if (!newRow) return;

    // 필수 필드 검증
    const missingFields = requiredFields.filter((field) => {
      const value = newRow[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: '필수 정보 누락',
        description: requiredFieldsMessage,
      });
      return;
    }

    setIsSaving(true);

    try {
      // id, created_at, updated_at 제거 (DB에서 자동 생성)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, ...dataToCreate } = newRow;

      console.log('[use-crud-table] Creating with data:', dataToCreate);

      const result = await actions.create(dataToCreate as Omit<T, 'id' | 'created_at' | 'updated_at'>);

      console.log('[use-crud-table] Create result:', result);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '저장 실패',
          description: result.error,
        });
      } else {
        // 낙관적 업데이트: 생성된 데이터를 즉시 UI에 반영
        if (result.data) {
          startTransition(() => {
            setOptimisticData({ type: 'create', item: result.data as T });
          });
        }

        toast({
          title: '저장 완료',
          description: createSuccessMessage,
        });
        setNewRow(null);
        setEditingRowId(null);
        // Server Action의 revalidatePath()가 자동으로 데이터 갱신
      }
    } catch (error) {
      console.error('[use-crud-table] Create error:', error);
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setIsSaving(false);
    }
  }, [newRow, requiredFields, requiredFieldsMessage, actions, toast, createSuccessMessage, setOptimisticData, startTransition]);

  /**
   * 새 행 취소
   */
  const handleCancelNewRow = React.useCallback(() => {
    setNewRow(null);
    setEditingRowId(null);
  }, []);

  /**
   * Escape 키로 새 행 취소
   */
  React.useEffect(() => {
    if (!newRow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelNewRow();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newRow, handleCancelNewRow]);

  // ===== 기존 행 관리 =====

  /**
   * 셀 저장 핸들러 (낙관적 업데이트 적용)
   */
  const handleSave = React.useCallback(
    async (id: string, field: string, value: string): Promise<{ error?: string }> => {
      // 새 행인 경우
      if (id === NEW_ROW_ID) {
        handleUpdateNewRow(field, value);
        return {};
      }

      // startTransition 내부에서 낙관적 업데이트 실행
      startTransition(() => {
        // 낙관적 업데이트: 즉시 UI 반영
        setOptimisticData({ type: 'update', id, updates: { [field]: value } as Partial<T> });
      });

      // 서버 요청
      const result = await actions.update(id, { [field]: value } as Partial<Omit<T, 'id' | 'created_at'>>);

      if (result.error) {
        // 에러 시 React가 자동으로 원래 값으로 롤백
        toast({
          variant: 'destructive',
          title: '수정 실패',
          description: result.error,
        });
        return { error: result.error };
      } else {
        toast({
          title: '수정 완료',
          description: updateSuccessMessage,
        });
        // router.refresh() 제거 - Server Action의 revalidatePath()가 자동으로 데이터 갱신
        return {};
      }
    },
    [handleUpdateNewRow, actions, toast, updateSuccessMessage, setOptimisticData, startTransition]
  );

  /**
   * 선택된 행 삭제 (낙관적 업데이트 적용)
   */
  const handleDeleteRows = React.useCallback(
    async (rows: T[]) => {
      // 임시 ID를 가진 행 필터링 (새 행 추가 중 발생한 임시 데이터)
      const tempRows = rows.filter((row) => row.id === NEW_ROW_ID);
      const validRows = rows.filter((row) => row.id !== NEW_ROW_ID);

      // 임시 행이 포함되어 있으면 사용자에게 알림
      if (tempRows.length > 0) {
        toast({
          variant: 'destructive',
          title: '임시 데이터는 삭제할 수 없습니다',
          description: '추가 중인 행은 먼저 저장하거나 취소해주세요.',
        });
      }

      if (validRows.length === 0) {
        console.warn('[useCrudTable] No valid rows to delete (all are temporary)');
        return;
      }

      const ids = validRows.map((row) => row.id);

      // startTransition 내부에서 낙관적 업데이트 실행
      startTransition(() => {
        // 낙관적 업데이트: 즉시 UI에서 제거
        setOptimisticData({ type: 'delete', ids });
      });

      // 서버 요청
      try {
        for (const row of validRows) {
          const result = await actions.delete(row.id);
          if (result.error) {
            throw new Error(result.error);
          }
        }
        // Server Action의 revalidatePath()가 자동으로 데이터 갱신
      } catch (error) {
        // 에러 시 React가 자동으로 롤백
        throw error;
      }
    },
    [actions, setOptimisticData, startTransition, toast]
  );

  /**
   * 드래그앤드롭 순서 변경
   */
  const handleReorder = React.useCallback(
    async (reorderedData: T[]) => {
      if (!actions.reorder) return;

      const items = reorderedData.map((item) => ({
        id: item.id,
        sort_order: 'sort_order' in item ? (item.sort_order as number) : 0,
      }));

      const result = await actions.reorder(items);

      if (result.error) {
        throw new Error(result.error);
      }
    },
    [actions]
  );

  // ===== 필터링 =====

  /**
   * 필터 적용된 데이터 (낙관적 데이터 사용)
   */
  const filteredData = React.useMemo(() => {
    let result = [...optimisticData];

    // 커스텀 필터 적용
    Object.entries(customFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter((row) => {
          const rowData = row as Record<string, unknown>;
          const rowValue = rowData[key];
          return values.includes(String(rowValue));
        });
      }
    });

    return result;
  }, [optimisticData, customFilters]);

  // ===== 정렬 =====

  /**
   * 정렬 적용된 데이터
   */
  const sortedData = React.useMemo(() => {
    if (!customSort || !customSort.column) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aData = a as Record<string, unknown>;
      const bData = b as Record<string, unknown>;
      const aValue = aData[customSort.column];
      const bValue = bData[customSort.column];

      if (aValue === bValue) return 0;

      // 타입 안전한 비교를 위해 문자열로 변환
      const aStr = String(aValue ?? '');
      const bStr = String(bValue ?? '');
      const comparison = aStr < bStr ? -1 : 1;
      return customSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, customSort]);

  // ===== 테이블 데이터 =====

  /**
   * 새 행을 포함한 최종 테이블 데이터
   */
  const tableData = React.useMemo(() => {
    if (newRow) {
      return [newRow as T, ...sortedData];
    }
    return sortedData;
  }, [newRow, sortedData]);

  // ===== 반환 =====

  return {
    // 상태
    newRow,
    isSaving,
    editingRowId,
    customFilters,
    customSort,

    // 데이터 (낙관적 업데이트 적용)
    tableData,
    sortedData,
    filteredData,
    optimisticData, // 원본 낙관적 데이터도 노출

    // 핸들러
    handleAddRow,
    handleSaveNewRow,
    handleCancelNewRow,
    handleUpdateNewRow,
    handleSave,
    handleDeleteRows,
    handleReorder: actions.reorder ? handleReorder : undefined,
    setEditingRowId,
    setCustomFilters,
    setCustomSort,
  };
}
