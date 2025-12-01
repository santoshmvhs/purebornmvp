import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config) => {
    // Get the absolute path to the project root
    const projectRoot = path.resolve(__dirname);
    
    // Override resolve configuration
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": projectRoot,
    };
    
    // Ensure extensions are resolved
    config.resolve.extensions = [
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".json",
      ...(config.resolve.extensions || []),
    ];
    
    return config;
  },
};

export default nextConfig;
