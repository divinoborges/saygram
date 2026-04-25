import type { NextConfig } from "next";

const basePath = process.env.NODE_ENV === "production" ? "/saygram" : "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
