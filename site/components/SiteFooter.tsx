"use client";

import { FooterLogo } from "@/components/FooterLogo";
import { INQUIRY_PUBLIC_EMAIL, SITE_MAP_URL } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="roru-footer fixed bottom-0 left-0 z-[1] w-full bg-black text-[#f5f5f5]">
      <div className="roru-footer__grid box-border flex min-h-screen flex-col px-[2vw]">
        <div className="roru-footer__layout">
          <div className="roru-footer__info-rail">
            <div className="roru-footer__col">
              <h3 className="roru-footer__label">Contact</h3>
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
              <h3 className="roru-footer__label">Location</h3>
              <a
                href={SITE_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="roru-footer__link"
              >
                G/F, 100–102 QUEEN&apos;S ROAD EAST,
                <br />
                WAN CHAI, HONG KONG ISLAND
              </a>
            </div>

            <div className="roru-footer__col">
              <h3 className="roru-footer__label">Social</h3>
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
              <h3 className="roru-footer__label">Opening hours</h3>
              <p className="roru-footer__text">
                SUN - THURS: 12 PM - 10 PM
                <br />
                (Last Call 9:30pm)
              </p>
              <p className="roru-footer__text">
                FRI - SAT: 12 PM - 12 AM
                <br />
                (Last Call 10:30pm)
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
