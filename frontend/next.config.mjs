/** @type {import('next').NextConfig} */
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
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
