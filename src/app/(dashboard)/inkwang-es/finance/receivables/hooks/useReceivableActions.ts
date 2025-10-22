import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { updateReceivableClassification } from '@/actions/receivables';
import type { ReceivableFormData, ReceivableWithDetails } from '@/types';

/**
 * 채권 액션 관리 훅
 * - 대손처리, 상세보기 등 액션 핸들러
 */
export function useReceivableActions() {
  const { toast } = useToast();
  const router = useRouter();

  /**
   * 대손처리 핸들러
   */
  const handleWriteOff = useCallback(
    async (receivable: ReceivableWithDetails) => {
      if (!confirm(`${receivable.contract_name} 채권을 대손처리하시겠습니까?`)) {
        return;
      }

      const formData: ReceivableFormData = {
        classification: 'written_off',
      };

      const result = await updateReceivableClassification(receivable.id!, formData);

      if (result.error) {
        toast({
          variant: 'destructive',
          title: '대손처리 실패',
          description: result.error,
        });
        return;
      }

      toast({
        title: '대손처리 완료',
        description: '채권이 대손처리되었습니다.',
      });

      router.refresh();
    },
    [toast, router]
  );

  /**
   * 상세보기 핸들러
   */
  const handleViewDetail = useCallback(
    (receivable: ReceivableWithDetails) => {
      // 다이얼로그 열기 (부모 컴포넌트에서 처리)
      return receivable;
    },
    []
  );

  return {
    handleWriteOff,
    handleViewDetail,
  };
}
