// Единая конфигурация сайта: идентичность, навигация, контакты, SEO.
// URL сайта по окружению: NEXT_PUBLIC_SITE_URL (Vercel/кастомный домен) → GitHub Pages под /slk-labs → дефолт.
const isPages = process.env.GH_PAGES === "true";
export const basePath = isPages ? "/slk-labs" : "";
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? (isPages ? "https://msheyhov1.github.io/slk-labs" : "https://slk-labs.dev");

export const site = {
  name: "SLK-labs",
  url: siteUrl,
  title: "SLK-labs — студия разработки и автоматизации",
  description:
    "Сайты, Telegram-боты и системы, которые работают сами. Интерактивная разработка с моушеном, 3D и дисциплиной перформанса. Сайты. Боты. Автоматизация.",
  payoff: "Процессы, которые живут без вас. Сайты. Боты. Автоматизация.",
  locale: "ru_RU",
  themeColor: "#F2F0E9",
  keywords: ["разработка сайтов", "Telegram-боты", "автоматизация", "Next.js", "WebGL"],
} as const;

export const nav = [
  { href: "#works", label: "Кейсы" },
  { href: "#services", label: "Услуги" },
  { href: "#manifesto", label: "Манифест" },
  { href: "#contact", label: "Контакт" },
] as const;

export const contacts = {
  email: "hello@slk-labs.dev",
  telegram: { label: "Telegram @slklabs", href: "https://t.me/slklabs" },
  location: "Remote · СНГ / EU",
} as const;
