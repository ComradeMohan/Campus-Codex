
import type { NextConfig } from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV !== 'production';

const withPWA = withPWAInit({
  dest: 'public',
  disable: isDev,
  register: true,
  skipWaiting: true,
  // fallbacks: { // Optional: for offline support beyond basic caching
  //   document: '/_offline', // Fallback for document pages
  //   // image: '/static/images/fallback.png', // Fallback for images
  //   // font: '/static/fonts/fallback.woff2', // Fallback for fonts
  //   // etc.
  // },
  // runtimeCaching: [ // Example: Cache API calls
  //   {
  //     urlPattern: /^https?.*/, // Adjust this to match your API routes
  //     handler: 'NetworkFirst',
  //     options: {
  //       cacheName: 'api-cache',
  //       networkTimeoutSeconds: 10,
  //       expiration: {
  //         maxEntries: 50,
  //         maxAgeSeconds: 5 * 60, // 5 minutes
  //       },
  //       cacheableResponse: {
  //         statuses: [0, 200],
  //       },
  //     },
  //   },
  // ],
});

const securityHeaders = [
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'no-referrer-when-downgrade',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    },
];


const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co', 
        port: '',
        pathname: '/**',
      },
    ],
  },
  transpilePackages: ['monaco-editor'], // Required for Monaco Editor
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withPWA(nextConfig);
