import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/gallery", destination: "/about", permanent: true }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3200],
    imageSizes: [256, 384, 512, 640, 750, 828, 1080, 1200],
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
