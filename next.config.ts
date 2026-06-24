import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: "/eventcard/:path*",
        destination: "/eventscard/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
