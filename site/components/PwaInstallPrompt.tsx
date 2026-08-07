"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  canTriggerNativeInstall,
  dismissInstallPrompt,
  initDeferredInstallPrompt,
  isAndroidMobile,
  isIosInAppBrowser,
  isIosDevice,
  isIosSafari,
  markInstallPromptShownThisSession,
  openInstallPrompt,
  PWA_INSTALL_OPEN_EVENT,
  PWA_INSTALL_READY_EVENT,
  shouldOfferIosInstall,
  triggerNativeInstall,
} from "@/lib/pwa-install";

const EVENT_ANNOUNCEMENT_SESSION_KEY = "roru-event-announcement-seen";

function hasSeenEventAnnouncement(): boolean {
  try {
    return window.sessionStorage.getItem(EVENT_ANNOUNCEMENT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14a1 1 0 001-1v-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Guides mobile users through installing the PWA (iOS manual steps or Android prompt). */
export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [nativeInstallReady, setNativeInstallReady] = useState(false);
  const android = isAndroidMobile();
  const ios = isIosDevice();
  const inApp = isIosInAppBrowser();
  const safari = isIosSafari();

  useEffect(() => initDeferredInstallPrompt(), []);

  useEffect(() => {
    function syncNativeReady() {
      setNativeInstallReady(canTriggerNativeInstall());
    }

    syncNativeReady();
    window.addEventListener(PWA_INSTALL_READY_EVENT, syncNativeReady);
    return () => window.removeEventListener(PWA_INSTALL_READY_EVENT, syncNativeReady);
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
      setNativeInstallReady(canTriggerNativeInstall());
    }
    window.addEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!shouldOfferIosInstall()) return;

    function tryOpen() {
      if (!shouldOfferIosInstall()) return;
      if (
        hasSeenEventAnnouncement() ||
        document.documentElement.classList.contains("roru-preload") ||
        document.documentElement.classList.contains("roru-loading") ||
        document.body.classList.contains("roru-event-announcement-open")
      ) {
        return;
      }
      markInstallPromptShownThisSession();
      openInstallPrompt();
    }

    const timer = window.setTimeout(tryOpen, 2800);
    const observer = new MutationObserver(tryOpen);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  async function onNativeInstall() {
    const accepted = await triggerNativeInstall();
    if (accepted) setOpen(false);
    setNativeInstallReady(canTriggerNativeInstall());
  }

  function close() {
    dismissInstallPrompt();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="roru-pwa-install"
      role="dialog"
      aria-labelledby="roru-pwa-install-title"
      aria-live="polite"
    >
      <div className="roru-pwa-install__panel">
        <p id="roru-pwa-install-title" className="roru-pwa-install__title">
          {t.install.title}
        </p>

        {android ? (
          <>
            <p className="roru-pwa-install__lead">{t.install.androidLead}</p>
            {nativeInstallReady ? (
              <div className="roru-pwa-install__actions roru-pwa-install__actions--primary">
                <button
                  type="button"
                  className="roru-pwa-install__install"
                  onClick={onNativeInstall}
                >
                  {t.install.installButton}
                </button>
              </div>
            ) : (
              <ol className="roru-pwa-install__steps">
                <li>{t.install.androidStepMenu}</li>
                <li>{t.install.androidStepInstall}</li>
              </ol>
            )}
          </>
        ) : ios && inApp ? (
          <p className="roru-pwa-install__lead">{t.install.inAppLead}</p>
        ) : ios ? (
          <>
            <p className="roru-pwa-install__lead">{t.install.lead}</p>
            <ol className="roru-pwa-install__steps">
              <li>
                <span className="roru-pwa-install__step-icon" aria-hidden>
                  <ShareIcon />
                </span>
                <span>{t.install.stepShare}</span>
              </li>
              <li>{t.install.stepAdd}</li>
              <li>{t.install.stepConfirm}</li>
            </ol>
            {!safari ? (
              <p className="roru-pwa-install__note">{t.install.safariNote}</p>
            ) : null}
          </>
        ) : null}

        <div className="roru-pwa-install__actions">
          <button type="button" className="roru-pwa-install__dismiss" onClick={close}>
            {t.install.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
