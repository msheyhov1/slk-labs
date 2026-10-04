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

## Живая сеть «Ядро» (сердце) — components/hero/network/

Конвейер: **config.ts (все ручки) → lattice.ts (форма) → growth.ts (порядок сборки) → simulation.ts
(физика + буферы) → LivingNetwork.tsx (r3f-рендер)**, плюс `post.ts`/`PostFX.tsx` (bloom/FXAA на десктопе)
и `journey.ts` (прогресс/видимость). Зависимости направлены только слева направо; lattice/growth/simulation —
чистые (без three/react). Цвета из config — hex-зеркала tokens.css, в linear их переводит рендер через
`new THREE.Color(hex)` (руками не конвертировать).

- `config.ts` — единственное место тюнинга: оболочки (радиусы, плотность, покрытие), линза, рёбра
  (`kNear`/`crossRatio`), хабы, пыль; физика (`spring/friction/pull/clearZone/kick`, дыхание); жар (тёплые
  узлы, фронт роста); удары; пакеты; рост (старт/длительность/оседание; `total` = `motion.dur.grow`);
  кадрирование (`fov/camZ/offset/tilt`); туман; ядро/гало; линии; пост (bloom); качество; journey.
- `lattice.ts` — детерминированная (seed) решётка: три (мобайл — две) оболочки точек Фибоначчи, маска
  покрытия на низкочастотном fbm (окна, не дырки), варп/джиттер/линза; рёбра: kNN в оболочке = hairs,
  межоболочечные и корневые = struts (струты в буфере первыми); BFS-связность от корня (оторванное
  пришивается струтом); хабы = узлы с наибольшей степенью (в покое — костяные бусины, принудительно не
  греются); пыль внутри объёма (только десктоп).
- `growth.ts` — BFS от корня → `hop/parent/order`; рождение = `start + hop·(span/maxHop) + джиттер`;
  `treeEdge`; easing-хелперы `expoOut/quintInOut/smoothstep` — тот же кубик, что CustomEase settle/scene
  (gsap в 3D-чанк не попадает).
- `simulation.ts` — `LatticeSimulation`: владеет всеми буферами (positions/heat/grow/shade/meta узлов+пыли,
  позиции/цвета струтов и волосков, позиции/жар/масштаб хабов). `step(dt, pointerRay, shocks, progress)`:
  **своё время `simTime`** двигается только внутри step → пауза вне экрана невидима для роста/пакетов/
  ударов; анти-рост от `progress`; пакеты; узлы в BFS-порядке (якорь = родитель, уже обновлённый в этом
  кадре); дыхание оболочек; туннель курсора по лучу (тяга по sin-профилю + чистая зона); удары-сферы;
  источники жара; затем заливка связей O(E) и хабов. `stepStatic()` — собранная решётка одним выстрелом
  (reduced-motion). Силы заданы как импульсы за кадр при 60 fps (`spring/pull·60`, как `kick·60`).
  **Топология статична**: число рёбер постоянно, меняются только позиции и цвета.
- `shaders.ts` — GLSL узлов+пыли (один Points-draw), ядра (френель + шум вершин), гало, инъекции в
  MeshStandardMaterial хабов (emissive ∝ жар², т.е. зелёный лишь от пакета/курсора/фронта роста).
- `LivingNetwork.tsx` — `<Canvas flat>` + `Scene`: атрибуты геометрий **ссылаются на буферы симуляции**
  без копий (LineSegments2 для струтов/волосков, InstancedMesh для хабов). Граф: frame (размещение/масштаб/
  параллакс) → tilt → spin (локальное пространство sim). В `useFrame` строго по порядку: риг (камера/туман/
  орбита/параллакс) → тень под текстом (проекция узлов в NDC против прямоугольников `[data-hero-text]`:
  верхняя строка, h1, лид; на обоих тирах) → луч курсора **в локальном пространстве spin-группы** → удар роста → `sim.step` → flush.
  Курсор и клик слушаются на **window** (канвасу явно задан `style.pointerEvents = none` — r3f иначе ставит
  inline `auto`), клики по a/button не пульсируют.
- `post.ts` / `PostFX.tsx` — только десктоп: EffectComposer → RenderPass → UnrealBloomPass → OutputPass →
  FXAAPass (HalfFloat-буфер, HDR-жар цветёт; `quality < 2` выключает bloom; useFrame priority 1).
- `journey.ts` — мутируемый стор без three: `progress` (0..1; позже пишет ScrollTrigger), `visible`
  (IntersectionObserver), `assembled` + `onAssembled()`, `quality`. Единственный файл сети в главном бандле.

### Ярусы и качество
- **desktop** (≥ 768 css px и fine pointer): 3 оболочки, N≈340, пыль, bloom+FXAA, dpr ≤ 1.5. Качество
  2 → 1 (без bloom, dpr 1.25) → 0 (dpr 1, тонкие линии, без пыли) по drei `PerformanceMonitor` (взводится
  через 3 с, чтобы пик роста не считался просадкой; только вниз по `onDecline`; без `flipflops`/`onFallback` —
  drei считает и подъёмы, стабильные 60 fps = «подъём» каждые 2.5 с; смонтирован только пока герой на экране,
  чтобы редкие demand-кадры после паузы не читались как просадка).
- **mobile** (< 768 или coarse pointer): 2 оболочки, N≈142, без пыли/композера/параллакса/туннеля, MSAA,
  интенсивность 0.7 (узлы, связи и бусины-хабы), тень под текстом тоже работает, объект в правом верху
  (центр ≈ 78 % ширины / 20 % высоты секции, диаметр 60 % ширины, край уходит за экран), тап (не
  свайп-скролл) = удар; m1 (dpr 1.25) → m0 (dpr 1).
- **reduced-motion**: `frameloop='demand'`, `stepStatic()`, один кадр (на десктопе — через bloom),
  никаких слушателей; при смене медиазапроса сцена перемонтируется по key.

### Прогресс и пауза
- `journey.setProgress(p)` → в useFrame: камера `camZ → camZEnd`, доворот `yaw·p`, туман следует за камерой,
  анти-рост `smoothstep(0.35, 1, p)`, приглушение, усадка ядра. Всё — чистая функция (simTime, p): скраб
  назад точен.
- `HeroNetwork` держит IntersectionObserver (rootMargin 80px): канвас монтируется при первой видимости,
  вне экрана `frameloop='demand'` — ни рендера, ни step; возврат продолжает ровно с места паузы
  (dt зажат 1/30).

### Бандл
Ленивый 3D-чанк (three + r3f + lines + postprocessing + PerformanceMonitor + наш код) ≈ **256 KB gz**
при бюджете 350 KB. В чанке запрещены: drei Environment/Lightformer/useEnvironment/Segments/Line/
MeshTransmissionMaterial, RoomEnvironment/PMREM, @react-three/postprocessing, gsap, three-stdlib, gainmap-js.
Проверка: `f=$(grep -l WebGLRenderer .next/static/chunks/*.js); gzip -c $f | wc -c`.

## Адаптивный хедер
`Header` (клиент) по `window.scrollY > 0.7·vh` переключает: прозрачный фон + светлый текст (поверх
тёмного героя) ↔ костяной blur-фон + тёмный текст (поверх светлого контента). Так нет чужеродной
светлой плашки на тёмном герое.

## Фазы
Готово 0–3. Дальше: фаза 4 — `app/api/assistant/route.ts` + `@anthropic-ai/sdk` (серверный ключ);
фаза 5 — реальные кейсы, `work/[slug]`, деплой на Vercel (выполняет владелец).
