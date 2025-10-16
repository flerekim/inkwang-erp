import { useState, useEffect, useMemo } from 'react';
import { type RowSelectionState } from '@tanstack/react-table';

/**
 * 테이블 상태 관리 훅의 반환 타입
 */
export interface UseTableStateReturn<T> {
  // 데이터 상태
  tableData: T[];
  setTableData: React.Dispatch<React.SetStateAction<T[]>>;

  // 행 선택 상태
  rowSelection: RowSelectionState;
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  selectedCount: number;

  // 삭제 상태
  isDeleting: boolean;
  setIsDeleting: React.Dispatch<React.SetStateAction<boolean>>;
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // 새 행 관리
  newRowData: Partial<T> | null;
  setNewRowData: React.Dispatch<React.SetStateAction<Partial<T> | null>>;
  isSavingNewRow: boolean;
  setIsSavingNewRow: React.Dispatch<React.SetStateAction<boolean>>;

  // 계산된 값
  displayData: T[]; // 새 행 포함된 표시 데이터
}

/**
 * 테이블 공통 상태 관리 훅
 *
 * @description
 * 모든 테이블 컴포넌트에서 반복되는 상태 관리 로직을 통합한 훅입니다.
 * - 테이블 데이터 동기화
 * - 행 선택 상태 관리
 * - 삭제 다이얼로그 상태
 * - 새 행 추가 상태
 * - 계산된 표시 데이터
 *
 * @example
 * ```tsx
 * function EmployeesTable({ data }: { data: User[] }) {
 *   const {
 *     tableData,
 *     rowSelection,
 *     setRowSelection,
 *     deleteDialogOpen,
 *     setDeleteDialogOpen,
 *     newRowData,
 *     setNewRowData,
 *     selectedCount,
 *     displayData,
 *   } = useTableState(data);
 *
 *   // ... 나머지 로직
 * }
 * ```
 *
 * @template T - 테이블 행 데이터 타입
 * @param {T[]} initialData - 초기 데이터 (props로 받은 서버 데이터)
 * @returns {UseTableStateReturn<T>} 테이블 상태 및 setter 함수들
 */
export function useTableState<T extends { id?: string }>(
  initialData: T[]
): UseTableStateReturn<T> {
  // 테이블 데이터 상태
  const [tableData, setTableData] = useState<T[]>(initialData);

  // 행 선택 상태
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // 삭제 상태
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 새 행 관리
  const [newRowData, setNewRowData] = useState<Partial<T> | null>(null);
  const [isSavingNewRow, setIsSavingNewRow] = useState(false);

  // 데이터가 변경되면 로컬 상태 업데이트 (SSR 새로고침 대응)
  useEffect(() => {
    setTableData(initialData);
  }, [initialData]);

  // 선택된 행 개수
  const selectedCount = useMemo(() => Object.keys(rowSelection).length, [rowSelection]);

  // 새 행이 있을 경우 테이블 데이터에 포함
  const displayData = useMemo(() => {
    if (newRowData) {
      return [newRowData as T, ...tableData];
    }
    return tableData;
  }, [newRowData, tableData]);

  return {
    // 데이터
    tableData,
    setTableData,

    // 행 선택
    rowSelection,
    setRowSelection,
    selectedCount,

    // 삭제
    isDeleting,
    setIsDeleting,
    deleteDialogOpen,
    setDeleteDialogOpen,

    // 새 행
    newRowData,
    setNewRowData,
    isSavingNewRow,
    setIsSavingNewRow,

    // 계산된 값
    displayData,
  };
}
