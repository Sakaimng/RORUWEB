import { MENU_BOARDS, PRICE_CURRENCY, type MenuItem } from "@/lib/menu";

export type CatalogItem = {
  id: string;
  boardId: string;
  boardName: string;
  sectionId: string;
  sectionName: string;
  name: string;
  nameZh?: string;
  description?: string;
  price: number;
  variantLabel?: string;
};

export type CatalogCategory = {
  id: string;
  label: string;
  boardName: string;
  sectionName: string;
  itemIds: string[];
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pushItem(
  items: CatalogItem[],
  boardId: string,
  boardName: string,
  sectionId: string,
  sectionName: string,
  item: MenuItem,
  variant?: { label: string; price: number },
) {
  const baseId = `${boardId}:${sectionId}:${slug(item.name)}`;
  const id = variant ? `${baseId}:${slug(variant.label)}` : baseId;
  const price = variant?.price ?? item.price;
  if (typeof price !== "number") return;

  items.push({
    id,
    boardId,
    boardName,
    sectionId,
    sectionName,
    name: item.name,
    nameZh: item.nameZh,
    description: item.description,
    price,
    variantLabel: variant?.label,
  });
}

function buildCatalog(): CatalogItem[] {
  const items: CatalogItem[] = [];

  for (const board of MENU_BOARDS) {
    for (const section of board.sections) {
      const sectionId = slug(section.name);
      for (const item of section.items) {
        if (item.variants?.length) {
          for (const variant of item.variants) {
            pushItem(items, board.id, board.name, sectionId, section.name, item, variant);
          }
        } else {
          pushItem(items, board.id, board.name, sectionId, section.name, item);
        }
      }
    }
  }

  return items;
}

function buildCategories(items: CatalogItem[]): CatalogCategory[] {
  const map = new Map<string, CatalogCategory>();

  for (const item of items) {
    const id = `${item.boardId}:${item.sectionId}`;
    const existing = map.get(id);
    if (existing) {
      existing.itemIds.push(item.id);
      continue;
    }
    map.set(id, {
      id,
      label: item.sectionName,
      boardName: item.boardName,
      sectionName: item.sectionName,
      itemIds: [item.id],
    });
  }

  return Array.from(map.values());
}

export const ORDER_CATALOG = buildCatalog();
export const ORDER_CATALOG_BY_ID = Object.fromEntries(
  ORDER_CATALOG.map((item) => [item.id, item]),
) as Record<string, CatalogItem>;
export const ORDER_CATEGORIES = buildCategories(ORDER_CATALOG);
export { PRICE_CURRENCY as ORDER_CURRENCY };
