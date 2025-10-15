'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/dialogs/delete-confirm-dialog';
import { deleteEmployee } from '@/actions/employees';
import { useToast } from '@/hooks/use-toast';
import type { UserWithDetails, User } from '@/types';
import * as React from 'react';

interface EmployeeActionsProps {
  employee: UserWithDetails;
  currentUser: User;
}

export function EmployeeActions({
  employee,
  currentUser,
}: EmployeeActionsProps) {
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  // Admin만 삭제 가능
  const canDelete = currentUser.role === 'admin';

  const handleDelete = async () => {
    setIsDeleting(true);

    const result = await deleteEmployee(employee.id);

    setIsDeleting(false);
    setShowDeleteAlert(false);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: result.error,
      });
    } else {
      toast({
        title: '삭제 완료',
        description: '사원 정보가 삭제되었습니다.',
      });
    }
  };

  if (!canDelete) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        onConfirm={handleDelete}
        title="사원 삭제"
        itemName={employee.name}
        isDeleting={isDeleting}
      />
    </>
  );
}
