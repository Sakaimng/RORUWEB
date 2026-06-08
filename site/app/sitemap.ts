import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

/**
 * Generated at /sitemap.xml. Lists every indexable route with a sensible
 * crawl priority. All pages are served from a single URL across languages,
 * so language variants are signalled via per-page metadata alternates, not here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/menu", priority: 0.9, changeFrequency: "monthly" },
    { path: "/reserve", priority: 0.9, changeFrequency: "monthly" },
    { path: "/events", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  ];

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
