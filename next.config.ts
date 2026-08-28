import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Résultats et selfies transitent par des URL signées Supabase Storage.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/sign/**' },
    ],
  },
  eslint: {
    dirs: ['src'],
  },
};

export default nextConfig;
