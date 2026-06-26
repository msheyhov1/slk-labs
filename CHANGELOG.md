# Changelog

## v1.0.0 — 2026-06-26

Первая версия сайта **SLK-labs** (студия разработки и автоматизации).

### Что внутри
- Лендинг: `hero` (живая WebGL-сеть) / `works` / `services` / `manifesto` / `contact`.
- **Живая сеть** на three/@react-three-fiber: мягкая пружинная физика — узлы тянутся к курсору,
  «чистая зона» (не слипаются), импульс-волна по клику; в покое монохром, зелёный лишь при
  взаимодействии. `prefers-reduced-motion` → статичная структура.
- **Адаптивный хедер**: прозрачный + светлый на тёмном герое → костяной + тёмный при скролле.
  Якоря не уезжают под фикс-хедер (`scroll-padding-top`).
- Плавный скролл Lenis, ревилы GSAP/ScrollTrigger, кинетический манифест SplitType.
- Дизайн-система: `styles/tokens.css` → Tailwind v4 `@theme` (единый источник правды);
  шрифты Geist/Geist Mono (latin+cyrillic).
- A11y: семантика, skip-link, видимый focus, `reduced-motion` (включая CSS-переходы),
  тап-зоны ~44px; контраст-закон зелёного соблюдён.

### Архитектура
- Контент отделён от логики: `lib/site.ts`, `lib/content/*`, `lib/cases.ts`.
- Живая сеть разнесена: `components/hero/network/{config,shaders,simulation,LivingNetwork}`.
- Карта связей и тюнинга: `CLAUDE.md` (раздел «Карта реализации») + `ARCHITECTURE.md`.

### Стек (заперт)
Next.js 16 (App Router) · TypeScript · Tailwind v4 · GSAP + ScrollTrigger + CustomEase · Lenis ·
SplitType · three + @react-three/fiber + @react-three/drei.

### Дальше (не в v1)
- Фаза 4 — AI-ассистент (`@anthropic-ai/sdk`, серверный route handler).
- Фаза 5 — реальные кейсы, страницы `work/[slug]`, деплой на Vercel (выполняет владелец).
- ⏳ Финальные токены (костяной/зелёный/шрифты) — одной заменой в `styles/tokens.css`.
