import { z } from 'zod';

// ============================================
// 공통 유효성 검사
// ============================================

/**
 * 이메일 유효성 검사
 */
export const emailSchema = z
  .string()
  .email('올바른 이메일 형식이 아닙니다')
  .endsWith('@inkwang.co.kr', '회사 이메일 주소를 사용해주세요');

/**
 * 비밀번호 유효성 검사
 */
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[a-z]/, '소문자가 최소 1개 이상 포함되어야 합니다')
  .regex(/[0-9]/, '숫자가 최소 1개 이상 포함되어야 합니다')
  .regex(/[^A-Za-z0-9]/, '특수문자가 최소 1개 이상 포함되어야 합니다');

/**
 * UUID 유효성 검사
 */
export const uuidSchema = z.string().uuid('올바른 ID 형식이 아닙니다');

/**
 * 날짜 유효성 검사
 */
export const dateSchema = z.union([z.string(), z.date()]);

/**
 * 사업자등록번호 유효성 검사
 */
export const businessNumberSchema = z
  .string()
  .regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자등록번호 형식이 아닙니다 (예: 123-45-67890)')
  .nullable()
  .optional();

/**
 * 전화번호 유효성 검사
 */
export const phoneNumberSchema = z
  .string()
  .regex(/^\d{2,3}-\d{3,4}-\d{4}$/, '올바른 전화번호 형식이 아닙니다 (예: 02-1234-5678)')
  .nullable()
  .optional();

// ============================================
// 로그인 유효성 검사
// ============================================

export const loginSchema = z.object({
  userId: z.string().min(2, '아이디를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
});

// ============================================
// 사용자 유효성 검사
// ============================================

export const userSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  employee_number: z.string().optional(),
  department_id: z.string().uuid('올바른 부서를 선택해주세요').nullable().optional(),
  position_id: z.string().uuid('올바른 직급을 선택해주세요').nullable().optional(),
  role: z.enum(['admin', 'user'], {
    message: '올바른 권한을 선택해주세요',
  }),
  employment_status: z.enum(['active', 'inactive'], {
    message: '올바른 재직 상태를 선택해주세요',
  }),
  hire_date: dateSchema,
  company_id: z.string().uuid('올바른 회사를 선택해주세요'),
});

export const userInsertSchema = userSchema.extend({
  password: passwordSchema,
});

export const userUpdateSchema = userSchema.partial();

// ============================================
// 회사 유효성 검사
// ============================================

export const companySchema = z.object({
  name: z.string().min(2, '회사명은 최소 2자 이상이어야 합니다'),
  business_number: businessNumberSchema,
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상이어야 합니다'),
});

export const companyInsertSchema = companySchema;
export const companyUpdateSchema = companySchema.partial();

// ============================================
// 부서 유효성 검사
// ============================================

export const departmentSchema = z.object({
  name: z.string().min(2, '부서명은 최소 2자 이상이어야 합니다'),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상이어야 합니다'),
});

export const departmentInsertSchema = departmentSchema;
export const departmentUpdateSchema = departmentSchema.partial();

// ============================================
// 직급 유효성 검사
// ============================================

export const positionSchema = z.object({
  name: z.string().min(2, '직급명은 최소 2자 이상이어야 합니다'),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상이어야 합니다'),
});

export const positionInsertSchema = positionSchema;
export const positionUpdateSchema = positionSchema.partial();

// ============================================
// 은행계좌 유효성 검사
// ============================================

export const bankAccountSchema = z.object({
  company_id: z.string().uuid('올바른 회사를 선택해주세요'),
  bank_name: z.string().min(2, '은행명은 최소 2자 이상이어야 합니다'),
  account_number: z.string().min(10, '계좌번호를 정확히 입력해주세요'),
  initial_balance: z.number().min(0, '초기 잔액은 0 이상이어야 합니다'),
  current_balance: z.number().min(0, '현재 잔액은 0 이상이어야 합니다'),
});

export const bankAccountInsertSchema = bankAccountSchema;
export const bankAccountUpdateSchema = bankAccountSchema.partial();

// ============================================
// 고객 유효성 검사
// ============================================

