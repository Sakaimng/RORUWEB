import { MenuPageClient } from "@/components/menu/MenuPageClient";
import { PageOverlayShell } from "@/components/PageOverlayShell";
import { JsonLd } from "@/components/JsonLd";
import { MENU_BOARDS, type MenuItem } from "@/lib/menu";
import type { Lang } from "@/lib/i18n";
import { breadcrumbList, menuSchema } from "@/lib/structured-data";

function priceText(item: MenuItem): string {
  if (item.variants?.length) {
    return item.variants.map((v) => `${v.label} $${v.price}`).join(" / ");
  }
  return typeof item.price === "number" ? `$${item.price}` : "";
}

export function MenuView({ lang }: { lang: Lang }) {
  return (
    <PageOverlayShell scrollable>
      <JsonLd
        data={[
          breadcrumbList(
            [
              { name: "Home", path: "/" },
              { name: "Menu", path: "/menu" },
            ],
            lang,
          ),
          menuSchema(),
        ]}
      />
      {/*
        The visual menu is rendered from outlined-vector SVGs (no readable text).
        This accessible, server-rendered mirror exposes every item, price and
        description to screen readers and search engines.
      */}
      <section className="sr-only" aria-label="RORUBARU menu">
        <h2>
          RORUBARU menu — hand rolls (temaki), à la carte and drinks in Wan Chai,
          Hong Kong
        </h2>
        {MENU_BOARDS.map((board) => (
          <section key={board.id}>
            <h3>{board.name}</h3>
            {board.note ? <p>{board.note}</p> : null}
            {board.sections.map((section) => (
              <div key={section.name}>
                <h4>{section.name}</h4>
                {section.note ? <p>{section.note}</p> : null}
                <ul>
                  {section.items.map((item) => {
                    const price = priceText(item);
                    return (
                      <li key={`${section.name}-${item.name}`}>
                        {item.name}
                        {item.nameZh ? ` (${item.nameZh})` : ""}
                        {price ? ` — ${price}` : ""}
                        {item.description ? `. ${item.description}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </section>
      <MenuPageClient />
    </PageOverlayShell>
  );
}
