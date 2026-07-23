"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";
import {
  langFromPathname,
  stripLocale,
  withLocale,
} from "@/lib/locale-routing";
import { navigateWithTransition } from "@/lib/navigate-with-transition";

/** Supported UI languages. CN = Traditional Chinese. */
export type Lang = "en" | "jp" | "cn";

export const LANGS: Lang[] = ["en", "jp", "cn"];

/** Short labels shown in the toggle. */
export const LANG_LABELS: Record<Lang, string> = {
  en: "EN",
  jp: "JP",
  cn: "CN",
};

/** Maps our codes to a valid `<html lang>` value. */
const HTML_LANG: Record<Lang, string> = {
  en: "en",
  jp: "ja",
  cn: "zh-Hant",
};

// Language is derived from the URL locale prefix (see lib/locale-routing).

/**
 * Site copy by language. The Menu page title stays in English.
 * JP / Traditional-Chinese strings are first-pass translations and are meant to be proofread.
 */
type Dict = {
  nav: {
    home: string;
    about: string;
    events: string;
    menus: string;
    order: string;
    delivery: string;
    reserve: string;
  };
  menuToggle: { open: string; close: string };
  /** Hero tagline rendered as two lines. */
  heroTagline: [string, string];
  scrollCue: string;
  cta: { discover: string; events: string; inquire: string };
  inquiry: {
    title: string;
    desc: string;
    name: string;
    email: string;
    phone: string;
    optional: string;
    message: string;
    send: string;
    sending: string;
    success: string;
    sendAnother: string;
    errGeneric: string;
    errOffline: string;
    errUnavailable: string;
  };
  footer: {
    contact: string;
    location: string;
    social: string;
    hours: string;
    address1: string;
    address2: string;
    hoursWeekday: string;
    hoursWeekdayCall: string;
    hoursWeekend: string;
    hoursWeekendCall: string;
  };
  events: {
    heading: string;
    upcoming: string;
    past: string;
    archive: string;
    details: string;
    emptyPastTitle: string;
    emptyPastDesc: string;
    emptyUpcomingTitle: string;
    emptyUpcomingDesc: string;
  };
  about: {
    heroTitle: string;
    intro: string[];
    story: string[];
  };
  booking: {
    pageTitle: string;
    lunch: string;
    dinner: string;
    chefsCounter: string;
    partySize: string;
    date: string;
    availableTimeSlots: string;
    continue: string;
    noAvailability: string;
    notAvailable: string;
    noteLunch: string;
    noteDinner: string;
  };
  install: {
    title: string;
    lead: string;
    inAppLead: string;
    stepShare: string;
    stepAdd: string;
    stepConfirm: string;
    safariNote: string;
    dismiss: string;
    menuLink: string;
    androidLead: string;
    androidStepMenu: string;
    androidStepInstall: string;
    installButton: string;
  };
};

