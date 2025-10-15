'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validations';

export async function login(
  prevState: { error: string } | undefined,
  formData: FormData
) {
  try {
    const supabase = await createClient();

    // 폼 데이터 추출
    const userId = formData.get('userId') as string;
    const password = formData.get('password') as string;

    // 환경 변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'inkwang.co.kr';

    console.log('[Login Debug] Environment Check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      domain: domain,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Login Error] Missing Supabase environment variables');
      return {
        error: '서버 설정 오류입니다. 관리자에게 문의하세요.',
      };
    }

    // 유효성 검사
    const validation = loginSchema.safeParse({ userId, password });

    if (!validation.success) {
      console.log('[Login Debug] Validation failed:', validation.error.issues);
      return {
        error: validation.error.issues[0].message,
      };
    }

    // 이메일 생성 (@inkwang.co.kr 추가)
    const email = `${userId}@${domain}`;
    console.log('[Login Debug] Attempting login with email:', email);

    // 로그인 시도
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Login Error] Supabase auth error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      return {
        error: '아이디 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    if (!data.session) {
      console.error('[Login Error] No session created');
      return {
        error: '로그인에 실패했습니다. 다시 시도해주세요.',
      };
    }

    console.log('[Login Success] User logged in:', data.user?.email);

    // 성공 시 대시보드로 리다이렉트
    revalidatePath('/', 'layout');
    redirect('/');
  } catch (error) {
    console.error('[Login Exception]', error);
    return {
      error: '로그인 처리 중 오류가 발생했습니다.',
    };
  }
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
