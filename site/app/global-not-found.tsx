import type { Metadata } from "next";
import { RootDocument } from "@/components/RootDocument";

// Each locale now has its own root layout, so unmatched URLs need a global
// 404 that renders its own <html> (experimental.globalNotFound in next.config).
export const metadata: Metadata = {
  title: "404: This page could not be found.",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <RootDocument lang="en">
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "6rem 1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 500, margin: 0 }}>404</h1>
          <p style={{ margin: "0.75rem 0 0" }}>This page could not be found.</p>
        </div>
      </main>
    </RootDocument>
  );
}
