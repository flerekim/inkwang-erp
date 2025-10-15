import { getEmployees } from '@/actions/employees';
import { EmployeesPageClientNew } from './employees-page-client';
import { requireAdmin } from '@/lib/auth';

export default async function EmployeesPage() {
  // 관리자 권한 확인
  await requireAdmin();

  // 사원 목록 조회
  const result = await getEmployees();

  if (result.error) {
    throw new Error(result.error);
  }

  return (
    <EmployeesPageClientNew
      employees={result.data || []}
    />
  );
}
