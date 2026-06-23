import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // for bulk import
    },
  },
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/reports/pdf': ['./node_modules/pdfkit/**/*'],
  },
}

export default nextConfig
