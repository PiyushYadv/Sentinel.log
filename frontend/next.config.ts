import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runner stage; Vercel uses its own build output
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
