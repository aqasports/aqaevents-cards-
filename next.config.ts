import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
