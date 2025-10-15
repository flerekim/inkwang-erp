'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';

export async function login(
  prevState: { error: string } | undefined,
  formData: FormData
) {
  const supabase = await createClient();

  // 폼 데이터 추출
  const userId = formData.get('userId') as string;
  const password = formData.get('password') as string;

  // 유효성 검사
  const validation = loginSchema.safeParse({ userId, password });

  if (!validation.success) {
    return {
      error: validation.error.issues[0].message,
    };
  }

  // 이메일 생성 (@inkwang.co.kr 추가)
  const email = `${userId}@${process.env.NEXT_PUBLIC_DOMAIN}`;

  // 로그인 시도
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: '아이디 또는 비밀번호가 올바르지 않습니다.',
    };
  }

  // 성공 시 대시보드로 리다이렉트
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      error: '로그아웃에 실패했습니다.',
    };
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
