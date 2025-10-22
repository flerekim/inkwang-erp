import { Metadata } from 'next';
import { getReceivables } from '@/actions/receivables';
import { ReceivablesPageClient } from './receivables-page-client';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = {
  title: '채권관리 | 인광이에스 ERP',
  description: '청구 기반 채권관리 시스템',
};

// Page 레벨 캐싱 (Next.js 15 권장 방식)
export const revalidate = 60; // 60초 캐싱

/**
 * 채권관리 페이지
 *
 * Server Component로 구현:
 * - 관리자 권한 확인
 * - 채권 목록 조회 (Server Action)
 * - Client Component에 데이터 전달
 */
export default async function ReceivablesPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 채권 목록 조회
  const result = await getReceivables();

  if (result.error) {
    throw new Error(result.error);
  }

  return <ReceivablesPageClient receivables={result.data || []} />;
}
