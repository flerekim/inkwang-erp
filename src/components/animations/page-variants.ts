/**
 * Framer Motion 페이지 전환 애니메이션 variants
 * @description Next.js 15 + React 19 호환 페이지 전환 설정
 */

import type { Transition } from 'framer-motion';

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.6, -0.05, 0.01, 0.99], // Custom easing for smooth animation
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
    },
  },
};

export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

/**
 * 카드 호버 애니메이션 variants
 */
export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hover: {
    y: -8,
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    transition: { duration: 0.3 },
  },
};

/**
 * 버튼 상호작용 애니메이션 variants
 */
export const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
  transition: { type: 'spring', stiffness: 400, damping: 17 } as Transition,
};

/**
 * 통계 카드 값 애니메이션 variants
 */
export const statisticsValueVariants = {
  initial: { scale: 0.8 },
  animate: { scale: 1 },
  transition: { type: 'spring', stiffness: 200 } as Transition,
};
