"use client";

import { useEffect } from "react";

/** Matches Squarespace `body.roru-about-page .roru-nav { opacity: 1 }`. */
export function AboutBodyClass() {
  useEffect(() => {
    document.body.classList.add("roru-about-page");
    return () => document.body.classList.remove("roru-about-page");
  }, []);
  return null;
}
