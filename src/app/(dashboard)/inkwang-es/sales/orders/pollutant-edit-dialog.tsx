'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PollutantSelector } from './pollutant-selector';
import type { OrderWithDetails, Pollutant, PollutantInput } from '@/types';

interface PollutantEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails | null;
  pollutants: Pollutant[];
  onSave: (orderId: string, pollutants: PollutantInput[]) => Promise<void>;
}

/**
 * 오염물질 편집 전용 다이얼로그
 *
 * 기능:
 * - 오염물질 추가/제거
 * - 농도 입력
 * - 그룹명 설정
 */
export function PollutantEditDialog({
  open,
  onOpenChange,
  order,
  pollutants,
  onSave,
}: PollutantEditDialogProps) {
  const [selectedPollutants, setSelectedPollutants] = React.useState<PollutantInput[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // order가 변경되면 초기값 설정
  React.useEffect(() => {
    if (order?.pollutants) {
      setSelectedPollutants(
        order.pollutants.map((p) => ({
          pollutant_id: p.pollutant_id,
          concentration: p.concentration?.toString() || '',
          group_name: p.group_name || null,
        }))
      );
    } else {
      setSelectedPollutants([]);
    }
  }, [order]);

  const handleSave = async () => {
    if (!order) return;

    setIsSaving(true);
    try {
      await onSave(order.id, selectedPollutants);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save pollutants:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>오염물질 편집</DialogTitle>
          <DialogDescription>
            {order?.contract_name && `계약명: ${order.contract_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PollutantSelector
            pollutants={pollutants}
            value={selectedPollutants}
            onChange={setSelectedPollutants}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedPollutants.length === 0}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
