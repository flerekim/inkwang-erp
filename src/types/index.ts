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
export type ExportType = 'on_site' | 'export' | 'new_business'; // 부지내, 반출, 신규사업

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
  contract_unit?: UnitType | null; // 단가계약 시 단위 (Ton, 대, ㎥)

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

// ============================================
// 실적관리 관련 타입
// ============================================

// 기본 Row 타입
export type Performance = Database['public']['Tables']['performances']['Row'];

// Insert 타입
export type PerformanceInsert = Database['public']['Tables']['performances']['Insert'];

// Update 타입
export type PerformanceUpdate = Database['public']['Tables']['performances']['Update'];

// Enum 타입
export type PerformanceType = 'planned' | 'confirmed'; // 예정, 확정
export type UnitType = 'ton' | 'unit' | 'm3'; // Ton, 대, m³

/**
 * 실적 상세 타입 (JOIN된 데이터 포함)
 */
export type PerformanceWithDetails = Performance & {
  order: {
    id: string;
    order_number: string;
    contract_name: string;
    customer: Pick<Customer, 'id' | 'name'> | null;
  } | null;
  manager: Pick<User, 'id' | 'name' | 'email'> | null;
};

/**
 * 실적 생성/수정 폼 데이터
 */
export type PerformanceFormData = {
  // 실적 구분
  performance_type: PerformanceType;

  // 계약번호 (신규계약만)
  order_id: string;

  // 실적 상세
  performance_date: string; // YYYY-MM-DD
  unit: UnitType;
  quantity: string; // UI에서는 string으로 받음 (천단위 구분기호 포함)
  unit_price: string; // UI에서는 string으로 받음 (천단위 구분기호 포함)
  performance_amount: string; // UI에서는 string으로 받음 (천단위 구분기호 포함)

  // 담당자 (인광이에스 소속 직원만)
  manager_id: string | null;

  // 비고
  notes: string | null;
};

/**
 * 신규 계약 선택용 타입 (실적관리 전용)
 */
export type NewOrderOption = {
  id: string;
  order_number: string;
  contract_name: string;
  customer_id: string; // 고객 ID (자동 연동용)
  customer_name: string;
  manager_id: string | null; // 담당자 ID (자동 연동용)
};

// ============================================
// 청구관리 관련 타입
// ============================================

// 기본 Row 타입
export type Billing = Database['public']['Tables']['billings']['Row'];

// Insert 타입
export type BillingInsert = Database['public']['Tables']['billings']['Insert'];

// Update 타입
export type BillingUpdate = Database['public']['Tables']['billings']['Update'];

// Enum 타입
export type BillingType = 'contract' | 'interim' | 'final'; // 계약금, 중도금, 잔금
export type InvoiceStatus = 'issued' | 'not_issued'; // 발행, 미발행

/**
 * 청구 상세 타입 (JOIN된 데이터 포함)
 */
export type BillingWithDetails = Billing & {
  order: {
    id: string;
    order_number: string;
    contract_name: string;
  } | null;
  customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
  created_by_user: Pick<User, 'id' | 'name' | 'email'> | null;
  updated_by_user: Pick<User, 'id' | 'name' | 'email'> | null;
};

/**
 * 청구 생성/수정 폼 데이터
 */
export type BillingFormData = {
  // 청구일
  billing_date: string; // YYYY-MM-DD

  // 계약명 (신규수주만 선택 가능)
  order_id: string;

  // 고객명 (선택한 계약의 고객 자동 입력)
  customer_id: string;

  // 청구구분
  billing_type: BillingType;

  // 청구금액 (소수점 없음)
  billing_amount: string; // UI에서는 string으로 받음 (천단위 구분기호 포함)

  // 수금예정일
  expected_payment_date: string; // YYYY-MM-DD

  // 계산서 발행 상태
  invoice_status: InvoiceStatus;

  // 비고
  notes: string | null;
};

/**
 * 청구용 신규 계약 선택 옵션
 */
export type BillingOrderOption = {
  id: string;
  order_number: string;
  contract_name: string;
  customer_id: string; // 고객 ID (자동 연동용)
  customer_name: string;
  contract_amount: number; // 계약금액 (참고용)
};

