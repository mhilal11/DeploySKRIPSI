/** @type {import('next').NextConfig} */
function normalizeOrigin(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

const backendApiOrigin = normalizeOrigin(
  process.env.BACKEND_API_ORIGIN ??
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ??
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : ''),
);

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'recharts',
      'framer-motion',
    ],
  },
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-left',
  },
  async rewrites() {
    if (!backendApiOrigin) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${backendApiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
