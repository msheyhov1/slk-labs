// Данные кейсов + типы (без React). ⚠ Гигиена NDA: имена клиентов под NDA — только в publicTitle /
// visibility: "redacted" с первого коммита (hidden убирает страницу, но не git-историю).
// Владелец подтвердил публикацию всех трёх проектов (2026-10-04). Поля, помеченные ⚠ ПЛЕЙСХОЛДЕР,
// собраны из описаний и ждут реальных фактов/метрик от владельца.

export type Preset = "globe" | "lattice" | "ribbon"; // одно слово = чертёж + OG-плашка (+ 3D-комната позже)
export type Visibility = "public" | "redacted" | "hidden"; // hidden → нет карточки, маршрута, sitemap, OG

export type Media = { kind: "blueprint"; view?: "cover" | "detail-a" | "detail-b"; caption?: string };
export type Readout = readonly [key: string, value: string];
export type Metric = { label: string; value: string; signal?: boolean };
export type Section = { title: string; body: readonly string[] };

export type Case = {
  slug: string;
  idx: string;
  title: string;
  publicTitle?: string; // подменяет title в режиме redacted
  sub: string;
  summary: string;
  type: string;
  year: string;
  stack: string;
  meta: { role: string; stack: readonly string[]; duration?: string; client?: string; link?: { label: string; href: string } };
  preset: Preset;
  seed: number; // детерминизм: один seed → SVG == OG
  visibility: Visibility;
  readouts: readonly Readout[]; // «слой прибора» на обложке; в redacted → "——"
  cover: Media;
  gallery: readonly Media[];
  metrics: readonly Metric[];
  sections: { problem: Section; solution: Section; result: Section };
  og: { tagline: string };
};

export const cases: readonly Case[] = [
  {
    slug: "new-link-food",
    idx: "К-01",
    title: "New Link Food FZE",
    publicTitle: "Продуктовый сайт экспортёра (FZE)",
    sub: "билингвальный продуктовый сайт",
    type: "Сайт · 3D",
    year: "2025",
    stack: "Next · WebGL",
    summary:
      "Продуктовый сайт с интерактивным 3D-глобусом поставок, каталогом и RFQ-формой. Билингва, сильный визуальный кейс-герой.",
    meta: { role: "Дизайн, фронтенд, 3D", stack: ["Next.js", "TypeScript", "three / r3f", "i18n"], client: "New Link Food FZE" }, // ⚠ link — когда будет адрес
    preset: "globe",
    seed: 1337,
    visibility: "public",
    readouts: [["LAT", "25.2"], ["LON", "55.3"], ["ARCS", "06"]],
    cover: { kind: "blueprint" },
    gallery: [],
    metrics: [ // ⚠ ПЛЕЙСХОЛДЕР
      { label: "Языки", value: "2" },
      { label: "Сцена", value: "WebGL · 60 fps", signal: true },
      { label: "Заявки", value: "RFQ-форма" },
    ],
    sections: { // ⚠ ПЛЕЙСХОЛДЕР — текст собран из описания, уточнить факты
      problem: {
        title: "Поставки на двух языках и без «живой» карты",
        body: [
          "Экспортёру продуктов нужен сайт, который одинаково работает для партнёров на двух языках и показывает географию поставок не списком стран, а живой картиной.",
          "Каталог и запрос коммерческого предложения должны жить на одной странице с героем, не ломая скорость на телефонах партнёров.",
        ],
      },
      solution: {
        title: "3D-глобус поставок как центр сайта",
        body: [
          "Интерактивный глобус на three/r3f: порты и дуги поставок, реакция на курсор, ленивый WebGL-момент — один на страницу.",
          "Билингвальная структура контента, каталог с фильтрами и RFQ-форма с отправкой на почту — статический Next.js, зелёные Core Web Vitals.",
        ],
      },
      result: {
        title: "Витрина, которая объясняет бизнес за секунду",
        body: [
          "Глобус стал главным доказательством масштаба: партнёр видит маршруты, а не абзац текста.",
          "Сайт держит бюджет производительности на среднем Android и живёт без ручного сопровождения.",
        ],
      },
    },
    og: { tagline: "Билингвальный продуктовый сайт с 3D-глобусом поставок" },
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
    meta: { role: "Бэкенд, Mini App, интеграция", stack: ["Telegram Mini App", "FastAPI", "PostgreSQL", "Webhooks"] },
    preset: "lattice",
    seed: 2024,
    visibility: "public",
    readouts: [["НЕД", "14"], ["СМЕН", "42"], ["СЕТКА", "7×6"]],
    cover: { kind: "blueprint" },
    gallery: [],
    metrics: [ // ⚠ ПЛЕЙСХОЛДЕР
      { label: "Интерфейс", value: "Mini App" },
      { label: "Бэкенд", value: "FastAPI · PG", signal: true },
      { label: "Уведомления", value: "Авто" },
    ],
    sections: { // ⚠ ПЛЕЙСХОЛДЕР
      problem: {
        title: "Смены в чатах и таблицах",
        body: [
          "График смен жил в переписке и таблице: заявки терялись, замены согласовывались вручную, уведомления рассылал человек.",
          "Нужен был инструмент там, где команда уже находится — в Telegram, — без установки отдельного приложения.",
        ],
      },
      solution: {
        title: "Mini App поверх FastAPI и PostgreSQL",
        body: [
          "Telegram Mini App для сотрудников и администратора: сетка смен, заявки на смену и замену, подтверждения.",
          "FastAPI + PostgreSQL как единый источник правды; уведомления и напоминания уходят ботом по событиям, а не по расписанию человека.",
        ],
      },
      result: {
        title: "Расписание собирает себя само",
        body: [
          "Заявки и замены проходят без ручной сверки; история смен — в базе, а не в чате.",
          "Администратор видит сетку целиком, сотрудники — свои смены и уведомления вовремя.",
        ],
      },
    },
    og: { tagline: "Сменное планирование в Telegram Mini App на FastAPI + PostgreSQL" },
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
    meta: { role: "Userbot, пайплайн данных", stack: ["Python", "asyncio", "WebSocket", "PostgreSQL"] },
    preset: "ribbon",
    seed: 4096,
    visibility: "public", // владелец подтвердил публикацию; при необходимости → "redacted"
    readouts: [["ПАРА", "USDT/RUB"], ["ПОРОГ", "±1.2 %"], ["КАНАЛ", "WS"]],
    cover: { kind: "blueprint" },
    gallery: [],
    metrics: [ // ⚠ ПЛЕЙСХОЛДЕР
      { label: "Режим", value: "24 / 7", signal: true },
      { label: "Поток", value: "Реал-тайм" },
      { label: "Контроль", value: "Без ручного" },
    ],
    sections: { // ⚠ ПЛЕЙСХОЛДЕР
      problem: {
        title: "Курс меняется быстрее, чем человек смотрит",
        body: [
          "OTC-котировки живут в нескольких каналах и меняются поминутно; ручной мониторинг пропускал окна и не оставлял истории.",
          "Нужен был наблюдатель, который не спит, не отвлекается и не ошибается в пороге.",
        ],
      },
      solution: {
        title: "Userbot и поток в реальном времени",
        body: [
          "Python-userbot собирает котировки из источников по WebSocket, нормализует и пишет в PostgreSQL.",
          "Пороговые правила и сигналы — события, а не опросы: пересечение порога зажигает уведомление мгновенно.",
        ],
      },
      result: {
        title: "Тихая автоматизация",
        body: [
          "Мониторинг идёт круглосуточно без оператора; каждый сигнал — с историей и временем.",
          "Система живёт без ручного контроля и масштабируется на новые пары и источники.",
        ],
      },
    },
    og: { tagline: "Мониторинг OTC-курсов в реальном времени" },
  },
];

