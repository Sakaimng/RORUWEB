import type { Metadata } from "next";
import { AboutView } from "@/components/views/AboutView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("about", "en");

export default function AboutPage() {
  return <AboutView lang="en" />;
}
