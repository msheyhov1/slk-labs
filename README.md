# SLK-labs — сайт студии

Сайт студии разработки и автоматизации. Концепция: **живая система (хребет) + дисциплина
минимализма (форма)**. По-настоящему «живой» один момент — герой с интерактивной сетью на WebGL;
всё остальное чистое, спокойное, быстрое. Спека — в [`CLAUDE.md`](./CLAUDE.md).

## Стек (заперт)

Next.js (App Router) · TypeScript · Tailwind v4 (`@theme`) · GSAP + ScrollTrigger + CustomEase ·
Lenis · SplitType · **three + @react-three/fiber + @react-three/drei** (живая сеть в герое) ·
@anthropic-ai/sdk (фаза 4, серверный route handler).

## Запуск

```bash
npm run dev                     # разработка → http://localhost:3000
npm run build && npm run start  # прод-сборка локально
```

## Структура

Полная карта «что с чем связано / где что крутить» — в [`CLAUDE.md`](./CLAUDE.md) и
[`ARCHITECTURE.md`](./ARCHITECTURE.md). Кратко:

```
app/                layout · page · globals.css · icon.svg
components/
  Header · SmoothScroll (Lenis↔GSAP) · Reveal · KineticText (SplitType)
  hero/Hero · hero/HeroNetwork (lazy)
    hero/network/   config · shaders · simulation · LivingNetwork   ← живая сеть (three/r3f)
  sections/         Works · Services · Manifesto · Contact
  ui/               Container · MonoLabel · Hairline · Button · SectionHead
lib/
  site.ts           нав · метаданные · контакты
  content/          hero · services · manifesto · contact   (весь копирайт)
  cases.ts          данные кейсов
  gsap.ts · motion.ts
styles/tokens.css   ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ → кормит Tailwind @theme
docs/SLK-labs_Design_Tokens.md
```

**Где что крутить:** токены/цвет — `styles/tokens.css`; текст — `lib/content/*`; кейсы — `lib/cases.ts`;
нав/SEO — `lib/site.ts`; **физика/вид живой сети — `components/hero/network/config.ts`**;
плавность скролла — `components/SmoothScroll.tsx`; хедер — `components/Header.tsx`.

## Принципы (из CLAUDE.md)

- **Контраст-закон:** сигнальный зелёный `#00E08A` — только против тёмного / как свет; на светлом
  читаемый зелёный = `#0B7A4B`. Hairline — только декор.
- **Один источник правды** для токенов; CSS и GSAP двигаются одинаково (`expo.out` = «оседание»).
- **Один WebGL-момент** (герой), ленивая загрузка, бюджет 60 FPS / зелёные CWV.
- **`prefers-reduced-motion`** уважается везде → сеть застывает в статичную структуру, ревилы выкл.
- **A11y:** semantic HTML, skip-link, видимый focus, тач-скролл героя не блокируется.

## Что готово / что дальше

Реализованы **фазы 0–3** (каркас, дизайн-система, статические секции + грамматика движения, живая сеть).

Осталось (по CLAUDE.md):
- **Фаза 4 — AI-ассистент:** `app/api/assistant/route.ts` + Anthropic SDK. Нужен серверный
  `ANTHROPIC_API_KEY` (только в `.env.local` / Vercel env, никогда не в клиент).
- **Фаза 5 — контент:** реальные кейсы вместо плейсхолдеров в `lib/cases.ts` (подтвердить, что
  проекты публикуемы — крипто/AML/клиентские могут требовать обезличивания/NDA), страницы `work/[slug]`.
- **Деплой:** git push + Vercel-линковка выполняет владелец (агент аккаунты не заводит).
- ⏳ Подстановка финального костяного/зелёного/шрифтов — одной заменой в `styles/tokens.css`.
