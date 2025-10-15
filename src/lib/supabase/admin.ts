import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Admin 작업용 Supabase 클라이언트
 * Service Role Key 사용 (RLS 우회)
 *
 * ⚠️ 주의: 이 클라이언트는 서버 사이드에서만 사용해야 합니다.
 * Service Role Key는 모든 RLS 정책을 우회하므로 신중하게 사용하세요.
 *
 * 사용 예:
 * - auth.admin.createUser() - 사용자 생성
 * - auth.admin.deleteUser() - 사용자 삭제
 * - RLS 정책이 필요한 테이블 직접 조작
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase Admin Client 생성 실패: 환경 변수를 확인하세요. (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
