import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Generated at /robots.txt. Allows all crawlers, blocks only API routes,
 * and points to the sitemap so search engines discover every page.
 */
/**
 * AI-training and content-copy scrapers are refused site-wide. Search engines
 * (Googlebot, Bingbot, Applebot, DuckDuckBot…) and link previews
 * (facebookexternalhit, Twitterbot, WhatsApp) stay fully allowed via "*".
 * Google-Extended / Applebot-Extended only opt out of AI training, not search.
 */
const AI_SCRAPERS = [
  "GPTBot",
  "ChatGPT-User",
  "CCBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "Omgili",
  "FacebookBot",
  "Meta-ExternalAgent",
  "cohere-ai",
  "img2dataset",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/story", "/family", "/staff", "/loyalty/"],
      },
      {
        userAgent: AI_SCRAPERS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
