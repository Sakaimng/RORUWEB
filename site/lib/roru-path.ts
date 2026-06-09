import { stripLocale } from "@/lib/locale-routing";

/**
 * Normalizes a pathname for route checks: strips any locale prefix
 * ("/zh-Hant/menu" -> "/menu") and trailing slashes. Used everywhere the
 * animation/loader logic needs to know "which page is this" regardless of language.
 */
export function normalizeAppPathname(pathname: string): string {
  return stripLocale(pathname);
}

export function isHomePathname(pathname?: string): boolean {
  const raw =
    pathname ?? (typeof window === "undefined" ? "/" : window.location.pathname);
  return stripLocale(raw) === "/";
}

export function isMenuPath(pathname?: string): boolean {
  const raw =
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  return stripLocale(raw) === "/menu";
}

/** @deprecated Use isMenuPath */
export function isMenuOrGalleryPath(pathname?: string): boolean {
  return isMenuPath(pathname);
}
