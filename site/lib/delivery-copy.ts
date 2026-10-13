import type { Lang } from "@/lib/i18n";

export type DeliveryCopy = {
  eyebrow: string;
  /** Short line shown above the platform logo buttons. */
  description: string;
};

export type DeliveryPlatform = {
  /** Accessible label for the logo button (also used as the image alt text). */
  label: Record<Lang, string>;
  url: string;
  logo: {
    src: string;
    width: number;
    height: number;
  };
};

/** Live delivery storefronts, rendered as logo buttons on the Delivery page. */
export const DELIVERY_PLATFORMS = {
  foodpanda: {
    label: {
      en: "Order on foodpanda",
      jp: "foodpanda で注文する",
      cn: "喺 foodpanda 訂購",
    },
    url: "https://www.foodpanda.hk/restaurant/fbv3/rorubaru-extended-delivery-fbv3",
    logo: { src: "/delivery/foodpanda.svg", width: 328, height: 64 },
  },
  keeta: {
    label: {
      en: "Order on Keeta",
      jp: "Keeta で注文する",
      cn: "喺 Keeta 訂購",
    },
    url: "https://url.mykeeta.com/eOUXBrnz",
    logo: { src: "/delivery/keeta.png", width: 814, height: 440 },
  },
} as const satisfies Record<string, DeliveryPlatform>;

export type DeliveryPlatformKey = keyof typeof DELIVERY_PLATFORMS;

export const DELIVERY_PLATFORM_ORDER: DeliveryPlatformKey[] = ["foodpanda", "keeta"];

export const DELIVERY_COPY: Record<Lang, DeliveryCopy> = {
  en: {
    eyebrow: "Delivery",
    description: "Order delivery on",
  },
  jp: {
    eyebrow: "デリバリー",
    description: "デリバリーはこちらから",
  },
  cn: {
    eyebrow: "外賣",
    description: "外賣可以喺以下平台訂購",
  },
};
