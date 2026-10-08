import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import {
  DELIVERY_COPY,
  DELIVERY_PLATFORM_ORDER,
  DELIVERY_PLATFORMS,
} from "@/lib/delivery-copy";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList } from "@/lib/structured-data";

export function DeliveryView({ lang }: { lang: Lang }) {
  const copy = DELIVERY_COPY[lang];

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
          <ul className="roru-delivery-platforms">
            {DELIVERY_PLATFORM_ORDER.map((key) => {
              const platform = DELIVERY_PLATFORMS[key];
              const label = platform.label[lang];
              return (
                <li key={key} className="roru-delivery-platforms__item">
                  <a
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className={`roru-delivery-platforms__link roru-delivery-platforms__link--${key}`}
                  >
                    <Image
                      src={platform.logo.src}
                      alt={label}
                      width={platform.logo.width}
                      height={platform.logo.height}
                      unoptimized
                      className="roru-delivery-platforms__logo"
                    />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </PageOverlayShell>
  );
}
