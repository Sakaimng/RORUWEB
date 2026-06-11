const DISMISS_KEY = "roru-pwa-install-dismissed";

export const PWA_INSTALL_OPEN_EVENT = "roru:pwa-install-open";

/** True when the site is already running as an installed home-screen app. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

/** iPhone, iPod, iPad (including iPadOS reporting as Mac). */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Social / in-app browsers on iOS that block Add to Home Screen. */
export function isIosInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp|GSA\/|Snapchat/i.test(
    navigator.userAgent
  );
}

export function isIosSafari(): boolean {
  if (!isIosDevice() || isIosInAppBrowser()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

export function shouldOfferIosInstall(): boolean {
  return isIosDevice() && !isStandalonePwa() && !isInstallPromptDismissed();
}

export function isInstallPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private browsing */
  }
}

/** Permanent menu entry — shown whenever iOS install is still available. */
export function canShowInstallMenuLink(): boolean {
  return isIosDevice() && !isStandalonePwa();
}

export function openInstallPrompt(): void {
  window.dispatchEvent(new CustomEvent(PWA_INSTALL_OPEN_EVENT));
}
