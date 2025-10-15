'use client';

/**
 * AnimatedCard 컴포넌트
 * @description Framer Motion을 사용한 애니메이션 카드 컴포넌트
 * @requires Framer Motion v12+ (React 19 호환)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cardVariants } from '@/components/animations/page-variants';

type CardProps = React.ComponentProps<typeof Card>;

export function AnimatedCard({ children, ...props }: CardProps) {
  return (
    <motion.div
      initial={cardVariants.initial}
      animate={cardVariants.animate}
      whileHover={cardVariants.hover}
    >
      <Card {...props}>{children}</Card>
    </motion.div>
  );
}
