'use server';

import { createCrudActions } from '@/lib/server-actions';
import type { Department } from '@/types';

/**
 * CRUD Actions for Departments
 * 공통 팩토리 패턴 사용 + 드래그 앤 드롭 정렬 지원
 */
const crudActions = createCrudActions<Department>('departments', ['/admin/company/departments'], {
  requireAdminForWrite: true,
});

export async function getDepartments() {
  return crudActions.getAll();
}

export async function getDepartmentById(id: string) {
  return crudActions.getById(id);
}

export async function createDepartment(data: Omit<Department, 'id' | 'created_at' | 'updated_at'>) {
  return crudActions.create(data);
}

export async function updateDepartment(id: string, data: Partial<Omit<Department, 'id' | 'created_at'>>) {
  return crudActions.update(id, data);
}

export async function deleteDepartment(id: string) {
  return crudActions.remove(id);
}

export async function reorderDepartments(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}
