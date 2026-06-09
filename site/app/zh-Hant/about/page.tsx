import type { Metadata } from "next";
import { AboutView } from "@/components/views/AboutView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("about", "cn");

export default function AboutZhHant() {
  return <AboutView lang="cn" />;
}
