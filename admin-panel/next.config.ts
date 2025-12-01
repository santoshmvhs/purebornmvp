import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable Turbopack for Cloudflare Pages compatibility
  // Turbopack has issues with path aliases in some build environments
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
