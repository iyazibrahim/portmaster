import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller Docker image: only traced server files, not full node_modules
  output: "standalone",
  // Serve public/ assets as-is. Standalone Docker copies public beside server.js;
  // the /_next/image optimizer often 400s there (cwd / sharp), which blanked every mark.
  images: {
    unoptimized: true,
  },
  // Lower peak RAM during `next build` on small VPS (4GB)
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
