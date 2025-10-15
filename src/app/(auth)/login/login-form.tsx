'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { login } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          로그인 중...
        </>
      ) : (
        '로그인'
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, undefined);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {/* 에러 메시지 */}
      {state?.error && (
        <Alert
          variant="destructive"
          className="animate-in fade-in-50 slide-in-from-top-2 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* 이메일 입력 */}
      <div className="space-y-2">
        <Label htmlFor="userId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Mail className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            id="userId"
            name="userId"
            type="text"
            placeholder="Enter your Email"
            className="h-12 pl-10 text-base bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-teal-500 dark:focus:border-teal-500"
            required
            autoFocus
            autoComplete="username"
          />
        </div>
      </div>

      {/* 비밀번호 입력 */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your Password"
            className="h-12 pl-10 text-base bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-teal-500 dark:focus:border-teal-500"
            required
            autoComplete="current-password"
          />
        </div>
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked as boolean)}
          />
          <label
            htmlFor="remember"
            className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            Remember Me
          </label>
        </div>
        <button
          type="button"
          className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      {/* 로그인 버튼 */}
      <SubmitButton />

      {/* 하단 링크 */}
      <div className="text-center pt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          계정이 없으신가요?{' '}
          <button
            type="button"
            className="text-teal-600 dark:text-teal-400 font-medium hover:underline"
          >
            관리자에게 문의
          </button>
        </p>
      </div>
    </form>
  );
}
