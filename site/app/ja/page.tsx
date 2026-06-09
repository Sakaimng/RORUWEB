import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("home", "jp");

export default function HomeJa() {
  return <HomeView lang="jp" />;
}
