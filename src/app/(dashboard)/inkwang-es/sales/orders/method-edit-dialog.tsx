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
import { MethodSelector } from './method-selector';
import type { OrderWithDetails, Method } from '@/types';

interface MethodEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails | null;
  methods: Method[];
  onSave: (orderId: string, methodIds: string[]) => Promise<void>;
}

/**
 * 정화방법 편집 전용 다이얼로그
 *
 * 기능:
 * - 정화방법 다중 선택/해제
 * - 선택된 정화방법 요약 표시
 */
export function MethodEditDialog({
  open,
  onOpenChange,
  order,
  methods,
  onSave,
}: MethodEditDialogProps) {
  const [selectedMethodIds, setSelectedMethodIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // order가 변경되면 초기값 설정
  React.useEffect(() => {
    if (order?.methods) {
      setSelectedMethodIds(order.methods.map((m) => m.method_id));
    } else {
      setSelectedMethodIds([]);
    }
  }, [order]);

  const handleSave = async () => {
    if (!order) return;

    setIsSaving(true);
    try {
      await onSave(order.id, selectedMethodIds);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save methods:', error);
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
          <DialogTitle>정화방법 편집</DialogTitle>
          <DialogDescription>
            {order?.contract_name && `계약명: ${order.contract_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <MethodSelector
            methods={methods}
            value={selectedMethodIds}
            onChange={setSelectedMethodIds}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selectedMethodIds.length === 0}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
