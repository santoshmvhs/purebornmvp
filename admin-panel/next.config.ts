import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config, { isServer }) => {
    // Get the absolute path to the project root
    // Use process.cwd() as it's more reliable in build environments
    const projectRoot = path.resolve(process.cwd());
    
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Set up alias - ensure it's an object, not array
    const existingAlias = config.resolve.alias || {};
    const alias = typeof existingAlias === "object" && !Array.isArray(existingAlias)
      ? existingAlias
      : {};
    
    // Set @ alias to project root
    config.resolve.alias = {
      ...alias,
      "@": projectRoot,
    };
    
    // Ensure extensions are resolved
    if (!config.resolve.extensions) {
      config.resolve.extensions = [];
    }
    const extensions = [".tsx", ".ts", ".jsx", ".js", ".json"];
    extensions.forEach(ext => {
      if (!config.resolve.extensions.includes(ext)) {
        config.resolve.extensions.unshift(ext);
      }
    });
    
    // Add project root to modules if not already there
    if (!config.resolve.modules) {
      config.resolve.modules = ["node_modules"];
    }
    if (Array.isArray(config.resolve.modules) && !config.resolve.modules.includes(projectRoot)) {
      config.resolve.modules.unshift(projectRoot);
    }
    
    return config;
  },
};

export default nextConfig;