export const listed = () => cases.filter((c) => c.visibility !== "hidden");
export const getCase = (slug: string) => listed().find((c) => c.slug === slug);
/** Соседи по кольцу; при одном кейсе next = null. */
export const neighbors = (slug: string) => {
  const l = listed();
  const i = l.findIndex((c) => c.slug === slug);
  const n = l.length;
  return { prev: n > 1 ? l[(i - 1 + n) % n] : null, next: n > 1 ? l[(i + 1) % n] : null };
};

export type Presented = Omit<Case, "meta" | "readouts" | "gallery"> & {
  nda: boolean;
  readouts: readonly Readout[];
  meta: Case["meta"];
  gallery: readonly Media[];
};
const PLATES: readonly Media[] = [{ kind: "blueprint", view: "detail-a" }, { kind: "blueprint", view: "detail-b" }];
/** ЕДИНСТВЕННЫЙ шлюз редакции: компоненты рендерят Presented, никогда Case. */
export function present(c: Case): Presented {
  const nda = c.visibility === "redacted";
  return {
    ...c,
    nda,
    title: nda ? (c.publicTitle ?? c.title) : c.title,
    meta: nda ? { role: c.meta.role, stack: c.meta.stack, duration: c.meta.duration } : c.meta,
    readouts: nda ? c.readouts.map(([k]) => [k, "——"] as const) : c.readouts,
    gallery: c.gallery.length ? c.gallery : PLATES,
  };
}
/** Гард публикации: redacted-кейс не может нести client/link (сборка падает при импорте). */
export function assertPublishable(list: readonly Case[]) {
  for (const c of list) {
    if (c.visibility === "redacted" && (c.meta.client || c.meta.link))
      throw new Error(`[cases] ${c.slug}: redacted-кейс содержит client/link`);
  }
}
assertPublishable(cases);
