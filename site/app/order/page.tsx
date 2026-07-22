import type { Metadata } from "next";
import { OrderView } from "@/components/views/OrderView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("order", "en");

export default function OrderPage() {
  return <OrderView lang="en" />;
}
