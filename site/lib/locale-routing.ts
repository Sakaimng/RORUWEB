/**
 * URL <-> language mapping for locale-segmented routing.
 *
 * English is the default locale and lives at the root with NO prefix ("/").
 * Japanese and Traditional Chinese live under "/ja" and "/zh-Hant".
 *
 * All route-aware logic (active nav, page transitions, home/menu detection)
 * must run on the LOCALE-STRIPPED path via `stripLocale()`, and all internal
 * links must be built with `withLocale()` so they stay in the current language.
 */
import type { Lang } from "@/lib/i18n";

/** Non-default languages and their URL segment. English ("en") is implicit. */
export const LOCALE_SEGMENTS: Record<Exclude<Lang, "en">, string> = {
  jp: "ja",
  cn: "zh-Hant",
};

/** BCP-47 tag per language, for <html lang> + hreflang. */
export const LOCALE_HREFLANG: Record<Lang, string> = {
  en: "en-HK",
  jp: "ja-JP",
  cn: "zh-Hant-HK",
};

/** All supported URL segments (excluding the implicit English root). */
export const PREFIXED_SEGMENTS = Object.values(LOCALE_SEGMENTS);

/** Maps a URL segment back to a Lang (or null if it isn't a locale segment). */
function segmentToLang(segment: string): Lang | null {
  for (const [lang, seg] of Object.entries(LOCALE_SEGMENTS)) {
    if (seg === segment) return lang as Lang;
  }
  return null;
}

/** Derives the active language from a pathname's leading segment. */
export function langFromPathname(pathname: string | null | undefined): Lang {
  if (!pathname) return "en";
  const first = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return segmentToLang(first) ?? "en";
}

/**
 * Removes any locale prefix, returning the canonical English-equivalent path
 * (always starting with "/"). "/zh-Hant/menu" -> "/menu"; "/ja" -> "/".
 */
export function stripLocale(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const segments = pathname.replace(/^\/+/, "").split("/");
  if (segments[0] && segmentToLang(segments[0])) segments.shift();
  const rest = segments.filter(Boolean).join("/");
  return rest ? `/${rest}` : "/";
}

/**
 * Builds a path in the given language. English returns the bare path;
 * other languages get the locale segment prefixed.
 * withLocale("/menu", "cn") -> "/zh-Hant/menu"; withLocale("/", "en") -> "/".
 */
export function withLocale(path: string, lang: Lang): string {
  const clean = stripLocale(path);
  if (lang === "en") return clean;
  const seg = LOCALE_SEGMENTS[lang as Exclude<Lang, "en">];
  return clean === "/" ? `/${seg}` : `/${seg}${clean}`;
}
