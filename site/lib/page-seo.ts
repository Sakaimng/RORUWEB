import type { Metadata } from "next";
import type { Lang } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

/**
 * Localized SEO copy (title + meta description) for every page in every
 * language, plus a helper that turns it into a full `Metadata` object with the
 * correct canonical, hreflang, OG and Twitter tags.
 *
 * NOTE: the JA and zh-Hant strings are first-pass and should be proofread by a
 * native speaker. Edit here to update both the <title>/<meta> and social tags.
 */

export type PageKey =
  | "home"
  | "about"
  | "events"
  | "menu"
  | "order"
  | "delivery"
  | "reserve";

export const PAGE_PATHS: Record<PageKey, string> = {
  home: "/",
  about: "/about",
  events: "/events",
  menu: "/menu",
  order: "/order",
  delivery: "/delivery",
  reserve: "/reserve",
};

type Copy = { title: string; description: string };

export const PAGE_SEO: Record<Lang, Record<PageKey, Copy>> = {
  en: {
    home: {
      title: "RORUBARU — Hand Roll & Temaki Bar in Wan Chai, Hong Kong",
      description:
        "Hong Kong's original hand roll bar in Wan Chai. Tokyo-style temaki made to order with warm rice, crisp Japanese nori and draught sake. Book your counter seat.",
    },
    about: {
      title: "About — Hong Kong's Original Hand Roll Bar",
      description:
        "The story behind RORUBARU (Roru Baru), Hong Kong's original hand roll bar in Wan Chai. Tokyo-inspired temaki, warm rice, crisp Japanese nori and draught sake at the counter.",
    },
    events: {
      title: "Events — Guest Chefs & Collaborations",
      description:
        "Guest chefs, collaborations and happenings at RORUBARU, Hong Kong's original hand roll bar in Wan Chai — from grand-opening dinners to chef collaborations.",
    },
    menu: {
      title: "Menu — Hand Rolls (Temaki), Drinks & Sake",
      description:
        "RORUBARU's à la carte hand roll (temaki) menu and drinks list — signature hand rolls, sake and cocktails at Hong Kong's original hand roll bar in Wan Chai.",
    },
    order: {
      title: "Order — Takeout & Delivery",
      description:
        "Order hand rolls, drinks and sake from RORUBARU for pickup or delivery in Wan Chai. Browse the full menu, build your cart and checkout online.",
    },
    delivery: {
      title: "Delivery — Coming Soon",
      description:
        "RORUBARU delivery is coming soon. Join the waitlist to be first to know when fresh hand rolls can be delivered to your door in Hong Kong.",
    },
    reserve: {
      title: "Reservations — Book a Table",
      description:
        "Book a table at RORUBARU, Hong Kong's original hand roll bar in Wan Chai. Reserve lunch or dinner at the chef's counter for fresh Tokyo-style temaki and sake.",
    },
  },
  jp: {
    home: {
      title: "RORUBARU（ロルバル）— 香港・湾仔の手巻き寿司バー",
      description:
        "香港初の手巻き寿司バー。湾仔で職人が握りたての手巻き（テマキ）を、温かいシャリと日本産の海苔、樽生サケとともに。カウンター席をご予約ください。",
    },
    about: {
      title: "私たちについて — 香港オリジナルの手巻き寿司バー",
      description:
        "RORUBARU（ロルバル）の物語。香港・湾仔の手巻き寿司バーで、東京にインスパイアされた手巻き、温かいシャリ、日本産の海苔、樽生サケをカウンターで。",
    },
    events: {
      title: "イベント — ゲストシェフ＆コラボレーション",
      description:
        "香港・湾仔の手巻き寿司バー RORUBARU のイベント情報。ゲストシェフやコラボレーションなど、カウンターでの特別な催しをご紹介します。",
    },
    menu: {
      title: "メニュー — 手巻き・ドリンク・日本酒",
      description:
        "RORUBARU のアラカルト手巻き（テマキ）メニューとドリンクリスト。香港・湾仔の手巻き寿司バーで、シグネチャー手巻きや日本酒をどうぞ。",
    },
    order: {
      title: "注文 — テイクアウト・デリバリー",
      description:
        "RORUBARU の手巻き・ドリンク・日本酒を湾仔からテイクアウトまたはデリバリー。フルメニューからカートに追加してオンライン注文。",
    },
    delivery: {
      title: "デリバリー — 近日開始",
      description:
        "RORUBARU のデリバリーサービスは近日開始予定です。香港で新鮮な手巻きをお届けできるようになったら、ウェイトリストへいち早くお知らせします。",
    },
    reserve: {
      title: "ご予約 — テーブルを予約する",
      description:
        "香港・湾仔の手巻き寿司バー RORUBARU をご予約ください。ランチ・ディナーのカウンター席を Tock からご予約いただけます。",
    },
  },
  cn: {
    home: {
      title: "RORUBARU — 香港灣仔手卷吧｜職人手卷與清酒",
      description:
        "香港首間手卷吧，位於灣仔。即叫即製的東京風手卷（手巻き），配上溫熱壽司飯、日本直送海苔與生啤清酒。立即預約吧台座位。",
    },
    about: {
      title: "關於我們 — 香港首間手卷吧",
      description:
        "RORUBARU（Roru Baru）的故事。位於香港灣仔的手卷吧，靈感源自東京，於吧台供應職人手卷、溫熱壽司飯、日本海苔與生啤清酒。",
    },
    events: {
      title: "活動 — 客座主廚與聯乘",
      description:
        "香港灣仔手卷吧 RORUBARU 的活動消息：客座主廚、聯乘合作及吧台限定體驗，由開幕宴到主廚聯乘。",
    },
    menu: {
      title: "餐牌 — 手卷、飲品與清酒",
      description:
        "RORUBARU 的單點手卷（手巻き）餐牌與飲品單。香港灣仔手卷吧，供應招牌手卷、清酒與特調。",
    },
    order: {
      title: "外賣 — 自取及送餐",
      description:
        "向灣仔 RORUBARU 訂購手卷、飲品及清酒，支持自取或送餐。瀏覽全餐牌、加入購物車並線上結帳。",
    },
    delivery: {
      title: "送餐服務 — 即將推出",
      description:
        "RORUBARU 送餐服務即將推出。加入等候名單，在香港可以享用新鮮手卷送餐服務時率先收到通知。",
    },
    reserve: {
      title: "預約 — 預訂座位",
      description:
        "預訂香港灣仔手卷吧 RORUBARU。可透過 Tock 預約午市或晚市吧台座位，品嚐新鮮東京風手卷與清酒。",
    },
  },
};

/** Full Metadata for a page in a language (canonical, hreflang, OG, Twitter). */
export function buildPageMetadata(page: PageKey, lang: Lang): Metadata {
  const copy = PAGE_SEO[lang][page];
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: PAGE_PATHS[page],
    lang,
    absoluteTitle: page === "home",
  });
}
