import { DeliveryWaitlistForm } from "@/components/delivery/DeliveryWaitlistForm";
import { JsonLd } from "@/components/JsonLd";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import {
  DELIVERY_PLATFORMS,
  DELIVERY_WAITLIST_COPY,
  type DeliveryPlatformKey,
} from "@/lib/delivery-copy";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList } from "@/lib/structured-data";

/** Renders `{foodpanda}` / `{keeta}` tokens in the copy as outbound links. */
function withPlatformLinks(text: string) {
  return text.split(/(\{foodpanda\}|\{keeta\})/).map((part, i) => {
    const key = part.slice(1, -1) as DeliveryPlatformKey;
    const platform = part.startsWith("{") ? DELIVERY_PLATFORMS[key] : undefined;
    if (!platform) return part;
    return (
      <a
        key={i}
        href={platform.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "underline", textUnderlineOffset: "0.15em" }}
      >
        {platform.label}
      </a>
    );
  });
}

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
          <p className="roru-delivery-page__description">
            {withPlatformLinks(copy.description)}
          </p>

          <div className="roru-delivery-page__form">
            <DeliveryWaitlistForm copy={copy} />
          </div>
        </div>
      </section>
    </PageOverlayShell>
  );
}
