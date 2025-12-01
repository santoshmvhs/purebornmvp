import type { NextConfig } from "next";
import path from "path";
import { existsSync, readdirSync } from "fs";

const nextConfig: NextConfig = {
  /* config options here */
  // Disable webpack cache in production to reduce build output size for Cloudflare Pages
  webpack: (config, { isServer, dir, dev }) => {
    // Disable cache in production builds to reduce output size
    if (!dev && process.env.CF_PAGES) {
      config.cache = false;
    }
    // Try multiple possible root paths
    const possibleRoots = [
      dir,
      process.cwd(),
      path.resolve(process.cwd()),
      path.resolve(__dirname || process.cwd()),
    ].filter(Boolean);
    
    // Find the actual root by checking for lib directory
    let projectRoot = possibleRoots[0];
    for (const root of possibleRoots) {
      const libPath = path.join(root, "lib");
      if (existsSync(libPath)) {
        projectRoot = root;
        break;
      }
    }
    
    // If still not found, try checking parent directories
    if (!existsSync(path.join(projectRoot, "lib"))) {
      let current = projectRoot;
      for (let i = 0; i < 3; i++) {
        current = path.dirname(current);
        if (existsSync(path.join(current, "lib"))) {
          projectRoot = current;
          break;
        }
      }
    }
    
    // Debug: List what's actually in the directory
    if (process.env.CI || process.env.CF_PAGES) {
      try {
        const dirContents = readdirSync(projectRoot);
        console.log(`[webpack] Directory contents: ${dirContents.join(", ")}`);
        console.log(`[webpack] Using project root: ${projectRoot}`);
        console.log(`[webpack] Lib exists: ${existsSync(path.join(projectRoot, "lib"))}`);
      } catch (e) {
        console.log(`[webpack] Could not read directory: ${e}`);
      }
    }
    
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Set alias - try both with and without trailing slash
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": projectRoot,
      "@/": path.join(projectRoot, "/"),
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
    
    // Add project root to modules
    if (!config.resolve.modules) {
      config.resolve.modules = ["node_modules"];
    }
    if (Array.isArray(config.resolve.modules)) {
      config.resolve.modules = config.resolve.modules.filter((m: string) => m !== projectRoot);
      config.resolve.modules.unshift(projectRoot);
    }
    
    return config;
  },
};

export default nextConfig;
