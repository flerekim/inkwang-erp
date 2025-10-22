import { useState, useEffect } from 'react';
import type { ReceivableWithDetails } from '@/types';

/**
 * 채권 데이터 관리 훅
 * - 데이터 초기화 및 상태 관리
 */
export function useReceivableData(initialData: ReceivableWithDetails[]) {
  const [displayData, setDisplayData] = useState<ReceivableWithDetails[]>(initialData);

  // initialData 변경 시 displayData 업데이트
  useEffect(() => {
    setDisplayData(initialData);
  }, [initialData]);

  return {
    displayData,
    setDisplayData,
  };
}
