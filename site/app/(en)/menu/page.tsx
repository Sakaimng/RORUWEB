import type { Metadata } from "next";
import { MenuView } from "@/components/views/MenuView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("menu", "en");

export default function MenuPage() {
  return <MenuView lang="en" />;
}
