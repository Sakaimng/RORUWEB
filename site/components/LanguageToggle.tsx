"use client";

import { LANGS, LANG_LABELS, useI18n, type Lang } from "@/lib/i18n";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

type ThumbRect = { x: number; y: number; width: number; height: number };

const THUMB_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

/** EN / JP / CN segmented control used in the nav (desktop) and mobile menu. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<Lang, HTMLButtonElement | null>>>({});
  const [thumb, setThumb] = useState<ThumbRect | null>(null);
  const [motionOk, setMotionOk] = useState(true);

  const syncThumb = useCallback(() => {
    const root = rootRef.current;
    const activeBtn = buttonRefs.current[lang];
    if (!root || !activeBtn) return;

    const rootBox = root.getBoundingClientRect();
    const btnBox = activeBtn.getBoundingClientRect();
    setThumb({
      x: btnBox.left - rootBox.left,
      y: btnBox.top - rootBox.top,
      width: btnBox.width,
      height: btnBox.height,
    });
  }, [lang]);

  useLayoutEffect(() => {
    setMotionOk(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    syncThumb();
  }, [syncThumb]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => syncThumb());
    ro.observe(root);
    for (const code of LANGS) {
      const btn = buttonRefs.current[code];
      if (btn) ro.observe(btn);
    }

    return () => ro.disconnect();
  }, [syncThumb]);

  useLayoutEffect(() => {
    window.addEventListener("resize", syncThumb);
    return () => window.removeEventListener("resize", syncThumb);
  }, [syncThumb]);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Language"
      className={`roru-nav-item roru-language-toggle inline-flex shrink-0 items-center rounded-full bg-[color:color-mix(in_srgb,var(--surface)_68%,transparent)] p-1 backdrop-blur-md ${className}`.trim()}
    >
      <span
        className="roru-language-toggle__thumb"
        aria-hidden
        style={
          thumb
            ? {
                transform: `translate3d(${thumb.x}px, ${thumb.y}px, 0)`,
                width: thumb.width,
                height: thumb.height,
                transition: motionOk
                  ? `transform 0.42s ${THUMB_EASE}, width 0.42s ${THUMB_EASE}, height 0.42s ${THUMB_EASE}`
                  : "none",
              }
            : { opacity: 0 }
        }
      />
      {LANGS.map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            ref={(el) => {
              buttonRefs.current[code] = el;
            }}
            type="button"
            aria-pressed={active}
            aria-label={`Switch language to ${LANG_LABELS[code]}`}
            onClick={() => setLang(code)}
            className={`roru-language-toggle__btn rounded-full px-2.5 py-1.5 text-xs font-bold uppercase leading-none sm:px-3 ${
              active ? "is-active" : ""
            }`}
          >
            {LANG_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
