import type { NextConfig } from "next";
import path from "path";
import { existsSync } from "fs";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config, { isServer, dir }) => {
    // Use the dir parameter from Next.js which is always correct
    const projectRoot = dir || process.cwd();
    
    // Verify the lib directory exists
    const libPath = path.join(projectRoot, "lib");
    if (!existsSync(libPath)) {
      console.warn(`[webpack] Warning: lib directory not found at ${libPath}`);
      console.warn(`[webpack] Current working directory: ${process.cwd()}`);
      console.warn(`[webpack] Next.js dir: ${dir}`);
    }
    
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Completely override alias to ensure @ is set correctly
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": projectRoot,
    };
    
    // Log for debugging in Cloudflare build
    if (process.env.CI || process.env.CF_PAGES) {
      console.log(`[webpack] Setting @ alias to: ${projectRoot}`);
      console.log(`[webpack] Lib path exists: ${existsSync(libPath)}`);
    }
    
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
    
    // Add project root to modules
    if (!config.resolve.modules) {
      config.resolve.modules = ["node_modules"];
    }
    if (Array.isArray(config.resolve.modules)) {
      // Remove projectRoot if it exists, then add it at the beginning
      config.resolve.modules = config.resolve.modules.filter(m => m !== projectRoot);
      config.resolve.modules.unshift(projectRoot);
    }
    
    return config;
  },
};

export default nextConfig;
