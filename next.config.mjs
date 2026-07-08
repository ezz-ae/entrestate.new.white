/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // ESLint is not wired into this minimal repo; typecheck + build are the gate.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
