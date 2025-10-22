import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Tailwind CSS v4 Turbopack 통합
  turbopack: {
    resolveExtensions: [
      '.mdx',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.mjs',
      '.json',
    ],
  },

  // PWA 설정 (Phase 5에서 구현)
  // experimental: {
  //   pwa: {
  //     dest: 'public',
  //     disable: process.env.NODE_ENV === 'development'
  //   }
  // },

  // 이미지 최적화 설정
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'image.aladin.co.kr',
      },
    ],
  },

  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 실험적 기능
  experimental: {
    // React Server Actions 최적화
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // PPR (Partial Prerendering) - Next.js 15의 새로운 렌더링 모드
    ppr: false, // 안정화되면 true로 변경 권장
  },
};

export default nextConfig;