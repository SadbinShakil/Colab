/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Optimize for latest Next.js features
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker in webpack
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      }
    }

    // Handle file extensions for PDF.js
    config.resolve.extensions.push('.mjs')

    return config
  },
  // Handle static file serving
  async headers() {
    return [
      {
        source: '/pdf-worker/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 