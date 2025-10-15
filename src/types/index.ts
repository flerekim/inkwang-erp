import type { Database } from './database';

// ============================================
// 테이블 타입 (Row)
// ============================================

export type Company = Database['public']['Tables']['companies']['Row'];
export type Department = Database['public']['Tables']['departments']['Row'];
export type Position = Database['public']['Tables']['positions']['Row'];
export type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];

// ============================================
// Insert 타입 (새 레코드 생성용)
// ============================================

export type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
export type PositionInsert = Database['public']['Tables']['positions']['Insert'];
export type BankAccountInsert = Database['public']['Tables']['bank_accounts']['Insert'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];

// ============================================
// Update 타입 (레코드 수정용)
// ============================================

export type CompanyUpdate = Database['public']['Tables']['companies']['Update'];
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];
export type PositionUpdate = Database['public']['Tables']['positions']['Update'];
export type BankAccountUpdate = Database['public']['Tables']['bank_accounts']['Update'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

// ============================================
// Enum 타입
// ============================================

export type UserRole = Database['public']['Enums']['user_role'];
export type EmploymentStatus = Database['public']['Enums']['employment_status'];

// ============================================
// Join된 타입 (관계 포함)
// ============================================

/**
 * 사용자 정보 + 부서 + 직급 + 회사
 */
export type UserWithDetails = User & {
  department: Pick<Department, 'id' | 'name'> | null;
  position: Pick<Position, 'id' | 'name'> | null;
  company: Pick<Company, 'id' | 'name' | 'business_number'>;
};

/**
 * 은행계좌 정보 + 회사
 */
export type BankAccountWithCompany = BankAccount & {
  company: Company;
};

/**
 * 사용자 선택 옵션 (간소화된 사용자 정보)
 */
export type UserSelectOption = Pick<User, 'id' | 'name' | 'email' | 'role'>;

// ============================================
// API 응답 타입
// ============================================

export type ApiResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type ApiError = {
  message: string;
  code?: string;
  details?: unknown;
};

// ============================================
// 폼 데이터 타입
// ============================================

export type LoginFormData = {
  userId: string;
  password: string;
};

export type EmployeeFormData = Omit<UserInsert, 'id' | 'employee_number' | 'created_at' | 'updated_at'> & {
  password: string;
};

export type CompanyFormData = Omit<CompanyInsert, 'id' | 'created_at' | 'updated_at'>;
export type DepartmentFormData = Omit<DepartmentInsert, 'id' | 'created_at' | 'updated_at'>;
export type PositionFormData = Omit<PositionInsert, 'id' | 'created_at' | 'updated_at'>;
export type BankAccountFormData = Omit<BankAccountInsert, 'id' | 'created_at' | 'updated_at'>;
export type CustomerFormData = Omit<CustomerInsert, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// 수주관리 관련 타입
// ============================================

// 기본 Row 타입
export type Order = Database['public']['Tables']['orders']['Row'];
export type Pollutant = Database['public']['Tables']['pollutants']['Row'];
export type Method = Database['public']['Tables']['methods']['Row'];
export type OrderPollutant = Database['public']['Tables']['order_pollutants']['Row'];
export type OrderMethod = Database['public']['Tables']['order_methods']['Row'];

// Insert 타입
export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type PollutantInsert = Database['public']['Tables']['pollutants']['Insert'];
export type MethodInsert = Database['public']['Tables']['methods']['Insert'];
export type OrderPollutantInsert = Database['public']['Tables']['order_pollutants']['Insert'];
export type OrderMethodInsert = Database['public']['Tables']['order_methods']['Insert'];

// Update 타입
export type OrderUpdate = Database['public']['Tables']['orders']['Update'];
export type PollutantUpdate = Database['public']['Tables']['pollutants']['Update'];
export type MethodUpdate = Database['public']['Tables']['methods']['Update'];

// Enum 타입
export type ContractType = 'new' | 'change'; // 신규, 변경
export type ContractStatus = 'quotation' | 'contract' | 'in_progress' | 'completed'; // 견적, 계약, 진행, 완료
export type BusinessType = 'civilian' | 'government'; // 민수, 관수
export type PricingType = 'total' | 'unit_price'; // 총액계약, 단가계약
export type ExportType = 'on_site' | 'export'; // 부지내, 반출

/**
 * 수주 상세 타입 (JOIN된 데이터 포함)
 */
export type OrderWithDetails = Order & {
  customer: Pick<Customer, 'id' | 'name' | 'business_number' | 'customer_type'> | null;
  verification_company: Pick<Customer, 'id' | 'name' | 'business_number' | 'customer_type'> | null;
  manager: Pick<User, 'id' | 'name' | 'email'> | null;
  parent_order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
  pollutants: OrderPollutantWithPollutant[];
  methods: OrderMethodWithMethod[];
};

/**
 * 오염물질 연결 정보 + 오염물질 상세
 */
export type OrderPollutantWithPollutant = OrderPollutant & {
  pollutant: Pollutant | null;
};

/**
 * 정화방법 연결 정보 + 정화방법 상세
 */
export type OrderMethodWithMethod = OrderMethod & {
  method: Method | null;
};

/**
 * 오염물질 입력 타입
 */
export type PollutantInput = {
  pollutant_id: string;
  concentration: string;
  group_name?: string | null;
};

/**
 * 수주 생성/수정 폼 데이터
 */
export type OrderFormData = {
  // 계약 기본 정보
  contract_type: ContractType;
  contract_status: ContractStatus;
  business_type: BusinessType;
  pricing_type: PricingType;

  // 계약 상세
  contract_name: string;
  contract_date: string;
  contract_amount: number;

  // 관계형 데이터
  customer_id: string;
  verification_company_id: string | null;
  manager_id: string | null;
  parent_order_id: string | null;

  // 기타
  export_type: ExportType;
  notes: string | null;
  attachments?: string[];

  // 오염물질 배열 (다중 선택)
  pollutants: PollutantInput[];

  // 정화방법 배열 (다중 선택)
  methods: string[]; // method_id 배열
};

/**
 * 첨부파일 메타데이터 타입
 */
export type AttachmentMetadata = {
  name: string;
  size: number;
  path: string;
  uploadedAt: string;
  contractInfo?: {
    type: ContractType;
    name: string;
    orderNumber?: string;
  };
};

/**
 * 확장 가능한 테이블 행 타입 (TanStack Table의 서브행 기능 지원)
 */
export type ExpandableRow<T> = T & {
  children?: T[];
};
