import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { UserWithDetails } from '@/types';

/**
 * 현재 인증된 사용자 가져오기
 * 인증되지 않은 경우 로그인 페이지로 리다이렉트
 */
export async function getCurrentUser(): Promise<UserWithDetails> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect('/login');
  }

  // users 테이블에서 전체 사용자 정보 가져오기
  const { data: user, error } = await supabase
    .from('users')
    .select(
      `
      *,
      department:departments(*),
      position:positions(*),
      company:companies(*)
    `
    )
    .eq('id', authUser.id)
    .single();

  if (error || !user) {
    redirect('/login');
  }

  return user as UserWithDetails;
}

/**
 * 관리자 권한 확인
 * Admin이 아니면 홈으로 리다이렉트
 */
export async function requireAdmin(): Promise<UserWithDetails> {
  const user = await getCurrentUser();

  if (user.role !== 'admin') {
    redirect('/');
  }

  return user;
}

/**
 * 인증 여부만 확인 (리다이렉트 없음)
 */
export async function getUser(): Promise<UserWithDetails | null> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select(
      `
      *,
      department:departments(*),
      position:positions(*),
      company:companies(*)
    `
    )
    .eq('id', authUser.id)
    .single();

  return (user as UserWithDetails) || null;
}
