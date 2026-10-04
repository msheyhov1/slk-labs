export const hero = {
  eyebrow: "SLK-labs — студия разработки и автоматизации",
  status: "LIVE",
  title: "Процессы, которые живут без вас",
  lead: "Студия разработки и автоматизации. Делаем сайты, Telegram-ботов и системы, которые работают сами — с моушеном, 3D и дисциплиной перформанса.",
  descriptor: "Сайты. Боты. Автоматизация.",
  actions: {
    primary: { label: "Обсудить проект", href: "#contact" },
    secondary: { label: "Смотреть кейсы", href: "#works" },
  },
  specs: [
    { label: "Профиль", value: "САЙТЫ · БОТЫ · АВТО" },
    { label: "Моушн", value: "3D · GSAP · LENIS" },
    { label: "Доступность", value: "FOCUS · REDUCED-MOTION" },
    { label: "Статус", value: "ОНЛАЙН", signal: true },
  ],
} as const;
