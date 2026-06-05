import type { Metadata } from "next";
import { MenuPageClient } from "@/components/menu/MenuPageClient";
import { PageOverlayShell } from "@/components/PageOverlayShell";

export const metadata: Metadata = {
  title: "RORUBARU | Menus",
  description:
    "RORUBARU's à la carte and drinks menus — Hong Kong's original hand roll bar.",
};

export default function MenuPage() {
  return (
    <PageOverlayShell scrollable>
      <MenuPageClient />
    </PageOverlayShell>
  );
}
