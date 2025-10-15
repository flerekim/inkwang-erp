/**
 * 사업자등록번호 입력 컴포넌트
 *
 * 형식: xxx-xx-xxxxx (총 10자리 숫자)
 * 기능:
 * - 숫자만 입력 가능
 * - 자동 하이픈 삽입
 * - 최대 10자리 제한
 * - 실시간 유효성 검증 (체크섬 알고리즘)
 * - 중복 검사 (debounce 500ms)
 * - 검증 상태 아이콘 표시
 */

'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { validateBusinessNumber, formatBusinessNumber as formatBN } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate';

interface BusinessNumberInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  onEnterKey?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  // 중복 검사 옵션
  enableDuplicateCheck?: boolean;
  excludeId?: string; // 수정 시 자기 자신 제외
  onDuplicateCheck?: (businessNumber: string, excludeId?: string) => Promise<{ isDuplicate: boolean }>;
}

/**
 * 포맷팅된 값에서 순수 숫자만 추출
 * @param formatted - xxx-xx-xxxxx 형식의 문자열
 * @returns 숫자만 포함된 문자열
 */
function extractNumbers(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function BusinessNumberInput({
  value = '',
  onChange,
  onSave,
  onEnterKey,
  onBlur,
  onKeyDown,
  className,
  disabled = false,
  placeholder = '000-00-00000',
  enableDuplicateCheck = false,
  excludeId,
  onDuplicateCheck,
}: BusinessNumberInputProps) {
  // 포커스 유지를 위해 항상 내부 상태 사용
  // 숫자만 저장 (하이픈 제거)
  const [internalValue, setInternalValue] = React.useState(() => extractNumbers(value));
  const [isSaving, setIsSaving] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<ValidationStatus>('idle');

  // 디바운스 타이머
  const duplicateCheckTimerRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  // 외부 value prop이 변경되면 내부 상태 업데이트 (DateInput 패턴)
  // 값이 다를 때만 업데이트 (무한 루프 방지)
  React.useEffect(() => {
    const externalNumbers = extractNumbers(value);
    // 외부 값이 있고, 내부 값과 다를 때만 업데이트
    // 빈 문자열로는 업데이트하지 않음 (타이핑 중 보호)
    if (externalNumbers && externalNumbers !== internalValue) {
      setInternalValue(externalNumbers);
    }
  }, [value, internalValue]);

  // 중복 검사 함수 (debounced)
  const checkDuplicate = React.useCallback(
    async (businessNumber: string) => {
      if (!enableDuplicateCheck || !onDuplicateCheck || !businessNumber || businessNumber.length !== 10) {
        return;
      }

      setValidationStatus('checking');

      try {
        const result = await onDuplicateCheck(businessNumber, excludeId);
        if (result.isDuplicate) {
          setValidationStatus('duplicate');
        } else {
          setValidationStatus('valid');
        }
      } catch (error) {
        console.error('[BusinessNumberInput] Duplicate check error:', error);
        setValidationStatus('valid'); // 에러 시 기본적으로 valid로 처리
      }
    },
    [enableDuplicateCheck, onDuplicateCheck, excludeId]
  );

  // 유효성 검증 및 중복 검사
  React.useEffect(() => {
    // 1. 빈 값 체크
    if (!internalValue) {
      setValidationStatus('idle');
      return;
    }

    // 2. 길이 체크 (10자리 미만)
    if (internalValue.length < 10) {
      setValidationStatus('idle');
      return;
    }

    // 3. 길이 체크 (10자리 초과) - 입력 오류
    if (internalValue.length > 10) {
      setValidationStatus('invalid');
      return;
    }

    // 4. 숫자만 포함 여부 체크
    if (!/^\d{10}$/.test(internalValue)) {
      setValidationStatus('invalid');
      return;
    }

    // 5. 체크섬 검증 (유효한 사업자등록번호 형식)
    const isValid = validateBusinessNumber(internalValue);
    if (!isValid) {
      setValidationStatus('invalid');
      return;
    }

    // 6. 중복 검사 (debounce)
    if (enableDuplicateCheck && onDuplicateCheck) {
      // 기존 타이머 취소
      if (duplicateCheckTimerRef.current) {
        clearTimeout(duplicateCheckTimerRef.current);
      }

      // 500ms 후 중복 검사
      duplicateCheckTimerRef.current = setTimeout(() => {
        checkDuplicate(internalValue);
      }, 500);
    } else {
      setValidationStatus('valid');
    }

    // Cleanup
    return () => {
      if (duplicateCheckTimerRef.current) {
        clearTimeout(duplicateCheckTimerRef.current);
      }
    };
  }, [internalValue, enableDuplicateCheck, onDuplicateCheck, checkDuplicate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const sanitized = inputValue.replace(/[^\d-]/g, '');
    const numbers = extractNumbers(sanitized);

    // 최대 10자리까지만 허용
    if (numbers.length > 10) return;

    // 내부 상태만 업데이트 (포커스 유지)
    // DateInput 패턴: 타이핑 중에는 부모 상태를 업데이트하지 않음
    setInternalValue(numbers);
  };

  const handleSaveInternal = async () => {
    // onSave가 없거나, 값이 변경되지 않았으면 저장하지 않음
    const externalNumbers = extractNumbers(value);
    if (!onSave || internalValue === externalNumbers) return;

    setIsSaving(true);
    try {
      await onSave(internalValue);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlurInternal = async () => {
    // onSave 모드: 저장
    if (onSave) {
      await handleSaveInternal();
      return;
    }

    // onChange 모드: DateInput 패턴 - blur 시에 최종 값 전달
    if (onChange) {
      onChange(internalValue);
    }

    // 외부 onBlur 실행
    if (onBlur) {
      onBlur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter 키 처리
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // onSave 모드: 내부 저장 로직 실행
      if (onSave) {
        handleSaveInternal();
        (e.target as HTMLInputElement).blur();
        return;
      }

      // onChange 모드: DateInput 패턴 - Enter 시 최종 값 전달
      if (onChange) {
        onChange(internalValue);
      }

      // onEnterKey 콜백 실행
      if (onEnterKey) {
        onEnterKey();
        return;
      }
    }

    // Escape 키 처리 (onSave 모드만)
    if (e.key === 'Escape' && onSave) {
      e.preventDefault();
      setInternalValue(extractNumbers(value));
      (e.target as HTMLInputElement).blur();
      return;
    }

    // 외부 onKeyDown 실행
    if (onKeyDown) {
      onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    // 허용된 키만 입력 가능
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
      'Enter',
      'Escape',
    ];

    if (
      !allowedKeys.includes(e.key) &&
      !/^\d$/.test(e.key) &&
      !(e.ctrlKey || e.metaKey)
    ) {
      e.preventDefault();
    }
  };

  const displayValue = formatBN(internalValue || '');

  // 검증 상태별 에러 메시지
  const getValidationMessage = () => {
    if (!internalValue || internalValue.length < 10) return null;

    switch (validationStatus) {
      case 'invalid':
        if (internalValue.length > 10) {
          return '10자리를 초과할 수 없습니다';
        }
        if (!/^\d{10}$/.test(internalValue)) {
          return '숫자만 입력 가능합니다';
        }
        return '유효하지 않은 사업자등록번호입니다 (체크섬 오류)';
      case 'duplicate':
        return '이미 등록된 사업자등록번호입니다';
      default:
        return null;
    }
  };

  // 검증 상태 아이콘
  const getValidationIcon = () => {
    if (!internalValue || internalValue.length < 10) return null;

    const message = getValidationMessage();

    switch (validationStatus) {
      case 'checking':
        return (
          <div title="중복 검사 중...">
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        );
      case 'valid':
        return (
          <div title="유효한 사업자등록번호입니다">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        );
      case 'invalid':
        return (
          <div title={message || '유효하지 않은 사업자등록번호입니다'}>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        );
      case 'duplicate':
        return (
          <div title={message || '이미 등록된 사업자등록번호입니다'}>
            <XCircle className="h-4 w-4 text-orange-500" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlurInternal}
        className={className}
        disabled={disabled || isSaving}
        placeholder={placeholder}
        maxLength={12}
      />
      {getValidationIcon() && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {getValidationIcon()}
        </div>
      )}
    </div>
  );
}
