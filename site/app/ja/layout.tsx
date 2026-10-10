import type { Metadata, Viewport } from "next";
import { RootDocument, rootMetadata, rootViewport } from "@/components/RootDocument";

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

export default function JapaneseRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RootDocument lang="ja">{children}</RootDocument>;
}
