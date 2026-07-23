import { DeliveryWaitlistForm } from "@/components/delivery/DeliveryWaitlistForm";
import { JsonLd } from "@/components/JsonLd";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import { DELIVERY_WAITLIST_COPY } from "@/lib/delivery-copy";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList } from "@/lib/structured-data";

export function DeliveryView({ lang }: { lang: Lang }) {
  const copy = DELIVERY_WAITLIST_COPY[lang];

  return (
    <PageOverlayShell scrollable>
      <JsonLd
        data={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Delivery", path: "/delivery" },
          ],
          lang,
        )}
      />
      <section
        className="roru-delivery-page"
        aria-labelledby="roru-delivery-title"
      >
        <div className="roru-delivery-page__content">
          <h1 id="roru-delivery-title" className="roru-delivery-page__eyebrow">
            {copy.eyebrow}
          </h1>
          <p className="roru-delivery-page__description">{copy.description}</p>

          <div className="roru-delivery-page__form">
            <DeliveryWaitlistForm copy={copy} />
          </div>
        </div>
      </section>
    </PageOverlayShell>
  );
}
