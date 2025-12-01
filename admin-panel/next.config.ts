import type { NextConfig } from "next";
import path from "path";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure path aliases work correctly
  webpack: (config, { isServer }) => {
    // Use tsconfig-paths-webpack-plugin to read paths from tsconfig.json
    if (config.resolve) {
      if (!config.resolve.plugins) {
        config.resolve.plugins = [];
      }
      config.resolve.plugins.push(
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, "tsconfig.json"),
        })
      );
    }
    
    return config;
  },
};

export default nextConfig;
