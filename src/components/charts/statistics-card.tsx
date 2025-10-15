'use client';

/**
 * StatisticsCard 컴포넌트
 * @description 통계 데이터를 표시하는 애니메이션 카드
 * @requires Framer Motion, lucide-react
 */

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statisticsValueVariants } from '@/components/animations/page-variants';

interface StatisticsCardProps {
  /** 카드 제목 */
  title: string;
  /** 현재 값 */
  value: number;
  /** 전월 대비 변화율 (%) */
  change: number;
  /** 아이콘 */
  icon?: React.ReactNode;
  /** 포맷 타입 */
  formatType?: 'number' | 'currency' | 'custom';
  /** 접두사 (예: ₩) */
  prefix?: string;
  /** 접미사 (예: 명, 개) */
  suffix?: string;
}

/**
 * 통계 데이터를 애니메이션과 함께 표시하는 카드 컴포넌트
 */
export function StatisticsCard({
  title,
  value,
  change,
  icon,
  formatType = 'number',
  prefix = '',
  suffix = '',
}: StatisticsCardProps) {
  const isPositive = change >= 0;

  const formatValue = (val: number): string => {
    switch (formatType) {
      case 'currency':
        return `${prefix}${(val / 1000000).toFixed(1)}M${suffix}`;
      case 'custom':
        return `${prefix}${val}${suffix}`;
      case 'number':
      default:
        return `${prefix}${val.toLocaleString()}${suffix}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <motion.div
            className="text-2xl font-bold"
            initial={statisticsValueVariants.initial}
            animate={statisticsValueVariants.animate}
            transition={statisticsValueVariants.transition}
          >
            {formatValue(value)}
          </motion.div>
          <div
            className={cn(
              'flex items-center text-xs mt-1',
              isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {change.toFixed(1)}% 전월 대비
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