export const customerSchema = z.object({
  name: z.string().min(1, '고객명은 필수 입력 항목입니다').min(2, '고객명은 최소 2자 이상이어야 합니다'),
  customer_type: z.enum(['발주처', '검증업체', '외상매입처', '기타'], {
    message: '올바른 고객구분을 선택해주세요',
  }),
  status: z.enum(['거래중', '중단'], {
    message: '올바른 거래상태를 선택해주세요',
  }),
  business_number: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const cleaned = val.replace(/\D/g, '');
        return cleaned.length === 10;
      },
      { message: '사업자등록번호는 10자리 숫자여야 합니다' }
    ),
  representative_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        return z.string().email().safeParse(val).success;
      },
      { message: '올바른 이메일 형식이 아닙니다' }
    ),
  manager_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sort_order: z.number().int().min(0, '정렬 순서는 0 이상이어야 합니다').optional(),
});

export const customerInsertSchema = customerSchema;
export const customerUpdateSchema = customerSchema.partial();

// ============================================
// 헬퍼 함수
// ============================================

/**
 * Zod 스키마 유효성 검사 실행
 * @param schema - Zod 스키마
 * @param data - 검사할 데이터
 * @returns 유효성 검사 결과
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Zod 에러를 사용자 친화적인 메시지로 변환
 * @param error - Zod 에러
 * @returns 에러 메시지 객체
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  error.issues.forEach((err: z.ZodIssue) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });

  return formattedErrors;
}

// ============================================
// 수주관리 유효성 검사
// ============================================

/**
 * 오염물질 입력 스키마 (UI용 - concentration은 string)
 */
export const pollutantInputSchema = z.object({
  pollutant_id: z.string().uuid('올바른 오염물질을 선택해주세요'),
  concentration: z.string().min(1, '농도를 입력해주세요'),
  group_name: z.string().nullable().optional(),
});

/**
 * 수주 생성 스키마
 */
