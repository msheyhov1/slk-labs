// Данные кейсов (плейсхолдеры из CLAUDE.md §Кейсы).
// ⚠️ Перед публичной витриной — подтвердить, что проекты можно показывать
// (крипто/AML и клиентские сайты могут требовать обезличивания/NDA).
// При росте — переезд в MDX.

export type Case = {
  slug: string;
  idx: string;
  title: string;
  sub: string;
  type: string;
  year: string;
  stack: string;
  summary: string;
};

export const cases: Case[] = [
  {
    slug: "new-link-food",
    idx: "К-01",
    title: "New Link Food FZE",
    sub: "билингвальный продуктовый сайт",
    type: "Сайт · 3D",
    year: "2025",
    stack: "Next · WebGL",
    summary:
      "Продуктовый сайт с интерактивным 3D-глобусом поставок, каталогом и RFQ-формой. Билингва, сильный визуальный кейс-герой.",
  },
  {
    slug: "telegram-automation",
    idx: "К-02",
    title: "Сменное планирование",
    sub: "Telegram Mini App + бэкенд",
    type: "Бот · Автоматизация",
    year: "2025",
    stack: "FastAPI · PG",
    summary:
      "Система сменного планирования в Telegram Mini App: расписания, заявки, уведомления. FastAPI + PostgreSQL — процессы, что работают сами.",
  },
  {
    slug: "fintech-monitoring",
    idx: "К-03",
    title: "OTC-мониторинг",
    sub: "финтех / наблюдение за курсом",
    type: "Финтех · Бот",
    year: "2024",
    stack: "Python · WS",
    summary:
      "Userbot мониторинга OTC-курсов USDT/RUB и сигналов рынка — поток данных в реальном времени, тихая автоматизация без ручного контроля.",
  },
];
