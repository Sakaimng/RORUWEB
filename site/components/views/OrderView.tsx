import { redirect } from "next/navigation";
import { OrderPageClient } from "@/components/order/OrderPageClient";
import { JsonLd } from "@/components/JsonLd";
import type { Lang } from "@/lib/i18n";
import { withLocale } from "@/lib/locale-routing";
import { ORDER_ONLINE_ENABLED } from "@/lib/site-flags";
import { breadcrumbList } from "@/lib/structured-data";

export function OrderView({ lang }: { lang: Lang }) {
  if (!ORDER_ONLINE_ENABLED) {
    redirect(withLocale("/menu", lang));
  }

  return (
    <>
      <JsonLd
        data={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Order", path: "/order" },
          ],
          lang,
        )}
      />
      <main id="page-content" className="order-page-shell">
        {/* Ordering is mobile-only; ≥1032px shows this gate instead (see order-page.css). */}
        <div className="order-desktop-gate">
          <p className="order-desktop-gate__eyebrow">Order online</p>
          <h1 className="order-desktop-gate__title">Ordering is made for mobile</h1>
          <p className="order-desktop-gate__copy">
            Open rorubaru.com/order on your phone to browse the menu and order
            pickup or delivery.
          </p>
          <a className="order-btn order-btn--primary order-desktop-gate__cta" href="/menu">
            View our menus
          </a>
        </div>
        <OrderPageClient />
      </main>
    </>
  );
}