const en: Dict = {
  nav: {
    home: "Home",
    about: "About",
    events: "Events",
    menus: "Menus",
    order: "Order",
    delivery: "Delivery",
    reserve: "Reservations",
  },
  menuToggle: { open: "Menu", close: "Close" },
  heroTagline: ["Hong Kong's", "Original Hand Roll Bar"],
  scrollCue: "Scroll",
  cta: { discover: "Discover", events: "Events", inquire: "Inquire" },
  inquiry: {
    title: "Inquire",
    desc: "Questions, private events, or feedback - send a note and we will get back to you.",
    name: "Name",
    email: "Email",
    phone: "Phone",
    optional: "(optional)",
    message: "Message",
    send: "Send",
    sending: "Sending...",
    success: "Thank you. Your message has been sent; we will reply as soon as we can.",
    sendAnother: "Send another",
    errGeneric: "Could not send. Please try again or email us directly.",
    errOffline: "Something went wrong. Please try again or email us directly.",
    errUnavailable: "Inquiries are not available online just yet. Please use the contact details in the footer.",
  },
  footer: {
    contact: "Contact",
    location: "Location",
    social: "Social",
    hours: "Opening hours",
    address1: "G/F, 100–102 QUEEN'S ROAD EAST,",
    address2: "WAN CHAI, HONG KONG ISLAND",
    hoursWeekday: "OPEN DAILY FROM 12PM - 10PM",
    hoursWeekdayCall: "(Last Call 9:30pm)",
    hoursWeekend: "",
    hoursWeekendCall: "",
  },
  events: {
    heading: "Events",
    upcoming: "Upcoming",
    past: "Past",
    archive: "Archive",
    details: "Details",
    emptyPastTitle: "No Past Events Yet",
    emptyPastDesc: "Past events will appear here once the archive is ready.",
    emptyUpcomingTitle: "More Events Soon",
    emptyUpcomingDesc: "Upcoming events will appear here once the next programme is announced.",
  },
  about: {
    heroTitle: "WHO WE ARE",
    intro: [
      "Roru Baru was born out of a love for hand rolls — temaki — and the craft behind them. As Hong Kong's original hand roll bar we wanted to bring a new energy to the city,",
      "inspired by the pace and spirit of Tokyo's dining culture. Our rolls are made to order and served fresh off the bar, always ready to be enjoyed at their best.",
      "The details are at the heart of what we do. Warm rice, crisp nori flown in from Japan and seafood dressed with care.",
      "The menu is focused, but we like to play with flavours inspired by local dishes and our travels abroad.",
    ],
    story: [
      "The vibe changes with the day.",
      "Lunchtime is lively and perfect for a quick bite between meetings.",
      "In the evening, the lights shift and the music goes up a notch. The space becomes somewhere to linger, enjoy a few tipples and soak in the energy.",
      "Whether you join us for a quick lunch, relaxed dinner or a draught sake or two, you'll always be part of the action at our counter.",
    ],
  },
  booking: {
    pageTitle: "RESERVATIONS",
    lunch: "Lunch",
    dinner: "Dinner",
    chefsCounter: "Chef's Counter",
    partySize: "Party size",
    date: "Date",
    availableTimeSlots: "Available time slots",
    continue: "Continue",
    noAvailability: "No availability",
    notAvailable: "Not available",
    noteLunch:
      "Only electronic payments are accepted at the venue. Dining experience for Lunch is 60 minutes from reservation time. Table reservations will be held for a maximum of 10 minutes after the reservation time.",
    noteDinner:
      "Only electronic payments are accepted at the venue. Dining experience for Dinner is 75 minutes from reservation time. Table reservations will be held for a maximum of 10 minutes after the reservation time.",
  },
  install: {
    title: "Add RORUBARU to your home screen",
    lead: "Install the site as an app for quick access from your home screen.",
    inAppLead:
      "Open this page in Safari, then use Share → Add to Home Screen to install the app.",
    stepShare: "Tap Share in the Safari toolbar",
    stepAdd: 'Choose "Add to Home Screen"',
    stepConfirm: 'Tap "Add"',
    safariNote: "Add to Home Screen works best in Safari.",
    dismiss: "Not now",
    menuLink: "Install App",
    androidLead: "Install the site as an app for quick access from your home screen.",
    androidStepMenu: "Tap the menu (⋮) in Chrome",
    androidStepInstall: 'Choose "Install app" or "Add to Home screen"',
    installButton: "Install",
  },
};

