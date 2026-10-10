import type { Metadata } from "next";
import { ReserveView } from "@/components/views/ReserveView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("reserve", "en");

export default function ReservePage() {
  return <ReserveView lang="en" />;
}
