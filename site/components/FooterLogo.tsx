"use client";

import Link from "next/link";
import { PATH_LINE_BOTTOM, PATH_LINE_TOP } from "@/lib/footer-logo-paths";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale-routing";

export function FooterLogo() {
  const { lang } = useI18n();
  return (
    <div
      className="roru-footer-logo flex min-h-0 w-full min-w-0 flex-col items-stretch max-md:h-full md:h-auto md:items-start"
    >
      <Link
        href={withLocale("/", lang)}
        className="roru-footer__logo-link"
        aria-label="RORUBARU home"
      >
        <div className="roru-footer-logo__svg-wrap flex h-full min-h-0 w-full max-w-full shrink-0 items-stretch max-md:h-full md:h-auto">
          <svg
            className="roru-footer__logo-svg h-full max-h-full w-full max-w-full shrink-0 max-md:h-full md:h-auto md:max-h-[min(88vh,820px)]"
            viewBox="0 0 267 136"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            preserveAspectRatio="xMinYMid meet"
          >
            <g className="roru-footer-logo__line">
              {PATH_LINE_TOP.map((d, i) => (
                <path key={`t-${i}`} d={d} fill="#F54500" />
              ))}
            </g>
            <g className="roru-footer-logo__line">
              {PATH_LINE_BOTTOM.map((d, i) => (
                <path key={`b-${i}`} d={d} fill="#F54500" />
              ))}
            </g>
          </svg>
        </div>
      </Link>
    </div>
  );
}
