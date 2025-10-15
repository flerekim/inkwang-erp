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
    ],
  },

  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;