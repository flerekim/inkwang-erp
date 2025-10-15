import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * 브라우저 환경에서 사용하는 Supabase 클라이언트 생성
 * 클라이언트 컴포넌트에서 사용
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
