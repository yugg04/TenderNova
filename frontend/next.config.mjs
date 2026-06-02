import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
        ]
      }
    ];
  },
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: '200gb'
    }
  },
  webpack: (config) => {
    config.resolve.modules = [...(config.resolve.modules ?? []), path.resolve(process.cwd(), 'node_modules')];
    return config;
  }
};

export default nextConfig;
