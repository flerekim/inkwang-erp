/**
 * 테이블 공통 타입 정의
 * CRUD 테이블에서 사용하는 공통 타입과 인터페이스
 */

/**
 * 필터 설정 타입
 */
export interface FilterConfig {
  key: string;
  label: string;
  options: Array<{ id: string; name: string }>;
}

/**
 * 정렬 옵션 타입
 */
export interface SortOption {
  id: string;
  label: string;
}

/**
 * 기본 엔티티 인터페이스
 * 모든 테이블 데이터는 이 인터페이스를 확장해야 함
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 정렬 가능한 엔티티 인터페이스
 */
export interface SortableEntity extends BaseEntity {
  sort_order: number;
}

/**
 * CRUD 작업 결과 타입
 */
export interface CrudResult<T = unknown> {
  error?: string;
  success?: boolean;
  data?: T; // 생성된 데이터 (create 작업용)
}

/**
 * CRUD 액션 함수 타입
 */
export interface CrudActions<T extends BaseEntity> {
  create: (data: Omit<T, 'id' | 'created_at' | 'updated_at'> | Partial<T>) => Promise<CrudResult<T>>;
  update: (id: string, data: Partial<Omit<T, 'id' | 'created_at'>> | Partial<T>) => Promise<CrudResult>;
  delete: (id: string) => Promise<CrudResult>;
  reorder?: (items: { id: string; sort_order: number }[]) => Promise<CrudResult>;
}

/**
 * 테이블 필터 상태
 */
export interface TableFilters {
  customFilters: Record<string, string[]>;
  customSort: {
    column: string;
    direction: 'asc' | 'desc';
  } | null;
}

/**
 * 새 행 관리 상태
 */
export interface NewRowState<T> {
  newRow: Partial<T> | null;
  isSaving: boolean;
  editingRowId: string | null;
}

/**
 * CRUD 테이블 설정
 */
export interface CrudTableConfig<T extends BaseEntity> {
  /** 테이블 데이터 */
  data: T[];
  /** CRUD 액션 함수들 */
  actions: CrudActions<T>;
  /** 새 행 기본값 */
  defaultValues: Partial<T>;
  /** 필수 입력 필드 목록 */
  requiredFields: (keyof T)[];
  /** 필수 필드 누락 시 표시할 메시지 */
  requiredFieldsMessage?: string;
  /** 새 항목 추가 성공 메시지 */
  createSuccessMessage?: string;
  /** 수정 성공 메시지 */
  updateSuccessMessage?: string;
  /** 삭제 성공 메시지 */
  deleteSuccessMessage?: string;
  /** 정렬 필드 (드래그앤드롭용) */
  sortField?: string;
  /** 필터 설정 */
  filterConfigs?: FilterConfig[];
  /** 정렬 옵션 */
  sortOptions?: SortOption[];
}

/**
 * CRUD 테이블 훅 반환 타입 (React 19 useOptimistic 통합)
 */
export interface UseCrudTableReturn<T extends BaseEntity> {
  // 상태
  newRow: Partial<T> | null;
  isSaving: boolean;
  editingRowId: string | null;
  customFilters: Record<string, string[]>;
  customSort: { column: string; direction: 'asc' | 'desc' } | null;

  // 데이터 (낙관적 업데이트 적용)
  tableData: T[];
  sortedData: T[];
  filteredData: T[];
  optimisticData: T[]; // 원본 낙관적 데이터

  // 핸들러
  handleAddRow: () => void;
  handleSaveNewRow: () => Promise<void>;
  handleCancelNewRow: () => void;
  handleUpdateNewRow: (field: string, value: string | number) => void;
  handleSave: (id: string, field: string, value: string) => Promise<{ error?: string }>;
  handleDeleteRows: (rows: T[]) => Promise<void>;
  handleReorder?: (reorderedData: T[]) => Promise<void>;
  setEditingRowId: (rowId: string | null) => void;
  setCustomFilters: (filters: Record<string, string[]>) => void;
  setCustomSort: (sort: { column: string; direction: 'asc' | 'desc' } | null) => void;
}

/**
 * 엑셀 내보내기 설정
 */
export interface ExportConfig<T extends BaseEntity> {
  /** 내보낼 데이터 */
  data: T[];
  /** 파일명 접두사 (예: '사원목록') */
  filenamePrefix: string;
  /** 내보낼 컬럼 설정 */
  columns: Array<{
    key: keyof T | string;
    label: string;
    format?: (value: unknown, row: T) => string;
  }>;
}
