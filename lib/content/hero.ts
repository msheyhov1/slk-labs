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
    { label: "Бюджет", value: "60 FPS / CWV" },
    { label: "Доступность", value: "WCAG AA / AAA" },
    { label: "Статус", value: "ОНЛАЙН", signal: true },
  ],
} as const;
