import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller Docker image: only traced server files, not full node_modules
  output: "standalone",
  // Lower peak RAM during `next build` on small VPS (4GB)
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
