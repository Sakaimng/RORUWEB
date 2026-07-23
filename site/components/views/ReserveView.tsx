import { BookingSection } from "@/components/BookingSection";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import { JsonLd } from "@/components/JsonLd";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList } from "@/lib/structured-data";

export function ReserveView({ lang }: { lang: Lang }) {
  return (
    <PageOverlayShell
      scrollable
      contentClassName="roru-home-overlay-panel--fill"
    >
      <JsonLd
        data={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Reservations", path: "/reserve" },
          ],
          lang,
        )}
      />
      <div className="roru-events-page roru-reserve-page">
        <BookingSection />
      </div>
    </PageOverlayShell>
  );
}
