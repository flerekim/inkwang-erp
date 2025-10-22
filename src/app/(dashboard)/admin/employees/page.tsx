import { getEmployees } from '@/actions/employees';
import { EmployeesPageClientNew } from './employees-page-client';
import { requireAdmin } from '@/lib/auth';

// Page 레벨 캐싱 설정 (60초)
export const revalidate = 60;

export default async function EmployeesPage() {
  // 관리자 권한 확인 및 현재 사용자 정보 가져오기
  const currentUser = await requireAdmin();

  // 사원 목록 조회
  const result = await getEmployees();

  if (result.error) {
    throw new Error(result.error);
  }

  return (
    <EmployeesPageClientNew
      employees={result.data || []}
      currentUser={currentUser}
    />
  );
}
