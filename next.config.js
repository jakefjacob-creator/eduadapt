/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "pdf-lib"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Type errors still fail the build; we don't want lint nitpicks to.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
