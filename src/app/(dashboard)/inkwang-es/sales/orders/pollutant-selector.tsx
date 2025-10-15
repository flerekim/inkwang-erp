'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Pollutant, PollutantInput } from '@/types';

interface PollutantSelectorProps {
  pollutants: Pollutant[]; // 사용 가능한 오염물질 목록
  value: PollutantInput[]; // 선택된 오염물질 목록
  onChange: (value: PollutantInput[]) => void;
}

export function PollutantSelector({ pollutants, value, onChange }: PollutantSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState('');

  // 오염물질 추가
  const handleAddPollutant = (pollutantId: string) => {
    const newItem: PollutantInput = {
      pollutant_id: pollutantId,
      concentration: '',
      group_name: groupName || value[0]?.group_name || '복합오염',
    };
    onChange([...value, newItem]);
    setOpen(false);
  };

  // 오염물질 제거
  const handleRemovePollutant = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  // 농도 업데이트
  const handleUpdateConcentration = (index: number, concentration: string) => {
    const newValue = [...value];
    newValue[index].concentration = concentration;
    onChange(newValue);
  };

  // 그룹명 업데이트
  const handleUpdateGroupName = (newGroupName: string) => {
    setGroupName(newGroupName);
    const newValue = value.map((item) => ({
      ...item,
      group_name: newGroupName,
    }));
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      {/* 그룹명 입력 */}
      {value.length > 0 && (
        <div>
          <Label>그룹명</Label>
          <Input
            value={groupName || value[0]?.group_name || ''}
            onChange={(e) => handleUpdateGroupName(e.target.value)}
            placeholder="복합오염"
          />
          <p className="text-xs text-muted-foreground mt-1">
            여러 오염물질을 하나의 그룹으로 묶을 때 사용합니다.
          </p>
        </div>
      )}

      {/* 선택된 오염물질 목록 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label>선택된 오염물질</Label>
          <div className="space-y-2 border rounded-lg p-3">
            {value.map((item, index) => {
              const pollutant = pollutants.find((p) => p.id === item.pollutant_id);
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{pollutant?.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="text"
                        value={item.concentration}
                        onChange={(e) => handleUpdateConcentration(index, e.target.value)}
                        placeholder="농도 입력"
                        className="h-8"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {pollutant?.unit}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePollutant(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 오염물질 추가 버튼 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            오염물질 추가
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="오염물질 검색..." />
            <CommandList>
              <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              <CommandGroup>
                {pollutants
                  .filter((p) => !value.some((v) => v.pollutant_id === p.id))
                  .map((pollutant) => (
                    <CommandItem
                      key={pollutant.id}
                      onSelect={() => handleAddPollutant(pollutant.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{pollutant.name}</span>
                        <span className="text-xs text-muted-foreground">{pollutant.unit}</span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          오염물질을 추가해주세요
        </p>
      )}
    </div>
  );
}
