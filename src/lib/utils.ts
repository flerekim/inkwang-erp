import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 날짜 포맷팅
 * @param date - Date 객체 또는 문자열
 * @returns 한국어 형식의 날짜 문자열 (예: 2025년 10월 1일)
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 간단한 날짜 포맷팅
 * @param date - Date 객체 또는 문자열
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function formatDateShort(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 숫자 포맷팅 (금액)
 * @param amount - 금액
 * @returns 한국어 통화 형식 (예: ₩1,000,000)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

/**
 * 숫자 포맷팅 (천 단위 구분)
 * @param value - 숫자
 * @returns 천 단위 구분된 문자열 (예: 1,000,000)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

/**
 * 사번 포맷팅
 * @param number - 사번 (예: 20250001)
 * @returns 포맷된 사번 (예: 2025-0001)
 */
export function formatEmployeeNumber(number: string): string {
  if (!number) return '-';
  // 20250001 → 2025-0001
  return `${number.slice(0, 4)}-${number.slice(4)}`;
}

/**
 * 이메일 생성
 * @param userId - 사용자 ID
 * @returns 완전한 이메일 주소
 */
export function generateEmail(userId: string): string {
  return `${userId}@${process.env.NEXT_PUBLIC_DOMAIN || 'inkwang.co.kr'}`;
}

/**
 * 에러 메시지 추출
 * @param error - 에러 객체
 * @returns 에러 메시지 문자열
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * 디바운스 함수
 * @param func - 실행할 함수
 * @param wait - 대기 시간 (밀리초)
 * @returns 디바운스된 함수
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 딥 클론 (깊은 복사)
 * @param obj - 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 빈 값 체크
 * @param value - 체크할 값
 * @returns 빈 값 여부
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 사업자등록번호 포맷팅
 * @param number - 사업자등록번호 (10자리)
 * @returns 포맷된 사업자등록번호 (예: 123-45-67890)
 */
export function formatBusinessNumber(number: string): string {
  if (!number) return '-';
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length !== 10) return number;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
}

/**
 * 사업자등록번호 유효성 검증 (체크섬 알고리즘)
 * @param number - 사업자등록번호 (10자리 숫자 또는 xxx-xx-xxxxx 형식)
 * @returns 유효성 여부
 */
export function validateBusinessNumber(number: string): boolean {
  if (!number) return false;

  // 숫자만 추출
  const cleaned = number.replace(/\D/g, '');

  // 10자리 확인
  if (cleaned.length !== 10) return false;

  // 체크섬 검증
  const checkKey = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * checkKey[i];
  }

  // 마지막 자리 검증
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[9]);
}

/**
 * 전화번호 포맷팅
 * @param phone - 전화번호
 * @returns 포맷된 전화번호
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');

  // 서울 02 (10자리)
  if (cleaned.startsWith('02') && cleaned.length === 10) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  // 일반 전화번호 (11자리)
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  // 일반 전화번호 (10자리)
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}