export const orderInsertSchema = z.object({
  // 계약 기본 정보
  contract_type: z.enum(['new', 'change'], {
    message: '계약구분을 선택해주세요',
  }),
  contract_status: z.enum(['quotation', 'contract', 'in_progress', 'completed'], {
    message: '계약상태를 선택해주세요',
  }),
  business_type: z.enum(['civilian', 'government'], {
    message: '구분을 선택해주세요',
  }),
  pricing_type: z.enum(['total', 'unit_price'], {
    message: '계약유형을 선택해주세요',
  }),

  // 계약 상세
  contract_name: z
    .string({ message: '계약명을 입력해주세요' })
    .min(1, '계약명을 입력해주세요')
    .max(500, '계약명은 500자를 초과할 수 없습니다'),
  contract_date: z
    .string({ message: '계약일을 선택해주세요' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식(YYYY-MM-DD)이 아닙니다'),
  contract_amount: z
    .union([
      z.number(),
      z.string().transform((val) => {
        const num = Number(val);
        if (isNaN(num)) {
          throw new Error('올바른 금액을 입력해주세요');
        }
        return num;
      }),
    ])
    .refine((val) => typeof val === 'number' && val >= 0, {
      message: '계약금액은 0 이상이어야 합니다',
    })
    .refine((val) => typeof val === 'number' && val <= 999999999999.99, {
      message: '계약금액이 너무 큽니다 (최대: 999,999,999,999.99원)',
    }),
  contract_unit: z.enum(['ton', 'unit', 'm3'], {
    message: '단위를 선택해주세요',
  }).nullable().optional(),

  // 관계형 데이터
  customer_id: z.string().uuid('올바른 고객을 선택해주세요'),
  verification_company_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  parent_order_id: z.string().uuid().nullable().optional(),

  // 기타
  export_type: z.enum(['on_site', 'export', 'new_business'], {
    message: '반출여부를 선택해주세요',
  }),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).optional(),

  // 오염물질 배열
  pollutants: z
    .array(pollutantInputSchema)
    .min(1, '최소 1개 이상의 오염물질을 선택해주세요'),

  // 정화방법 배열
  methods: z
    .array(z.string().uuid())
    .min(1, '최소 1개 이상의 정화방법을 선택해주세요'),
});

/**
 * 수주 수정 스키마 (Partial)
 */
export const orderUpdateSchema = orderInsertSchema.partial();

/**
 * 계약구분이 '변경'인 경우 parent_order_id 필수 검증
 */
export const orderInsertSchemaRefined = orderInsertSchema.refine(
  (data) => {
    if (data.contract_type === 'change') {
      return !!data.parent_order_id;
    }
    return true;
  },
  {
    message: '변경계약의 경우 원본 계약을 선택해주세요',
    path: ['parent_order_id'],
  }
);

// ============================================
// 실적관리 검증 스키마
// ============================================

/**
 * 실적 생성 스키마
 */
export const performanceInsertSchema = z
  .object({
    // 실적 구분 (예정/확정)
    performance_type: z.enum(['planned', 'confirmed'], {
      message: '올바른 실적 구분을 선택해주세요',
    }),

    // 계약번호 (수주관리에서 신규계약만)
    order_id: z.string().uuid('올바른 계약을 선택해주세요'),

    // 실적일 (YYYY-MM-DD)
    performance_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식을 입력해주세요 (YYYY-MM-DD)'),

    // 단위 (Ton, 대, m³)
    unit: z.enum(['ton', 'unit', 'm3'], {
      message: '올바른 단위를 선택해주세요',
    }),

    // 수량 (소수점 둘째자리까지, 천단위 구분기호 허용)
    quantity: z.union([
      z.number().nonnegative('수량은 0 이상이어야 합니다'),
      z
        .string()
        .regex(/^[\d,]+(\.\d{1,2})?$/, '올바른 수량 형식을 입력해주세요')
        .transform((val) => {
          const num = parseFloat(val.replace(/,/g, ''));
          return isNaN(num) ? 0 : num;
        }),
    ]),

    // 단가 (정수, 천단위 구분기호 허용)
    unit_price: z.union([
      z.number().int('단가는 정수여야 합니다').nonnegative('단가는 0 이상이어야 합니다'),
      z
        .string()
        .regex(/^[\d,]+$/, '올바른 단가 형식을 입력해주세요 (정수만 가능)')
        .transform((val) => {
          const num = parseInt(val.replace(/,/g, ''), 10);
          return isNaN(num) ? 0 : num;
        }),
    ]),

    // 실적금액 (정수, 천단위 구분기호 허용)
    performance_amount: z.union([
      z.number().int('실적금액은 정수여야 합니다').nonnegative('실적금액은 0 이상이어야 합니다'),
      z
        .string()
        .regex(/^[\d,]+$/, '올바른 실적금액 형식을 입력해주세요 (정수만 가능)')
        .transform((val) => {
          const num = parseInt(val.replace(/,/g, ''), 10);
          return isNaN(num) ? 0 : num;
        }),
    ]),

    // 담당자 (인광이에스 소속 직원만, nullable)
    manager_id: z.string().uuid('올바른 담당자를 선택해주세요').nullable().optional(),

    // 비고
    notes: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      // 수량 소수점 둘째자리 검증
      const quantity = typeof data.quantity === 'number' ? data.quantity : parseFloat(String(data.quantity).replace(/,/g, ''));
      const decimalPlaces = (quantity.toString().split('.')[1] || '').length;
      return decimalPlaces <= 2;
    },
    {
      message: '수량은 소수점 둘째자리까지만 입력 가능합니다',
      path: ['quantity'],
    }
  );

/**
 * 실적 수정 스키마 (모든 필드 선택적)
 */
export const performanceUpdateSchema = performanceInsertSchema.partial();

// ============================================
// 청구관리 관련 스키마
// ============================================

/**
 * 청구 생성 스키마
 */
export const billingInsertSchema = z.object({
  // 청구일 (필수)
  billing_date: dateSchema,

  // 계약명 (신규수주만 선택 가능, 필수)
  order_id: z.string().uuid('올바른 계약을 선택해주세요'),

  // 고객명 (선택한 계약의 고객 자동 입력, 필수)
  customer_id: z.string().uuid('올바른 고객을 선택해주세요'),

  // 청구구분 (필수)
  billing_type: z.enum(['contract', 'interim', 'final'], {
    message: '올바른 청구구분을 선택해주세요 (계약금/중도금/잔금)',
  }),

  // 청구금액 (필수, 소수점 없음, 정수만)
  billing_amount: z.union([
    z.number().int('청구금액은 정수만 입력 가능합니다').min(0, '청구금액은 0 이상이어야 합니다'),
    z
      .string()
      .regex(/^[\d,]+$/, '올바른 청구금액 형식을 입력해주세요 (정수만 가능)')
      .transform((val) => {
        const num = parseInt(val.replace(/,/g, ''), 10);
        return isNaN(num) ? 0 : num;
      }),
  ]),

  // 수금예정일 (필수)
  expected_payment_date: dateSchema,

  // 계산서 발행 상태 (기본값: not_issued)
  invoice_status: z.enum(['issued', 'not_issued'], {
    message: '올바른 계산서 상태를 선택해주세요 (발행/미발행)',
  }).default('not_issued'),

  // 비고 (선택)
  notes: z.string().nullable().optional(),
});

/**
 * 청구 수정 스키마 (모든 필드 선택적)
 */
export const billingUpdateSchema = billingInsertSchema.partial();
