import { getOrders } from '@/actions/orders';
import { OrdersPageClient } from './orders-page-client';
import { requireAdmin } from '@/lib/auth';

export default async function OrdersPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 수주 목록 조회
  const result = await getOrders();

  if (result.error) {
    throw new Error(result.error);
  }

  return <OrdersPageClient orders={result.data || []} />;
}
