import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Generated at /sitemap.xml. The 3D room at / is the whole site: the old page URLs
 * (/menu, /about, /ja ...) serve the same room with a panel open and point their
 * canonical at /, so only / is listed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
