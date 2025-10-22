import { getBillings } from '@/actions/billings';
import { BillingsPageClient } from './billings-page-client';
import { requireAdmin } from '@/lib/auth';

/**
 * 청구관리 페이지
 *
 * Server Component로 구현:
 * - 관리자 권한 확인
 * - 청구 목록 조회 (Server Action)
 * - Client Component에 데이터 전달
 */
export default async function BillingsPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 청구 목록 조회
  const result = await getBillings();

  if (result.error) {
    throw new Error(result.error);
  }

  return <BillingsPageClient billings={result.data || []} />;
}
