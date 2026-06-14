/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip ESLint errors during production build (Render deploy)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip TypeScript errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep Node.js-only CJS packages out of the browser bundle.
  // Fixes: TypeError: __webpack_require__.n is not a function
  // Note: Next.js 14 uses experimental.serverComponentsExternalPackages
  experimental: {
    serverComponentsExternalPackages: [
      'mongoose',
      'bcryptjs',
      'twilio',
      'socket.io',
      'firebase-admin',
      'multer',
      'jsonwebtoken',
      '@google-cloud/vision',
      '@google-cloud/text-to-speech',
      'form-data',
    ],
  },
};

export default nextConfig;
