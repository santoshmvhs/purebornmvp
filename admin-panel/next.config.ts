import type { NextConfig } from "next";
import path from "path";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config, { isServer }) => {
    const projectRoot = path.resolve(__dirname);
    
    // Ensure resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Set up alias manually as primary method
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias["@"] = projectRoot;
    
    // Also use tsconfig-paths plugin as fallback
    if (!config.resolve.plugins) {
      config.resolve.plugins = [];
    }
    config.resolve.plugins.push(
      new TsconfigPathsPlugin({
        configFile: path.resolve(projectRoot, "tsconfig.json"),
        extensions: [".ts", ".tsx", ".js", ".jsx"],
      })
    );
    
    // Ensure project root is in modules
    if (!config.resolve.modules) {
      config.resolve.modules = ["node_modules"];
    }
    if (!config.resolve.modules.includes(projectRoot)) {
      config.resolve.modules.unshift(projectRoot);
    }
    
    return config;
  },
};

export default nextConfig;
