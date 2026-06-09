import type { Metadata } from "next";
import { MenuView } from "@/components/views/MenuView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("menu", "cn");

export default function MenuZhHant() {
  return <MenuView lang="cn" />;
}
