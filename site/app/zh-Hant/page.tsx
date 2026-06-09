import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("home", "cn");

export default function HomeZhHant() {
  return <HomeView lang="cn" />;
}
