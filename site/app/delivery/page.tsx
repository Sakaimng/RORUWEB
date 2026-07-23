import type { Metadata } from "next";
import { DeliveryView } from "@/components/views/DeliveryView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("delivery", "en");

export default function DeliveryPage() {
  return <DeliveryView lang="en" />;
}