// ============================================
// 수금관리 관련 타입
// ============================================

// 기본 Row 타입
export type Collection = Database['public']['Tables']['collections']['Row'];

// Insert 타입
export type CollectionInsert = Database['public']['Tables']['collections']['Insert'];

// Update 타입
export type CollectionUpdate = Database['public']['Tables']['collections']['Update'];

// Enum 타입
export type CollectionMethod = 'bank_transfer' | 'other'; // 계좌이체, 기타

/**
 * 수금 상세 타입 (JOIN된 데이터 포함)
 */
export type CollectionWithDetails = Collection & {
  billing: (Pick<Billing, 'id' | 'billing_number' | 'billing_amount' | 'expected_payment_date'> & {
    order: Pick<Order, 'id' | 'order_number' | 'contract_name'> | null;
    customer: Pick<Customer, 'id' | 'name' | 'business_number'> | null;
  }) | null;
  bank_account: Pick<BankAccount, 'id' | 'bank_name' | 'account_number'> | null;
};

/**
 * 청구 수금 현황 타입 (부분수금 지원)
 */
export type BillingCollectionStatus = {
  billing_id: string;
  billing_number: string;
  contract_name: string;
  customer_name: string;
  billing_amount: number;
  collected_amount: number;
  remaining_amount: number;
};

/**
 * 수금 생성/수정 폼 데이터
 */
export type CollectionFormData = {
  billing_id: string;
  collection_date: string; // YYYY-MM-DD
  collection_amount: number;
  collection_method: CollectionMethod;
  bank_account_id: string | null;
  bank_name: string | null;
  account_number: string | null;
  depositor: string;
  notes: string | null;
};

// ============================================
// 채권관리 관련 타입
// ============================================

// 기본 Row 타입
export type Receivable = Database['public']['Tables']['receivables']['Row'];
export type ReceivableActivity = Database['public']['Tables']['receivable_activities']['Row'];

// Insert 타입
export type ReceivableInsert = Database['public']['Tables']['receivables']['Insert'];
export type ReceivableActivityInsert = Database['public']['Tables']['receivable_activities']['Insert'];

// Update 타입
export type ReceivableUpdate = Database['public']['Tables']['receivables']['Update'];
export type ReceivableActivityUpdate = Database['public']['Tables']['receivable_activities']['Update'];

// Enum 타입
export type ReceivableStatus = 'pending' | 'partial' | 'completed'; // 미수, 부분수금, 수금완료
export type ReceivableClassification = 'normal' | 'overdue_long' | 'bad_debt' | 'written_off'; // 정상, 장기, 부실, 대손

/**
 * 채권 상세 타입 (뷰에서 가져오는 JOIN된 데이터 포함)
 */
export type ReceivableWithDetails = Database['public']['Views']['receivables_with_details']['Row'];

/**
 * 회수활동 상세 타입 (사용자 정보 포함)
 */
export type ReceivableActivityWithUser = ReceivableActivity & {
  user: Pick<User, 'id' | 'name' | 'email'> | null;
};

/**
 * 채권 폼 데이터 (대손처리용 - 수동 업데이트만 허용)
 */
export type ReceivableFormData = {
  classification: ReceivableClassification; // 대손 처리 시에만 수동 변경
  notes?: string | null;
};

/**
 * 회수활동 생성 폼 데이터
 */
export type ReceivableActivityFormData = {
  receivable_id: string;
  activity_date: string; // YYYY-MM-DD
  activity_content: string;
};

/**
 * 채권 상세 다이얼로그 데이터
 */
export type ReceivableDetailData = ReceivableWithDetails & {
  activities: ReceivableActivityWithUser[];
  collections: CollectionWithDetails[]; // 수금이력
};

// ============================================
// 독서관리 관련 타입 (reading.ts에서 재export)
// ============================================

export type {
  Book,
  ReadingRecord,
  AladinBook,
  AladinSearchResult,
  BookFormData,
  ReadingFormData,
  AladinBookConverted,
} from './reading';
