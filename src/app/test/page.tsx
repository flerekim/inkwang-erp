import { createClient } from '@/lib/supabase/server';

export default async function TestPage() {
  const supabase = await createClient();

  // 데이터베이스 연결 테스트 - 회사 정보 조회
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*');

  // 부서 정보 조회
  const { data: departments, error: departmentsError } = await supabase
    .from('departments')
    .select('*');

  // 직급 정보 조회
  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('*');

  const errors = [companiesError, departmentsError, positionsError].filter(
    Boolean
  );

  if (errors.length > 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-destructive">
          ❌ Supabase 연결 실패
        </h1>
        <div className="bg-destructive/10 p-4 rounded-lg">
          {errors.map((error, index) => (
            <pre key={index} className="text-sm text-destructive">
              {JSON.stringify(error, null, 2)}
            </pre>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4 text-success">
        ✅ Supabase 연결 성공!
      </h1>

      {/* 회사 정보 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">회사 정보</h2>
        <div className="bg-card p-4 rounded-lg border">
          <pre className="text-sm">
            {JSON.stringify(companies, null, 2)}
          </pre>
        </div>
      </section>

      {/* 부서 정보 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">부서 정보</h2>
        <div className="bg-card p-4 rounded-lg border">
          <pre className="text-sm">
            {JSON.stringify(departments, null, 2)}
          </pre>
        </div>
      </section>

      {/* 직급 정보 */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">직급 정보</h2>
        <div className="bg-card p-4 rounded-lg border">
          <pre className="text-sm">
            {JSON.stringify(positions, null, 2)}
          </pre>
        </div>
      </section>

      <div className="bg-muted p-4 rounded-lg">
        <p className="text-sm text-muted-foreground">
          이 페이지는 Supabase 데이터베이스 연결을 테스트하기 위한 페이지입니다.
          <br />
          정상적으로 데이터가 표시되면 Phase 1 초기 설정이 완료된 것입니다.
        </p>
      </div>
    </div>
  );
}
