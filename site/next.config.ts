import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        /** The 3D RORUBARU room (static, in public/) is the homepage. Language and inner pages stay Next.js routes. */
        { source: "/", destination: "/rorubaru-3d.html" },
        /** The two largest story videos are served from the site's mirror (too big for the repo upload path). */
        { source: "/story/story_v3_16x9.mp4", destination: "https://rorubaru-live-counter.sites.tab.bot/story/story_v3_16x9.mp4" },
        { source: "/story/story_v3_9x16.mp4", destination: "https://rorubaru-live-counter.sites.tab.bot/story/story_v3_9x16.mp4" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  /** Anti-framing: other sites can't show rorubaru.com inside their own page (iframe). Tock/delivery links open in new tabs, so they're unaffected. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/gallery", destination: "/about", permanent: true },
      { source: "/ja/gallery", destination: "/ja/about", permanent: true },
      { source: "/zh-Hant/gallery", destination: "/zh-Hant/about", permanent: true },
    ];
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
    /** Global 404 with its own <html>; needed because each locale has its own root layout. */
    globalNotFound: true,
  },
};

export default nextConfig;
