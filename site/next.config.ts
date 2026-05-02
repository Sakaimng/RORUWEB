import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /** Long cache for stable public assets. */
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
        pathname: "/content/**",
      },
    ],
  },
  experimental: {
    /** Smaller client bundles for packages that re-export many modules. */
    optimizePackageImports: ["gsap"],
  },
};

export default nextConfig;
