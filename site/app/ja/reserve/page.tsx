import type { Metadata } from "next";
import { ReserveView } from "@/components/views/ReserveView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("reserve", "jp");

export default function ReserveJa() {
  return <ReserveView lang="jp" />;
}
