import type { Lang } from "@/lib/i18n";

export type DeliveryWaitlistCopy = {
  eyebrow: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
};

/** Live delivery storefronts. `{foodpanda}` / `{keeta}` in a description render as these links. */
export const DELIVERY_PLATFORMS = {
  foodpanda: {
    label: "foodpanda",
    url: "https://www.foodpanda.hk/restaurant/otpm/rorubaru-otpm",
  },
  keeta: {
    label: "Keeta",
    url: "https://url.mykeeta.com/eOUXBrnz",
  },
} as const;

export type DeliveryPlatformKey = keyof typeof DELIVERY_PLATFORMS;

export const DELIVERY_WAITLIST_COPY: Record<Lang, DeliveryWaitlistCopy> = {
  en: {
    eyebrow: "Delivery / foodpanda & Keeta",
    description:
      "Order RORUBARU for delivery on {foodpanda} and {keeta}. Want news on our own delivery? Leave your email below.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submit: "Stay informed",
    sending: "Joining…",
    success: "You’re on the list. We’ll be in touch with delivery news.",
    error: "We couldn’t add you right now. Please try again.",
  },
  jp: {
    eyebrow: "デリバリー / foodpanda・Keeta",
    description:
      "RORUBARU の手巻きは {foodpanda} と {keeta} でデリバリー注文いただけます。自社デリバリーの最新情報をご希望の方は、下記にメールアドレスをご登録ください。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    submit: "ウェイトリストに登録",
    sending: "登録中…",
    success: "ご登録ありがとうございます。デリバリーの最新情報をお知らせします。",
    error: "ただいま登録できません。もう一度お試しください。",
  },
  cn: {
    eyebrow: "外賣 / foodpanda 及 Keeta",
    description:
      "喺 {foodpanda} 或 {keeta} 就可以叫 RORUBARU 外賣。想收到我哋自家送餐嘅消息？留低電郵啦。",
    emailLabel: "電郵地址",
    emailPlaceholder: "you@example.com",
    submit: "加入等候名單",
    sending: "正在加入…",
    success: "你已加入名單。有送餐消息時我們會通知你。",
    error: "暫時未能加入，請稍後再試。",
  },
};
