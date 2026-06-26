# SLK-labs — Дизайн-токены (шаблон со стартовыми значениями)

> Структура токенов под наш стек (Next.js + Tailwind + GSAP + Lenis + SplitType + Three.js).
> Значения — стартовые: точные hex и шрифты **финально запираются в Claude Design**, затем
> переезжают в Claude Code как `tokens.css` (единый источник правды).
>
> Антидефолт: мы НЕ берём ни «крем + серриф + терракота», ни «чёрный фон + кислотный акцент».
> Наша система = **светлая костяная база + гротеск + моно-слой + сигнальный зелёный только при взаимодействии**.

---

## 1. Контраст-отчёт (запираем зелёный)

Ключевое техническое решение. Сигнальный зелёный `#00E08A` на костяной базе даёт **1.5:1** — это
провал по любому критерию: тонкая зелёная линия или зелёный текст на светлом практически не читаются.
Поэтому правило:

> **Яркий зелёный живёт против тёмного (ink) или как излучаемый свет/заливка — НЕ как hairline или текст на светлом.
> Когда зелёный должен быть читаем на костяной базе — переключаемся на тёмный `signal-ink`.**

| Пара | Применение | Контраст | WCAG |
|---|---|---|---|
| `ink #14171A` на `bone #F2F0E9` | основной текст | **15.8:1** | AAA |
| `ink-2 #5A5F66` на `bone` | вторичный текст | **5.6:1** | AA |
| `signal #00E08A` на `bone` | ✗ тонкие линии / текст | **1.5:1** | FAIL — не использовать |
| `signal #00E08A` на `ink #14171A` | свечение/акцент на тёмном | **10.3:1** | AAA |
| `signal-ink #0B7A4B` на `bone` | зелёный текст на светлом | **4.7:1** | AA |
| `hairline #DAD6CC` на `bone` | декоративная сетка | ~1.2:1 | только декор (не несёт смысл) |

Вывод: концепция «искра зелёного на монохроме» технически совпадает с тем, где зелёный силён —
на тёмном и как вспышка. На светлой базе для смысловых линий используем графит, для смыслового
зелёного текста — `signal-ink`.

---

## 2. Цвет

| Токен | Hex | Роль |
|---|---|---|
| `--color-bone` | `#F2F0E9` | основная светлая поверхность (чуть холоднее типичного «крема») |
| `--color-bone-sunken` | `#E9E6DD` | глубже на тон — мягкие панели |
| `--color-ink` | `#14171A` | холодный графит: основной текст и тёмная поверхность |
| `--color-ink-2` | `#5A5F66` | вторичный текст на светлом |
| `--color-hairline` | `#DAD6CC` | декоративные структурные линии (низкий контраст намеренно) |
| `--color-signal` | `#00E08A` | **цвет жизни**: свечение/заливка/акцент ПРОТИВ ink; вспыхивает при взаимодействии |
| `--color-signal-ink` | `#0B7A4B` | тёмный зелёный для читаемого зелёного на светлом (~4.7:1) |

Правило применения: в покое — монохром; `signal` только при отклике/ховере/связи. Смысловой границы
на светлом — графит/ink-opacity, не зелёный.

---

## 3. Типографика

**Роли** (финальные шрифты — в Claude Design):
- `--font-display` — выразительный **гротеск** (крупные кинетические высказывания; НЕ серриф).
- `--font-mono` — **моноширинный** (лейблы, координаты, таймстемпы, версии — «слой прибора»).

**Стартовая пара (надёжная, бесплатная, на-бренд):** Geist + Geist Mono (технично, Vercel-native, есть
парный моно под наш инструментальный слой). На герой по желанию — более характерный гротеск только для
display. Альтернативы для проб: Space Grotesk / General Sans (display), JetBrains Mono / IBM Plex Mono (mono).

**Шкала (fluid, `clamp`):**

