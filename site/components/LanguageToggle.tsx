"use client";

import { LANGS, LANG_LABELS, useI18n } from "@/lib/i18n";

/** EN / JP / CN segmented control used in the nav (desktop) and mobile menu. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`roru-nav-item inline-flex shrink-0 items-center rounded-full bg-[color:color-mix(in_srgb,var(--surface)_68%,transparent)] p-1 backdrop-blur-md ${className}`}
    >
      {LANGS.map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            aria-label={`Switch language to ${LANG_LABELS[code]}`}
            onClick={() => setLang(code)}
            className={`rounded-full px-2.5 py-1.5 text-xs font-bold uppercase leading-none transition-opacity sm:px-3 ${
              active
                ? "bg-[var(--text)] text-[var(--surface)]"
                : "text-[var(--text)] opacity-60 hover:opacity-100"
            }`}
          >
            {LANG_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
