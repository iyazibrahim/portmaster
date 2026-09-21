import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Smaller Docker image: only traced server files, not full node_modules
  output: "standalone",
};

export default nextConfig;
