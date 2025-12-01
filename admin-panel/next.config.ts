import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config, { isServer }) => {
    // Resolve path aliases for webpack
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Resolve @ alias to the project root
    const projectRoot = path.resolve(__dirname);
    config.resolve.alias["@"] = projectRoot;
    
    // Also ensure modules can be resolved from the project root
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }
    if (!config.resolve.modules.includes(projectRoot)) {
      config.resolve.modules.push(projectRoot);
    }
    
    return config;
  },
};

export default nextConfig;
