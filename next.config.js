/** @type {import('next').NextConfig} */
const nextConfig = {
  // Разрешаем выполнение fetch запросов в API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
