import { getCurrentUser } from '@/lib/auth';
import { getUserModules } from '@/lib/modules/permissions';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 인증 확인 및 사용자 정보 가져오기
  const user = await getCurrentUser();

  // 사용자가 접근 가능한 모듈 목록 가져오기
  const modules = await getUserModules();

  return (
    <DashboardLayout user={user} modules={modules}>
      {children}
    </DashboardLayout>
  );
}
