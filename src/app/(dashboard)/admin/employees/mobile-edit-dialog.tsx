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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserWithDetails, Department, Position, Company } from '@/types';

interface MobileEditDialogProps {
  employee: UserWithDetails | null;
  formData: Partial<UserWithDetails>;
  companies: Company[];
  departments: Department[];
  positions: Position[];
  onSave: () => void;
  onCancel: () => void;
  onFormChange: (data: Partial<UserWithDetails>) => void;
}

/**
 * 모바일 사원 편집 다이얼로그
 */
export function MobileEditDialog({
  employee,
  formData,
  companies,
  departments,
  positions,
  onSave,
  onCancel,
  onFormChange,
}: MobileEditDialogProps) {
  return (
    <Dialog open={!!employee} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사원 정보 수정</DialogTitle>
          <DialogDescription>
            {employee?.name}님의 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">이름 *</Label>
            <Input
              id="edit-name"
              value={formData.name || ''}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="이름 입력"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">이메일 *</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
              placeholder="이메일 입력"
            />
          </div>

          {/* 회사 */}
          <div className="space-y-2">
            <Label htmlFor="edit-company">회사 *</Label>
            <Select
              value={formData.company_id || ''}
              onValueChange={(value) => onFormChange({ ...formData, company_id: value })}
            >
              <SelectTrigger id="edit-company">
                <SelectValue placeholder="회사 선택" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 부서 */}
          <div className="space-y-2">
            <Label htmlFor="edit-department">부서</Label>
            <Select
              value={formData.department_id || undefined}
              onValueChange={(value) => onFormChange({ ...formData, department_id: value || null })}
            >
              <SelectTrigger id="edit-department">
                <SelectValue placeholder="부서 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 직급 */}
          <div className="space-y-2">
            <Label htmlFor="edit-position">직급</Label>
            <Select
              value={formData.position_id || undefined}
              onValueChange={(value) => onFormChange({ ...formData, position_id: value || null })}
            >
              <SelectTrigger id="edit-position">
                <SelectValue placeholder="직급 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 권한 */}
          <div className="space-y-2">
            <Label htmlFor="edit-role">권한</Label>
            <Select
              value={formData.role || ''}
              onValueChange={(value) => onFormChange({ ...formData, role: value as 'admin' | 'user' })}
            >
              <SelectTrigger id="edit-role">
                <SelectValue placeholder="권한 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">사용자</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상태 */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">상태</Label>
            <Select
              value={formData.employment_status || ''}
              onValueChange={(value) => onFormChange({ ...formData, employment_status: value as 'active' | 'inactive' })}
            >
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">재직</SelectItem>
                <SelectItem value="inactive">퇴사</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 입사일 */}
          <div className="space-y-2">
            <Label htmlFor="edit-hire-date">입사일</Label>
            <Input
              id="edit-hire-date"
              type="date"
              value={formData.hire_date || ''}
              onChange={(e) => onFormChange({ ...formData, hire_date: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button onClick={onSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
