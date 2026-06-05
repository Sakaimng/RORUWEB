/** Remap exported menu SVG fills/strokes to follow the active site theme. */

export const MENU_MOBILE_MAX_WIDTH = 767;

/** Colors used in exported menu SVGs from design (night-first artwork). */
const EXPORT_SURFACE = "#121212";
const EXPORT_TEXT = "#F1F1F1";
const EXPORT_ACCENT = "#F54500";
const EXPORT_ON_ACCENT = "#121212";

const DAY_SURFACE = "#F1F1F1";
const DAY_TEXT = "#121212";

type MenuThemeTokens = {
  surface: string;
  text: string;
  accent: string;
  onAccent: string;
};

function normalizePaint(color: string | null): string | null {
  if (!color) return null;
  const raw = color.trim();
  const named = raw.toLowerCase();
  if (named === "white") return "#FFFFFF";
  if (named === "black") return "#000000";
  const hex = raw.toUpperCase();
  return hex.startsWith("#") ? hex : null;
}

function getMenuThemeTokens(): MenuThemeTokens {
  const isDay = document.documentElement.classList.contains("theme-day");
  if (isDay) {
    return {
      surface: DAY_SURFACE,
      text: DAY_TEXT,
      accent: EXPORT_ACCENT,
      onAccent: EXPORT_ON_ACCENT,
    };
  }
  return {
    surface: EXPORT_SURFACE,
    text: EXPORT_TEXT,
    accent: EXPORT_ACCENT,
    onAccent: EXPORT_ON_ACCENT,
  };
}

/** Full-column panel rects exported as accent or surface fills. */
function isPanelBackgroundRect(rect: SVGRectElement): boolean {
  const width = Number.parseFloat(rect.getAttribute("width") ?? "0");
  const height = Number.parseFloat(rect.getAttribute("height") ?? "0");
  return width >= 400 && height >= 700;
}

function applyFill(node: Element, fill: string | null): void {
  if (!fill) return;

  if (fill === EXPORT_TEXT || fill === "#FFFFFF") {
    node.setAttribute("fill", "var(--menu-text)");
    return;
  }
  if (fill === EXPORT_SURFACE || fill === "#000000") {
    node.setAttribute("fill", "var(--menu-surface)");
    return;
  }
  if (fill === EXPORT_ACCENT) {
    node.setAttribute("fill", "var(--menu-accent)");
  }
}

function applyStroke(node: Element, stroke: string | null): void {
  if (!stroke) return;

  if (stroke === EXPORT_TEXT || stroke === "#FFFFFF") {
    node.setAttribute("stroke", "var(--menu-text)");
    return;
  }
  if (stroke === EXPORT_SURFACE || stroke === "#000000") {
    node.setAttribute("stroke", "var(--menu-surface)");
    return;
  }
  if (stroke === EXPORT_ACCENT) {
    node.setAttribute("stroke", "var(--menu-accent)");
  }
}

export function applyMenuSvgTheme(svg: SVGSVGElement): void {
  const tokens = getMenuThemeTokens();

  svg.style.setProperty("--menu-surface", tokens.surface);
  svg.style.setProperty("--menu-text", tokens.text);
  svg.style.setProperty("--menu-accent", tokens.accent);
  svg.style.setProperty("--menu-on-accent", tokens.onAccent);

  svg.querySelectorAll("rect").forEach((node) => {
    const rect = node as SVGRectElement;
    const fill = normalizePaint(rect.getAttribute("fill"));

    if (isPanelBackgroundRect(rect)) {
      if (fill === EXPORT_ACCENT) {
        rect.setAttribute("fill", "var(--menu-accent)");
        return;
      }
      if (fill === EXPORT_SURFACE) {
        rect.setAttribute("fill", "var(--menu-surface)");
        return;
      }
    }

    applyFill(rect, fill);

    applyStroke(rect, normalizePaint(rect.getAttribute("stroke")));
  });

  svg.querySelectorAll("path, circle, line").forEach((node) => {
    const fill = normalizePaint(node.getAttribute("fill"));
    if (fill === EXPORT_TEXT || fill === "#FFFFFF") {
      node.setAttribute("fill", "var(--menu-text)");
    } else if (fill === EXPORT_SURFACE || fill === "#000000") {
      node.setAttribute("fill", "var(--menu-on-accent)");
    } else if (fill === EXPORT_ACCENT) {
      node.setAttribute("fill", "var(--menu-accent)");
    }

    applyStroke(node, normalizePaint(node.getAttribute("stroke")));
  });
}

export function isMenuMobileLayout(): boolean {
  return window.matchMedia(`(max-width: ${MENU_MOBILE_MAX_WIDTH}px)`).matches;
}
