'use server';

import { createCrudActions } from '@/lib/server-actions';
import type { Position } from '@/types';

/**
 * CRUD Actions for Positions
 * 공통 팩토리 패턴 사용 + 드래그 앤 드롭 정렬 지원
 */
const crudActions = createCrudActions<Position>('positions', ['/admin/company/positions'], {
  requireAdminForWrite: true,
});

export async function getPositions() {
  return crudActions.getAll();
}

export async function getPositionById(id: string) {
  return crudActions.getById(id);
}

export async function createPosition(data: Omit<Position, 'id' | 'created_at' | 'updated_at'>) {
  return crudActions.create(data);
}

export async function updatePosition(id: string, data: Partial<Omit<Position, 'id' | 'created_at'>>) {
  return crudActions.update(id, data);
}

export async function deletePosition(id: string) {
  return crudActions.remove(id);
}

export async function reorderPositions(items: { id: string; sort_order: number }[]) {
  return crudActions.reorder(items);
}
