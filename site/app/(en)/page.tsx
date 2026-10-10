import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("home", "en");

export default function Home() {
  return <HomeView lang="en" />;
}
