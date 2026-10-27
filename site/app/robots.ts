import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Generated at /robots.txt. Allows all crawlers, blocks only API routes,
 * and points to the sitemap so search engines discover every page.
 */
/**
 * AI answer engines and AI search crawlers are ALLOWED (Dominic, Oct 27 2026), so
 * ChatGPT, Perplexity, Claude, Apple Intelligence and Gemini can read and quote
 * the site when people ask about hand rolls in Hong Kong. They fall under "*".
 * Only bulk scrapers that build training datasets / resell content are refused.
 */
const BLOCKED_SCRAPERS = [
  "CCBot",
  "Bytespider",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "Omgili",
  "img2dataset",
];

/** Named explicitly so the welcome is unambiguous (same rules as "*"). */
const AI_SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
  "Applebot",
  "Applebot-Extended",
  "Google-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "FacebookBot",
  "cohere-ai",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/story"],
      },
      {
        userAgent: AI_SEARCH_BOTS,
        allow: "/",
        disallow: ["/api/", "/story"],
      },
      {
        userAgent: BLOCKED_SCRAPERS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
