'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Method } from '@/types';

interface MethodSelectorProps {
  methods: Method[]; // 사용 가능한 정화방법 목록
  value: string[]; // 선택된 정화방법 ID 목록
  onChange: (value: string[]) => void;
}

export function MethodSelector({ methods, value, onChange }: MethodSelectorProps) {
  // 정화방법 선택/해제
  const handleToggleMethod = (methodId: string) => {
    if (value.includes(methodId)) {
      onChange(value.filter((id) => id !== methodId));
    } else {
      onChange([...value, methodId]);
    }
  };

  // 선택된 정화방법 이름 목록
  const selectedMethodNames = React.useMemo(() => {
    return value
      .map((id) => methods.find((m) => m.id === id)?.name)
      .filter(Boolean);
  }, [value, methods]);

  return (
    <div className="space-y-4">
      <div>
        <Label>정화방법 선택</Label>
        <p className="text-xs text-muted-foreground mt-1">
          적용할 정화방법을 선택해주세요 (복수 선택 가능)
        </p>
      </div>

      {/* 정화방법 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
        {methods.map((method) => {
          const isSelected = value.includes(method.id);
          return (
            <div
              key={method.id}
              className={`flex items-start space-x-3 p-3 rounded-md border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onClick={() => handleToggleMethod(method.id)}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleMethod(method.id)}
                onClick={(e) => e.stopPropagation()} // 이벤트 버블링 방지
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{method.name}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </div>
                {method.description && (
                  <p className="text-xs text-muted-foreground mt-1">{method.description}</p>
                )}
              </div>
            </div>
          );
        })}

        {methods.length === 0 && (
          <div className="col-span-2 text-center text-sm text-muted-foreground py-8">
            사용 가능한 정화방법이 없습니다.
          </div>
        )}
      </div>

      {/* 선택된 정화방법 요약 */}
      {value.length > 0 && (
        <div>
          <Label>선택된 정화방법 ({value.length}개)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedMethodNames.map((name, index) => (
              <Badge key={index} variant="default">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {value.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
          정화방법을 선택해주세요
        </div>
      )}
    </div>
  );
}