const jp: Dict = {
  nav: {
    home: "ホーム",
    about: "私たちについて",
    events: "イベント",
    menus: "メニュー",
    order: "注文",
    delivery: "デリバリー",
    reserve: "予約",
  },
  menuToggle: { open: "メニュー", close: "閉じる" },
  heroTagline: ["香港発", "オリジナル手巻き寿司バー"],
  scrollCue: "スクロール",
  cta: { discover: "見る", events: "イベント", inquire: "お問い合わせ" },
  inquiry: {
    title: "お問い合わせ",
    desc: "ご質問、貸切のご相談、ご意見など、メッセージをお送りください。折り返しご連絡いたします。",
    name: "お名前",
    email: "メール",
    phone: "電話番号",
    optional: "（任意）",
    message: "メッセージ",
    send: "送信",
    sending: "送信中...",
    success: "ありがとうございます。メッセージを送信しました。できるだけ早くご返信いたします。",
    sendAnother: "もう一度送信",
    errGeneric: "送信できませんでした。もう一度お試しいただくか、直接メールでご連絡ください。",
    errOffline: "問題が発生しました。もう一度お試しいただくか、直接メールでご連絡ください。",
    errUnavailable: "オンラインでのお問い合わせはまだご利用いただけません。フッターの連絡先をご利用ください。",
  },
  footer: {
    contact: "お問い合わせ",
    location: "所在地",
    social: "ソーシャル",
    hours: "営業時間",
    address1: "香港島 ワンチャイ",
    address2: "クイーンズロードイースト 100–102 1階",
    hoursWeekday: "毎日 12:00 - 22:00",
    hoursWeekdayCall: "（ラストオーダー 21:30）",
    hoursWeekend: "",
    hoursWeekendCall: "",
  },
  events: {
    heading: "イベント",
    upcoming: "今後の予定",
    past: "過去",
    archive: "アーカイブ",
    details: "詳細",
    emptyPastTitle: "過去のイベントはまだありません",
    emptyPastDesc: "過去のイベントは、アーカイブが整い次第ここに表示されます。",
    emptyUpcomingTitle: "イベントは近日公開",
    emptyUpcomingDesc: "次回のプログラムが発表され次第、こちらに表示されます。",
  },
  about: {
    heroTitle: "私たちについて",
    intro: [
      "Roru Baru（ロルバル）は、手巻き寿司とその職人技への愛から生まれました。香港初の手巻き寿司バーとして、この街に新しいエネルギーをもたらしたいと考えています。",
      "東京の食文化のペースと精神にインスパイアされて。握りはすべて注文を受けてから作り、カウンターから出来たてをご提供します。いつでも最高の状態でお楽しみいただけます。",
      "細部へのこだわりが私たちの仕事の核心です。温かいシャリ、日本から空輸したパリッとした海苔、そして丁寧に仕立てた魚介。",
      "メニューは厳選していますが、地元の料理や旅先からインスピレーションを得た味づくりも楽しんでいます。",
    ],
    story: [
      "雰囲気は時間とともに移り変わります。",
      "ランチタイムは活気にあふれ、打ち合わせの合間のひと口にぴったりです。",
      "夜になると照明が変わり、音楽のボリュームも上がります。一杯やりながらゆっくりと過ごし、その熱気に浸れる空間に。",
      "気軽なランチでも、ゆったりとしたディナーでも、生酒を一、二杯でも——カウンターでいつもその活気の一部になれます。",
    ],
  },
  booking: {
    pageTitle: "予約",
    lunch: "ランチ",
    dinner: "ディナー",
    chefsCounter: "シェフカウンター",
    partySize: "人数",
    date: "日付",
    availableTimeSlots: "空き時間",
    continue: "続ける",
    noAvailability: "空きなし",
    notAvailable: "ご利用いただけません",
    noteLunch:
      "店内では電子決済のみとなります。ランチのお食事時間は予約時間から60分です。予約時間から最大10分までお待ちいたします。",
    noteDinner:
      "店内では電子決済のみとなります。ディナーのお食事時間は予約時間から75分です。予約時間から最大10分までお待ちいたします。",
  },
  install: {
    title: "RORUBARUをホーム画面に追加",
    lead: "ホーム画面に追加すると、アプリのようにすぐにアクセスできます。",
    inAppLead:
      "Safariでこのページを開き、共有 → ホーム画面に追加 からインストールしてください。",
    stepShare: "Safariのツールバーで「共有」をタップ",
    stepAdd: "「ホーム画面に追加」を選択",
    stepConfirm: "「追加」をタップ",
    safariNote: "ホーム画面への追加はSafariが最も確実です。",
    dismiss: "後で",
    menuLink: "アプリをインストール",
    androidLead: "ホーム画面に追加すると、アプリのようにすぐにアクセスできます。",
    androidStepMenu: "Chromeのメニュー（⋮）をタップ",
    androidStepInstall: "「アプリをインストール」または「ホーム画面に追加」を選択",
    installButton: "インストール",
  },
};

