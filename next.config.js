/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint errors during build — handled separately
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  reactStrictMode: true,

  // Compress all responses
  compress: true,

  // Image optimization — use external URLs directly (no Vercel resizing = no bandwidth)
  images: {
    unoptimized: true, // Don't proxy images through Vercel image optimizer (saves bandwidth)
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'apod.nasa.gov' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: '**.huggingface.co' },
    ],
  },

  async headers() {
    return [
      // Service Worker — no cache
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Static JS/CSS — cache 1 year (immutable, Vercel adds hash)
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // API routes — no cache by default
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
      // Manifest and icons — cache 24h
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }],
      },
    ];
  },

  // Reduce bundle size
  experimental: {
    optimizePackageImports: [],
  },
};

module.exports = nextConfig;
