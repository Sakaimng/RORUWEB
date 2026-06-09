import type { JsonLdNode } from "@/lib/structured-data";

/**
 * Renders one or more JSON-LD blocks as a <script type="application/ld+json">.
 * Server-rendered so structured data ships in the initial HTML for crawlers.
 */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is built from trusted constants — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
