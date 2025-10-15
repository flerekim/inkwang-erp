import { getCurrentUser } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 확인 및 사용자 정보 가져오기
  const user = await getCurrentUser();

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
