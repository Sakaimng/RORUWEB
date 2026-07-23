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

export const DELIVERY_WAITLIST_COPY: Record<Lang, DeliveryWaitlistCopy> = {
  en: {
    eyebrow: "Delivery / Coming soon",
    description:
      "RORUBARU delivery is on its way. Join the waitlist and we’ll let you know the moment it launches.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submit: "Stay informed",
    sending: "Joining…",
    success: "You’re on the list. We’ll be in touch when delivery launches.",
    error: "We couldn’t add you right now. Please try again.",
  },
  jp: {
    eyebrow: "デリバリー / 近日開始",
    description:
      "RORUBARU のデリバリーサービスを準備中です。開始時にいち早くお知らせします。",
    emailLabel: "メールアドレス",
    emailPlaceholder: "you@example.com",
    submit: "ウェイトリストに登録",
    sending: "登録中…",
    success: "ご登録ありがとうございます。デリバリー開始時にお知らせします。",
    error: "ただいま登録できません。もう一度お試しください。",
  },
  cn: {
    eyebrow: "送餐服務 / 即將推出",
    description:
      "RORUBARU 送餐服務即將推出。加入等候名單，服務上線時我們會第一時間通知你。",
    emailLabel: "電郵地址",
    emailPlaceholder: "you@example.com",
    submit: "加入等候名單",
    sending: "正在加入…",
    success: "你已加入等候名單。送餐服務推出時我們會通知你。",
    error: "暫時未能加入，請稍後再試。",
  },
};
