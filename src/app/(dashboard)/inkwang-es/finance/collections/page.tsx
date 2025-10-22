import { getCollections } from '@/actions/collections';
import { CollectionsPageClient } from './collections-page-client';
import { requireAdmin } from '@/lib/auth';

export const metadata = {
  title: '수금관리 | 인광 ERP',
  description: '수금 내역 관리',
};

/**
 * 수금관리 페이지
 *
 * Server Component로 구현:
 * - 관리자 권한 확인
 * - 수금 목록 조회 (Server Action)
 * - Client Component에 데이터 전달
 */
export default async function CollectionsPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 수금 목록 조회
  const result = await getCollections();

  if (result.error) {
    throw new Error(result.error);
  }

  return <CollectionsPageClient collections={result.data || []} />;
}
