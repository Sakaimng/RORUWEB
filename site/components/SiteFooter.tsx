"use client";

import { FooterLogo } from "@/components/FooterLogo";
import { INQUIRY_PUBLIC_EMAIL, SITE_MAP_URL } from "@/lib/content";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="roru-footer fixed bottom-0 left-0 z-[1] w-full bg-[var(--surface)] text-[var(--text)]">
      <div className="roru-footer__grid box-border flex min-h-svh flex-col px-[var(--roru-section-pad-x)]">
        <div className="roru-footer__layout">
          <div className="roru-footer__info-rail">
            <div className="roru-footer__col">
              <h3 className="roru-footer__label">{t.footer.contact}</h3>
              <a
                href={`mailto:${INQUIRY_PUBLIC_EMAIL}`}
                className="roru-footer__link"
              >
                {INQUIRY_PUBLIC_EMAIL.toUpperCase()}
              </a>
              <a href="tel:+85263175675" className="roru-footer__link">
                +852 6317 5675
              </a>
            </div>

            <div className="roru-footer__col">
              <h3 className="roru-footer__label">{t.footer.location}</h3>
              <a
                href={SITE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="roru-footer__link"
              >
                {t.footer.address1}
                <br />
                {t.footer.address2}
              </a>
            </div>

            <div className="roru-footer__col">
              <h3 className="roru-footer__label">{t.footer.social}</h3>
              <a
                href="https://www.instagram.com/rorubaru/"
                target="_blank"
                rel="noopener noreferrer"
                className="roru-footer__link"
              >
                INSTAGRAM
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61587043343492"
                target="_blank"
                rel="noopener noreferrer"
                className="roru-footer__link"
              >
                FACEBOOK
              </a>
            </div>

            <div className="roru-footer__col">
              <h3 className="roru-footer__label">{t.footer.hours}</h3>
              <p className="roru-footer__text">
                {t.footer.hoursWeekday}
                <br />
                {t.footer.hoursWeekdayCall}
              </p>
              <p className="roru-footer__text">
                {t.footer.hoursWeekend}
                <br />
                {t.footer.hoursWeekendCall}
              </p>
            </div>
          </div>

          <div className="roru-footer__logo-col">
            <FooterLogo />
          </div>
        </div>
      </div>
    </footer>
  );
}
