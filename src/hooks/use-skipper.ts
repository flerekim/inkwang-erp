import { useCallback, useEffect, useRef } from 'react';

/**
 * useSkipper - TanStack Table 공식 패턴
 *
 * 편집 중 페이지 자동 리셋을 방지하는 훅
 * EditableCell과 함께 사용하여 사용자가 편집 중일 때 페이지가 1페이지로 돌아가는 것을 방지
 *
 * @see https://tanstack.com/table/latest/docs/framework/react/examples/editable-data
 *
 * @example
 * ```tsx
 * const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
 *
 * const table = useReactTable({
 *   autoResetPageIndex,
 *   meta: {
 *     updateData: (rowIndex, columnId, value) => {
 *       skipAutoResetPageIndex(); // 편집 중 페이지 유지
 *       // ... 데이터 업데이트 로직
 *     },
 *   },
 * });
 * ```
 */
export function useSkipper() {
  const shouldSkipRef = useRef(true);
  const shouldSkip = shouldSkipRef.current;

  // 다음 렌더링에서 리셋하도록 플래그를 되돌림
  const skip = useCallback(() => {
    shouldSkipRef.current = false;
  }, []);

  // 렌더링 후 플래그를 다시 true로 설정
  useEffect(() => {
    shouldSkipRef.current = true;
  });

  return [shouldSkip, skip] as const;
}
