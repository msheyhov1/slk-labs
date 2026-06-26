// Единая конфигурация сайта: идентичность, навигация, контакты, SEO.
export const site = {
  name: "SLK-labs",
  url: "https://slk-labs.dev",
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
