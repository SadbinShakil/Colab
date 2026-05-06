import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist requires canvas to be stubbed out in the browser build
    config.resolve.alias.canvas = false
    return config
  },
};

export default nextConfig;
