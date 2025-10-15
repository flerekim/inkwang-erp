'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 날짜 입력 컴포넌트
 * - 숫자만 입력 가능
 * - 자동으로 yyyy-mm-dd 형식으로 포맷팅
 * - 8자리 숫자 입력 시 자동으로 하이픈 추가
 */
export function DateInput({ value = '', onChange, className, ...props }: DateInputProps) {
  // 내부 상태로 입력값 관리 (포커스 유지를 위해)
  const [internalValue, setInternalValue] = React.useState(value || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 외부 value prop이 변경되면 내부 상태 업데이트
  React.useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // 숫자와 하이픈만 허용
    const numbersOnly = input.replace(/[^\d-]/g, '');

    // 하이픈 제거한 숫자만 추출
    const digits = numbersOnly.replace(/-/g, '');

    // 최대 8자리까지만 허용 (yyyymmdd)
    if (digits.length > 8) {
      return;
    }

    // 자동 포맷팅
    let formatted = digits;
    if (digits.length >= 5) {
      // yyyy-mm-dd 형식으로 포맷팅
      formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}${digits.length > 6 ? `-${digits.slice(6, 8)}` : ''}`;
    } else if (digits.length >= 4) {
      // yyyy-mm 형식
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }

    // 내부 상태만 업데이트 (포커스 유지)
    setInternalValue(formatted);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // blur 시 유효성 검사 및 외부로 값 전달
    const digits = internalValue.replace(/-/g, '');

    if (digits.length === 8) {
      const year = digits.slice(0, 4);
      const month = digits.slice(4, 6);
      const day = digits.slice(6, 8);

      // 기본적인 날짜 유효성 검사
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);

      if (monthNum < 1 || monthNum > 12) {
        // 유효하지 않은 월
        props.onBlur?.(e);
        return;
      }

      if (dayNum < 1 || dayNum > 31) {
        // 유효하지 않은 일
        props.onBlur?.(e);
        return;
      }

      const formatted = `${year}-${month}-${day}`;
      setInternalValue(formatted);
      onChange?.(formatted);
    } else if (digits.length > 0) {
      // 불완전한 입력이지만 현재 값 전달
      onChange?.(internalValue);
    }

    // props로 전달된 onBlur도 실행
    props.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter 키를 누르면 blur와 동일하게 처리하고 이벤트 전파
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      // 상위 컴포넌트의 onKeyDown도 실행되도록 이벤트 전파
    }

    // props로 전달된 onKeyDown도 실행
    props.onKeyDown?.(e);
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="yyyymmdd"
      className={cn('font-mono', className)}
      {...props}
    />
  );
}
