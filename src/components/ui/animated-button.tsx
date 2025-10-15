'use client';

/**
 * AnimatedButton 컴포넌트
 * @description Framer Motion을 사용한 인터랙티브 버튼 컴포넌트
 * @requires Framer Motion v12+ (React 19 호환)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { buttonVariants as animationVariants } from '@/components/animations/page-variants';

type ButtonProps = React.ComponentProps<typeof Button>;

export function AnimatedButton({ children, ...props }: ButtonProps) {
  return (
    <motion.div
      whileHover={animationVariants.hover}
      whileTap={animationVariants.tap}
      transition={animationVariants.transition}
    >
      <Button {...props}>{children}</Button>
    </motion.div>
  );
}
