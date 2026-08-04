const DISMISS_KEY = "roru-pwa-install-dismissed";
const AUTO_PROMPT_SESSION_KEY = "roru-pwa-install-auto-shown";

export const PWA_INSTALL_OPEN_EVENT = "roru:pwa-install-open";
export const PWA_INSTALL_READY_EVENT = "roru:pwa-install-ready";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

/** Capture Chrome / Android install prompt when the browser offers it. */
export function initDeferredInstallPrompt(): () => void {
  if (typeof window === "undefined") return () => {};

  function onBeforeInstallPrompt(event: Event) {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_READY_EVENT));
  }

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    deferredInstallPrompt = null;
  };
}

export function canTriggerNativeInstall(): boolean {
  return deferredInstallPrompt != null;
}

export async function triggerNativeInstall(): Promise<boolean> {
  const prompt = deferredInstallPrompt;
  if (!prompt) return false;

  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  deferredInstallPrompt = null;
  return outcome === "accepted";
}

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

/** Android phones (excludes most tablets without Mobile in UA). */
export function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Mobile/i.test(ua);
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

export function canOfferMobileInstall(): boolean {
  return !isStandalonePwa() && (isIosDevice() || isAndroidMobile());
}

export function shouldOfferIosInstall(): boolean {
  return (
    isIosDevice() &&
    !isStandalonePwa() &&
    !isInstallPromptDismissed() &&
    !hasShownInstallPromptThisSession()
  );
}

export function isInstallPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function hasShownInstallPromptThisSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AUTO_PROMPT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records only the automatic landing reminder; manual menu opens stay available. */
export function markInstallPromptShownThisSession(): void {
  try {
    window.sessionStorage.setItem(AUTO_PROMPT_SESSION_KEY, "1");
  } catch {
    /* private browsing */
  }
}

export function dismissInstallPrompt(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* private browsing */
  }
}

/** Permanent menu entry — shown whenever mobile install is still available. */
export function canShowInstallMenuLink(): boolean {
  return canOfferMobileInstall();
}

export function openInstallPrompt(): void {
  window.dispatchEvent(new CustomEvent(PWA_INSTALL_OPEN_EVENT));
}
