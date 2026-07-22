import type { MetadataRoute } from "next";
import { absoluteUrl, buildLanguageAlternates } from "@/lib/seo";
import { withLocale } from "@/lib/locale-routing";
import { ORDER_ONLINE_ENABLED } from "@/lib/site-flags";
import type { Lang } from "@/lib/i18n";

/**
 * Generated at /sitemap.xml. Emits every route in every language (English at
 * the root, plus /ja and /zh-Hant), and lists the hreflang alternates for each
 * URL so Google maps the language variants together.
 */
const LANGS: Lang[] = ["en", "jp", "cn"];

const ROUTES: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/menu", priority: 0.9, changeFrequency: "monthly" },
  ...(ORDER_ONLINE_ENABLED
    ? [{ path: "/order", priority: 0.9, changeFrequency: "monthly" as const }]
    : []),
  { path: "/reserve", priority: 0.9, changeFrequency: "monthly" },
  { path: "/events", priority: 0.8, changeFrequency: "weekly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of ROUTES) {
    const languages = buildLanguageAlternates(route.path);
    for (const lang of LANGS) {
      entries.push({
        url: absoluteUrl(withLocale(route.path, lang)),
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  return entries;
}
