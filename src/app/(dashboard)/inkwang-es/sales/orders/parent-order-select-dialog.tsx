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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, FileText } from 'lucide-react';

interface NewOrder {
  id: string;
  order_number: string;
  contract_name: string;
  contract_date?: string;
}

interface ParentOrderSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newOrders: NewOrder[];
  currentParentOrderId?: string | null;
  onSelect: (parentOrderId: string | null) => void;
}

/**
 * 변경 계약의 부모 계약(신규 계약) 선택 다이얼로그
 *
 * 기능:
 * - 신규 계약 목록 검색 및 선택
 * - 현재 연동된 계약 표시
 * - 연동 해제 가능
 */
export function ParentOrderSelectDialog({
  open,
  onOpenChange,
  newOrders,
  currentParentOrderId,
  onSelect,
}: ParentOrderSelectDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(currentParentOrderId || null);

  // 다이얼로그 열릴 때 현재 값으로 초기화
  React.useEffect(() => {
    if (open) {
      setSelectedId(currentParentOrderId || null);
      setSearchQuery('');
    }
  }, [open, currentParentOrderId]);

  // 검색 필터링
  const filteredOrders = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return newOrders;
    }

    const query = searchQuery.toLowerCase();
    return newOrders.filter(
      (order) =>
        order.contract_name.toLowerCase().includes(query) ||
        order.order_number.toLowerCase().includes(query)
    );
  }, [newOrders, searchQuery]);

  const handleConfirm = () => {
    onSelect(selectedId);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedId(currentParentOrderId || null);
    onOpenChange(false);
  };

  const handleRemoveLink = () => {
    setSelectedId(null);
    onSelect(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>연동할 신규 계약 선택</DialogTitle>
          <DialogDescription>
            변경 계약과 연동할 신규 계약을 선택해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* 검색 입력 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="계약명 또는 계약번호로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 신규 계약 목록 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-2">
            {filteredOrders.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {searchQuery ? '검색 결과가 없습니다.' : '신규 계약이 없습니다.'}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isSelected = selectedId === order.id;
                const isCurrent = currentParentOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                    onClick={() => setSelectedId(order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{order.contract_name}</span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs">
                            현재
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{order.order_number}</span>
                        {order.contract_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{order.contract_date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {currentParentOrderId && (
            <Button variant="destructive" onClick={handleRemoveLink}>
              연동 해제
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedId}>
              선택
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
