import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="grid lg:grid-cols-2 w-full min-h-screen">
      {/* 좌측: 3D 그래픽 영역 */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950 p-12 relative overflow-hidden">
        {/* 배경 장식 */}
        <div className="absolute inset-0 bg-grid-slate-200 dark:bg-grid-slate-800 [mask-image:radial-gradient(white,transparent_70%)]" />

        {/* 3D 아이소메트릭 큐브 그래픽 */}
        <div className="relative w-full max-w-lg">
          {/* 메인 큐브 그룹 */}
          <div className="relative w-full aspect-square">
            {/* 중앙 큐브 (청록색) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
              <div className="relative w-full h-full transform-gpu rotate-45 animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-3xl shadow-2xl opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-3xl" />
              </div>
            </div>

            {/* 주변 작은 큐브들 */}
            {[...Array(6)].map((_, i) => {
              const positions = [
                { top: '10%', left: '15%', rotate: '30deg', delay: '0s' },
                { top: '15%', right: '20%', rotate: '-20deg', delay: '0.5s' },
                { bottom: '20%', left: '10%', rotate: '40deg', delay: '1s' },
                { bottom: '15%', right: '15%', rotate: '-30deg', delay: '1.5s' },
                { top: '40%', left: '5%', rotate: '15deg', delay: '2s' },
                { top: '35%', right: '8%', rotate: '-35deg', delay: '2.5s' },
              ];
              const pos = positions[i];

              return (
                <div
                  key={i}
                  className="absolute w-24 h-24 transform-gpu"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    right: pos.right,
                    bottom: pos.bottom,
                    rotate: pos.rotate,
                    animationDelay: pos.delay,
                  }}
                >
                  <div className="relative w-full h-full animate-float">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-300 to-purple-400 rounded-2xl shadow-lg opacity-70" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-2xl" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 텍스트 */}
          <div className="absolute -bottom-20 left-0 right-0 text-center">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              인광 ONE ERP
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              환경을 생각하는 스마트 관리 시스템
            </p>
          </div>
        </div>
      </div>

      {/* 우측: 로그인 폼 영역 */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md">
          {/* 로고 */}
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-2xl font-bold text-white">인광</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              인광 ONE ERP
            </p>
          </div>

          {/* 타이틀 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome
            </h1>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              To 인광 ONE ERP
            </p>
          </div>

          {/* 로그인 폼 */}
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