const cn: Dict = {
  nav: {
    home: "首頁",
    about: "關於我們",
    events: "活動",
    menus: "菜單",
    order: "外賣",
    delivery: "送餐",
    reserve: "預約",
  },
  menuToggle: { open: "選單", close: "關閉" },
  heroTagline: ["香港首創", "手卷壽司吧"],
  scrollCue: "捲動",
  cta: { discover: "探索", events: "活動", inquire: "查詢" },
  inquiry: {
    title: "查詢",
    desc: "查詢、私人活動或意見回饋——留下訊息，我們會盡快回覆您。",
    name: "姓名",
    email: "電郵",
    phone: "電話",
    optional: "（選填）",
    message: "訊息",
    send: "傳送",
    sending: "傳送中...",
    success: "感謝您。您的訊息已送出，我們會盡快回覆。",
    sendAnother: "再傳送一則",
    errGeneric: "無法傳送。請再試一次，或直接電郵與我們聯絡。",
    errOffline: "發生錯誤。請再試一次，或直接電郵與我們聯絡。",
    errUnavailable: "暫時未能在線上查詢，請使用頁尾的聯絡方式。",
  },
  footer: {
    contact: "聯絡",
    location: "地址",
    social: "社交媒體",
    hours: "營業時間",
    address1: "香港島 灣仔",
    address2: "皇后大道東 100–102 號地下",
    hoursWeekday: "每日 12:00 - 22:00",
    hoursWeekdayCall: "（最後點餐 21:30）",
    hoursWeekend: "",
    hoursWeekendCall: "",
  },
  events: {
    heading: "活動",
    upcoming: "即將舉行",
    past: "過往",
    archive: "存檔",
    details: "詳情",
    emptyPastTitle: "暫無過往活動",
    emptyPastDesc: "存檔準備就緒後，過往活動將顯示於此。",
    emptyUpcomingTitle: "更多活動即將公布",
    emptyUpcomingDesc: "下一輪節目公布後，即將舉行的活動將顯示於此。",
  },
  about: {
    heroTitle: "關於我們",
    intro: [
      "Roru Baru 源於我們對手卷以及其背後工藝的熱愛。作為香港首創的手卷壽司吧，我們希望為這座城市帶來嶄新的能量，",
      "靈感源自東京餐飲文化的節奏與精神。我們的手卷即叫即製，於吧檯新鮮奉上，時刻以最佳狀態呈獻。",
      "細節是我們用心的核心。溫熱的壽司飯、由日本空運而來的爽脆海苔，以及悉心處理的海鮮。",
      "菜單精簡，但我們樂於以本地菜式與旅途見聞為靈感，玩味各種風味。",
    ],
    story: [
      "氛圍隨著一天的時間而轉變。",
      "午餐時段熱鬧非常，最適合在會議之間快速享用一餐。",
      "入夜後燈光流轉，音樂漸強。這裡成為一個讓人駐足、小酌幾杯、沉浸於熱鬧氣氛的空間。",
      "無論是快速的午餐、輕鬆的晚餐，還是一兩杯生清酒，在我們的吧檯前，您始終是這份熱鬧的一部分。",
    ],
  },
  booking: {
    pageTitle: "預約",
    lunch: "午餐",
    dinner: "晚餐",
    chefsCounter: "主廚吧台",
    partySize: "人數",
    date: "日期",
    availableTimeSlots: "可預約時段",
    continue: "繼續",
    noAvailability: "暫無空位",
    notAvailable: "未能提供",
    noteLunch:
      "本店只接受電子付款。午餐用餐時間為預約時間起計60分鐘。預約時間後最多保留10分鐘。",
    noteDinner:
      "本店只接受電子付款。晚餐用餐時間為預約時間起計75分鐘。預約時間後最多保留10分鐘。",
  },
  install: {
    title: "將 RORUBARU 加入主畫面",
    lead: "加入主畫面後，可像 App 一樣快速開啟網站。",
    inAppLead: "請在 Safari 中開啟此頁，然後使用「分享」→「加入主畫面」來安裝。",
    stepShare: "點按 Safari 工具列的「分享」",
    stepAdd: "選擇「加入主畫面」",
    stepConfirm: "點按「加入」",
    safariNote: "在 Safari 中加入主畫面最為可靠。",
    dismiss: "稍後",
    menuLink: "安裝 App",
    androidLead: "加入主畫面後，可像 App 一樣快速開啟網站。",
    androidStepMenu: "點按 Chrome 選單（⋮）",
    androidStepInstall: "選擇「安裝應用程式」或「加入主畫面」",
    installButton: "安裝",
  },
};

const DICTS: Record<Lang, Dict> = { en, jp, cn };

export const BOOKING_DATE_LOCALE: Record<Lang, string> = {
  en: "en-US",
  jp: "ja-JP",
  cn: "zh-Hant-HK",
};

type I18nValue = { lang: Lang; setLang: (lang: Lang) => void; t: Dict };

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // The URL is the single source of truth for language: "/" = English,
  // "/ja/*" = Japanese, "/zh-Hant/*" = Traditional Chinese. Deriving from the
  // pathname keeps server render, hydration and crawled content in sync.
  const pathname = usePathname();
  const lang = langFromPathname(pathname);

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
  }, [lang]);

  // Switching language navigates to the same page in the chosen locale with a fade transition.
  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      const href = withLocale(stripLocale(pathname ?? "/"), next);
      navigateWithTransition(href);
    },
    [lang, pathname]
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: DICTS[lang] }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback so non-wrapped usage still renders English instead of crashing.
    return { lang: "en", setLang: () => {}, t: en };
  }
  return ctx;
}
