import type { Metadata } from "next";
import { ReserveView } from "@/components/views/ReserveView";
import { buildPageMetadata } from "@/lib/page-seo";

export const metadata: Metadata = buildPageMetadata("reserve", "cn");

export default function ReserveZhHant() {
  return <ReserveView lang="cn" />;
}
