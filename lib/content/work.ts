// ВЕСЬ копирайт обложек и страниц кейсов.
export const work = {
  back: "← Все кейсы",
  next: "Следующий кейс",
  open: "Открыть проект →",
  coverHint: "[ открыть кейс ]",
  live: "LIVE",
  meta: { type: "Тип", year: "Год", stack: "Стек", role: "Роль", duration: "Срок", client: "Клиент" },
  sections: { problem: "01 / Задача", solution: "02 / Решение", result: "03 / Результат", materials: "04 / Материалы" },
  materialsTitle: "Материалы",
  metrics: "Показатели",
  presetLabel: { globe: "ГЛОБУС / ПОСТАВКИ", lattice: "РЕШЁТКА / СМЕНЫ", ribbon: "ЛЕНТА / КУРС" },
  plateCaption: "Чертёж системы · процедурно",
  nda: { badge: "NDA", client: "Клиент не раскрывается", note: "Данные обезличены по соглашению о неразглашении." },
  crumbs: { home: "Главная", works: "Кейсы" },
  titleSuffix: "кейс SLK-labs",
  notFound: { index: "404", title: "Такой комнаты нет", lead: "Страница не найдена или ещё не собрана.", home: "На главную" },
  aria: {
    card: (title: string, sub: string) => `Кейс ${title} — ${sub}`,
    nav: "Навигация по кейсам",
    stage: (title: string) => `Чертёж системы: ${title}`,
  },
} as const;
