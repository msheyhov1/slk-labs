# ARCHITECTURE — SLK-labs

Подробная карта реализации. Высокоуровневая версия и таблица «где что крутить» — в `CLAUDE.md`.

## Слои

```
данные/конфиг        →  представление            →  оркестрация
lib/site.ts             components/ui/*              app/page.tsx
lib/content/*           components/sections/*        app/layout.tsx
lib/cases.ts            components/hero/*            app/globals.css
styles/tokens.css       components/{Header,Reveal,KineticText}
lib/{gsap,motion}.ts    components/hero/network/*
```

Зависимости направлены **вниз→вверх** только в одну сторону: компоненты импортируют данные,
данные не знают о компонентах. Циклов нет.

## Дизайн-токены → Tailwind

`styles/tokens.css` объявляет `@theme { … }` (Tailwind v4 CSS-first). Из этого Tailwind:
- генерит утилиты: `--color-bone` → `bg-bone`/`text-bone`; `--text-h2` → `text-h2`; `--ease-out-expo` → `ease-out-expo`; `--tracking-label` → `tracking-label` и т.д.;
- кладёт те же значения в `:root` как CSS-vars → доступны через `var(--color-…)` и произвольные классы `text-[var(--color-ink-fg)]`.

Производные (rgba на тёмном, контейнер, gutter, длительности) — обычный `:root`-блок ниже `@theme`.
`lib/motion.ts` зеркалит easing/длительности для GSAP; `lib/gsap.ts` регистрирует `CustomEase("settle", …)`
= тому же кубику, что и `--ease-out-expo`. Так CSS и GSAP двигаются одинаково.

## Моушн-конвейер

- **Плавный скролл:** `SmoothScroll` создаёт Lenis, гонит его через `gsap.ticker`, синкает
  `lenis.on("scroll", ScrollTrigger.update)`. При `prefers-reduced-motion` Lenis не стартует.
  Инерция регулируется `lerp` (сейчас 0.14 — отзывчиво, не «плавуче»).
- **Ревилы:** `globals.css` прячет `html.js [data-reveal]{opacity:0}` (без JS контент виден — прогресс-энхансмент).
  `Reveal` проигрывает `fromTo(y:22→0, autoAlpha:0→1, ease:settle)` по ScrollTrigger, с `stagger` для гридов.
- **Кинетический текст:** `KineticText` через SplitType бьёт на слова и оседает их по скроллу. Только манифест.

## Живая сеть (сердце) — components/hero/network/

Конвейер: **config.ts (числа) → simulation.ts (физика) → LivingNetwork.tsx (рендер)**.

- `config.ts` — единственное место тюнинга: плотность, `spring/friction/pull/clearZone/kick/breath`,
  радиусы `influence/linkDist`, цвета, яркости линий, приглушённость зелёного.
- `simulation.ts` — чистый класс `NetworkSimulation` (без three/react, тестируемый). Владеет
  типизированными массивами `positions/heat/sizes/segPositions/segColors`. Метод `step(time, dt, pointer, shocks, reduced)`
  на каждый кадр считает физику и заполняет буфер связей; обновляет `segCount`.
- `LivingNetwork.tsx` — r3f `<Canvas>`. Создаёт `BufferGeometry`, чьи атрибуты **ссылаются прямо на
  массивы симуляции** (без копирования). В `useFrame`: `sim.step(...)` → выставить `needsUpdate` + `setDrawRange`.
  Курсор/клик слушаются на **window** (см. ниже), не на канвасе.

### Физическая модель (почему так)
Каждый узел: пружина к «дому» (`rest`) + затухание (`friction`) → всегда **оседает в покой**.
Лёгкое «дыхание» сдвигает цель синусом. Курсор в радиусе `influence` тянет по **sin-профилю**
(`reach = sin(d/R·π)·pull`) — тяга **гаснет у самого курсора** и на краю, поэтому узлы тянутся, но
**не слипаются** в точку. Вплотную (`d < clearZone·R`) добавлено мягкое отталкивание — «чистая зона».
Клик бросает `Shock` — кольцо, толкающее узлы наружу с затуханием. Зелёный (`heat`) загорается от
близости к курсору, скорости и импульса; в покое — только редкие «горячие» узлы тихо пульсируют.

### Почему pointer-events:none + window
`HeroNetwork` оборачивает канвас в `pointer-events:none`, чтобы тач-скролл по герою и клики по CTA
проходили насквозь. Поэтому r3f-события до канваса не доходят — координаты курсора берём САМИ из
`window` `pointermove`/`pointerdown` и переводим в мировые через `getBoundingClientRect` канваса.
(Ранняя версия читала `useThree().pointer` — он залипал в (0,0) при `pointer-events:none`; не повторять.)

### reduced-motion
`simulation.step(..., reduced=true)` не двигает узлы, фиксирует «горячие», считает структуру один раз;
`LivingNetwork` ставит `frameloop="demand"` и рендерит единственный кадр. Получается статичная сеть.

## Адаптивный хедер
`Header` (клиент) по `window.scrollY > 0.7·vh` переключает: прозрачный фон + светлый текст (поверх
тёмного героя) ↔ костяной blur-фон + тёмный текст (поверх светлого контента). Так нет чужеродной
светлой плашки на тёмном герое.

## Фазы
Готово 0–3. Дальше: фаза 4 — `app/api/assistant/route.ts` + `@anthropic-ai/sdk` (серверный ключ);
фаза 5 — реальные кейсы, `work/[slug]`, деплой на Vercel (выполняет владелец).
