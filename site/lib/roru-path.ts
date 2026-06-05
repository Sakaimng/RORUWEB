export function normalizeAppPathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const noTrail = pathname.replace(/\/+$/, "");
  return noTrail === "" ? "/" : noTrail;
}

export function isHomePathname(pathname?: string): boolean {
  const path =
    typeof window === "undefined"
      ? normalizeAppPathname(pathname ?? "/")
      : normalizeAppPathname(pathname ?? window.location.pathname);
  return path === "/";
}

export function isMenuPath(pathname?: string): boolean {
  const path =
    typeof window === "undefined"
      ? normalizeAppPathname(pathname ?? "")
      : normalizeAppPathname(pathname ?? window.location.pathname);
  return path === "/menu";
}

/** @deprecated Use isMenuPath */
export function isMenuOrGalleryPath(pathname?: string): boolean {
  return isMenuPath(pathname);
}
