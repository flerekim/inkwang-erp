'use client';

/**
 * LazyComponent 컴포넌트
 * @description Intersection Observer를 사용한 Lazy Loading 컴포넌트
 * @requires react-intersection-observer v9+
 */

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyComponentProps {
  /** 실제 렌더링할 컴포넌트 */
  children: React.ReactNode;
  /** 로딩 중 표시할 컴포넌트 (기본값: Skeleton) */
  fallback?: React.ReactNode;
  /** Intersection Observer threshold (기본값: 0.1) */
  threshold?: number;
  /** 한 번만 트리거 (기본값: true) */
  triggerOnce?: boolean;
  /** 루트 마진 (기본값: '200px') */
  rootMargin?: string;
}

/**
 * 뷰포트에 들어올 때 컴포넌트를 lazy load하는 래퍼 컴포넌트
 *
 * @example
 * ```tsx
 * <LazyComponent>
 *   <HeavyComponent />
 * </LazyComponent>
 * ```
 */
export function LazyComponent({
  children,
  fallback,
  threshold = 0.1,
  triggerOnce = true,
  rootMargin = '200px',
}: LazyComponentProps) {
  const { ref, inView } = useInView({
    triggerOnce,
    threshold,
    rootMargin,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (inView) {
      setIsLoaded(true);
    }
  }, [inView]);

  const defaultFallback = (
    <div className="w-full h-64 flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  );

  return (
    <div ref={ref} className="w-full">
      {isLoaded ? children : fallback || defaultFallback}
    </div>
  );
}