| Токен | Значение | ~px (min→max) |
|---|---|---|
| `--text-display` | `clamp(3rem, 9vw, 10rem)` | 48 → 160 (герой) |
| `--text-h1` | `clamp(2.25rem, 5vw, 4.5rem)` | 36 → 72 |
| `--text-h2` | `clamp(1.75rem, 3.2vw, 2.75rem)` | 28 → 44 |
| `--text-h3` | `clamp(1.3rem, 2vw, 1.75rem)` | 21 → 28 |
| `--text-lead` | `clamp(1.15rem, 1.6vw, 1.4rem)` | 18 → 22 |
| `--text-body` | `1.0625rem` | 17 |
| `--text-small` | `0.9375rem` | 15 |
| `--text-label` | `0.8125rem` | 13 (моно, uppercase) |

**Высота строки / трекинг / вес** (минимум значений — дисциплина):
`--leading-display: 1.02` · `--leading-tight: 1.1` · `--leading-body: 1.6` · `--leading-mono: 1.45`
`--tracking-display: -0.02em` · `--tracking-tight: -0.01em` · `--tracking-label: 0.08em`
`--weight-regular: 400` · `--weight-medium: 500` · `--weight-semibold: 600`

---

## 4. Отступы, сетка, радиусы

**Шкала отступов (база 4px):**
`--space-1: 4px` · `2: 8` · `3: 12` · `4: 16` · `6: 24` · `8: 32` · `12: 48` · `16: 64` · `24: 96` · `32: 128` · `40: 160` · `48: 192`

**Лейаут:**
`--container-max: 88rem` (1408) · `--container-text: 38rem` (≈608, ширина чтения) ·
`--gutter: clamp(1.25rem, 4vw, 4rem)` · сетка 12 колонок.

**Радиусы** (архитектурный минимум, в основном острые углы):
`--radius-none: 0` · `--radius-sm: 2px` · `--radius-md: 6px`
`--hairline: 1px` (толщина линий)

---

## 5. Моушн (CSS + GSAP)

Принцип: ревилы быстро **оседают в покой** (бюджет производительности, мобайл); зелёный вспыхивает при
взаимодействии; `prefers-reduced-motion` → система застывает в статичную структуру.

**Длительности:**
`--dur-micro: 0.15s` (ховер) · `--dur-short: 0.3s` · `--dur-base: 0.6s` (стандартный ревил) ·
`--dur-slow: 0.9s` (сборка крупного) · `--dur-scene: 1.2s` (переход страниц/сцены)
`--stagger: 0.06s` (пословный/построчный stagger для SplitType)

**Easing (CSS ↔ GSAP):**

| Токен | cubic-bezier | GSAP | Назначение |
|---|---|---|---|
| `--ease-out-quart` | `0.25, 1, 0.5, 1` | `power2.out` | общие выходы |
| `--ease-out-expo` | `0.16, 1, 0.3, 1` | `expo.out` | **сигнатурный «оседание»** (сборка/связывание) |
| `--ease-in-out-quint` | `0.83, 0, 0.17, 1` | `power4.inOut` | переходы сцен/страниц |
| `--ease-standard` | `0.4, 0, 0.2, 1` | `power1.inOut` | служебное |

---

## 6. `tokens.css` — единый источник правды (framework-agnostic)

