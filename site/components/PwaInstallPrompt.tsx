"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  dismissInstallPrompt,
  isIosInAppBrowser,
  isIosSafari,
  PWA_INSTALL_OPEN_EVENT,
  shouldOfferIosInstall,
} from "@/lib/pwa-install";

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

/** Guides iOS users through Add to Home Screen — Apple has no install API. */
export function PwaInstallPrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const inApp = isIosInAppBrowser();
  const safari = isIosSafari();

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PWA_INSTALL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!shouldOfferIosInstall()) return;

    function tryOpen() {
      if (
        document.documentElement.classList.contains("roru-preload") ||
        document.documentElement.classList.contains("roru-loading")
      ) {
        return;
      }
      setOpen(true);
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

        {inApp ? (
          <p className="roru-pwa-install__lead">{t.install.inAppLead}</p>
        ) : (
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
        )}

        <div className="roru-pwa-install__actions">
          <button type="button" className="roru-pwa-install__dismiss" onClick={close}>
            {t.install.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