```css
:root {
  /* — Color — */
  --color-bone: #F2F0E9;
  --color-bone-sunken: #E9E6DD;
  --color-ink: #14171A;
  --color-ink-2: #5A5F66;
  --color-hairline: #DAD6CC;
  --color-signal: #00E08A;       /* glow/accent on dark only */
  --color-signal-ink: #0B7A4B;   /* readable green on light (~4.7:1) */

  /* — Type — */
  --font-display: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", monospace;
  --text-display: clamp(3rem, 9vw, 10rem);
  --text-h1: clamp(2.25rem, 5vw, 4.5rem);
  --text-h2: clamp(1.75rem, 3.2vw, 2.75rem);
  --text-h3: clamp(1.3rem, 2vw, 1.75rem);
  --text-lead: clamp(1.15rem, 1.6vw, 1.4rem);
  --text-body: 1.0625rem;
  --text-small: 0.9375rem;
  --text-label: 0.8125rem;
  --leading-display: 1.02;
  --leading-tight: 1.1;
  --leading-body: 1.6;
  --leading-mono: 1.45;
  --tracking-display: -0.02em;
  --tracking-tight: -0.01em;
  --tracking-label: 0.08em;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;

  /* — Space / layout — */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem; --space-4: 1rem;
  --space-6: 1.5rem;   --space-8: 2rem;    --space-12: 3rem;   --space-16: 4rem;
  --space-24: 6rem;    --space-32: 8rem;   --space-40: 10rem;  --space-48: 12rem;
  --container-max: 88rem;
  --container-text: 38rem;
  --gutter: clamp(1.25rem, 4vw, 4rem);

  /* — Radius / line — */
  --radius-none: 0; --radius-sm: 2px; --radius-md: 6px;
  --hairline: 1px;

  /* — Motion — */
  --dur-micro: 0.15s; --dur-short: 0.3s; --dur-base: 0.6s;
  --dur-slow: 0.9s;   --dur-scene: 1.2s; --stagger: 0.06s;
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  /* живая сеть переключается на статичную структуру в JS по этому же media-query */
}
```

---

## 7. Tailwind v4 — `@theme` (генерирует утилиты bg-bone / text-ink / font-display / text-display / ease-out-expo …)

```css
@import "tailwindcss";

@theme {
  --color-bone: #F2F0E9;
  --color-bone-sunken: #E9E6DD;
  --color-ink: #14171A;
  --color-ink-2: #5A5F66;
  --color-hairline: #DAD6CC;
  --color-signal: #00E08A;
  --color-signal-ink: #0B7A4B;

  --font-display: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --text-display: clamp(3rem, 9vw, 10rem);
  --text-h1: clamp(2.25rem, 5vw, 4.5rem);
  --text-h2: clamp(1.75rem, 3.2vw, 2.75rem);
  --text-h3: clamp(1.3rem, 2vw, 1.75rem);
  --text-lead: clamp(1.15rem, 1.6vw, 1.4rem);

  --tracking-display: -0.02em;
  --tracking-label: 0.08em;

  --spacing: 0.25rem;        /* числовая шкала p-1=4px … p-8=32px генерится отсюда */

  --radius-sm: 2px;
  --radius-md: 6px;

  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quint: cubic-bezier(0.83, 0, 0.17, 1);
}
```
*(Tailwind v3: те же значения положить в `theme.extend` внутри `tailwind.config.js`.)*

---

## 8. GSAP — карта моушна (`lib/motion.ts`)

```ts
// Зеркалит CSS-токены, чтобы CSS и GSAP двигались одинаково.
export const motion = {
  dur:     { micro: 0.15, short: 0.3, base: 0.6, slow: 0.9, scene: 1.2 },
  stagger: 0.06,
  ease:    { out: "power2.out", settle: "expo.out", scene: "power4.inOut", standard: "power1.inOut" },
} as const;

// Точное соответствие cubic-bezier (если нужен паритет с CSS):
// import { CustomEase } from "gsap/CustomEase";
// gsap.registerPlugin(CustomEase);
// CustomEase.create("settle", "0.16, 1, 0.3, 1");

// Пример сигнатурного ревила «сборка/связывание»:
// gsap.from(".reveal", { autoAlpha: 0, y: 24, duration: motion.dur.base,
//   ease: motion.ease.settle, stagger: motion.stagger });
```

---

## Как использовать

1. В Claude Design финально запереть: точный костяной, точный оттенок зелёного (вокруг `#00E08A`),
   и пару шрифтов — затем подставить значения сюда.
2. `tokens.css` — единственный источник правды; импортируется первым.
3. Tailwind `@theme` и `lib/motion.ts` ссылаются на те же значения — не плодим вторую правду.
4. Контраст-правило из §1 — закон: зелёный против ink / как свет; `signal-ink` для зелёного на светлом.
