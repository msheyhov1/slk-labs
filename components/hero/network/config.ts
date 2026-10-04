// «Блок» — ВСЕ ручки живой сети в одном месте: форма решётки, порядок роста, физика,
// цвет, кадрирование, пост-обработка, качество. Логика (lattice/growth/simulation) и
// рендер (LivingNetwork/PostFX) значений не содержат — только читают отсюда.
// colors — hex-зеркала tokens.css; в linear их переводит рендер через new THREE.Color (не руками).
import { motion } from "@/lib/motion";

export type Tier = "desktop" | "mobile";
/** Линии грани кольца: full — все линии сетки, odd — только нечётные («#»-панели), none — только рёбра куба. */
export type FaceMode = "full" | "odd" | "none";

export const NETWORK = {
  seed: 1337, // только джиттер рождений (growth); размещение узлов — без случайности
  tiers: { mobileMaxWidth: 768, lowCoreCount: 4 }, // css px; hardwareConcurrency ≤ 4 → десктоп стартует с quality 1

  colors: { ink: "#14171A", inkDeep: "#0F1215", base: "#DAD6CC", bone: "#F2F0E9", signal: "#00E08A" },

  lattice: {
    R0: 2.2, // характерный радиус (диагональ силуэта внешнего куба), локальные единицы
    rings: 3, // вложенные кубы: кольцо r = max(|i|,|j|,|k|) = 1..rings; 0 — ядро
    pitchDiv: 1.633, // шаг a = R0 / (rings · pitchDiv) → силуэт внешнего куба ≈ 0.28 vh, как раньше у сферы
    // что рисовать на гранях кольца 1..rings (рёбра куба, углы и центры граней — всегда)
    faces: { desktop: ["full", "odd", "odd"], mobile: ["full", "odd", "none"] } as Record<Tier, FaceMode[]>,
    sizes: { desktop: [3.2, 2.8, 2.4], mobile: [2.8, 2.4, 2.2] } as Record<Tier, number[]>, // размер точки по кольцу 1..rings
    // бусины: углы колец ≥ cornersFrom + центры граней колец ≥ centresFrom
    hubs: { radius: 0.06, cornersFrom: { desktop: 1, mobile: 2 } as Record<Tier, number>, centresFrom: { desktop: 3, mobile: 3 } as Record<Tier, number> },
    warmRings: [2, 3], // середины рёбер этих колец — тёплые узлы (тихий пульс в покое)
    // пыль (только десктоп), без случайности: призраки невыстроенных клеток кольца rings (вечные) +
    // шахматка поверхности кольца ring (0 = выкл), съедаемая фронтом роста на consumedAt (каждая keepMod-я — вечная)
    dust: { ring: 0, consumedAt: 0.55, keepMod: 6, alpha: 0.18, size: 1.6, ghosts: true },
    // чертёжная рамка: уголки на углах куба (rings + margin)·a, шкала делений на одном ребре, рёбра ядра
    frame: {
      margin: 0.5, bracket: 0.8, tick: 0.25, ticks: 7, // доли шага a
      start: 0, dur: 0.5, hopDelay: 0.1, retract: [0.85, 1], // с; уголки дорисовываются от первого угла по хопам; на дайве уходят последними
      intensity: 0.2, coreEdge: 1.02, // яркость; рёбра ядра чуть снаружи его тела
    },
    axes: { dash: 0.05, gap: 0.05, intensity: 0.12 }, // пунктирные осевые через ядро до рамки
  },

  physics: {
    spring: 5.0, friction: 0.84, pull: 0.45, influence: 0.34, clearZone: 0.26, kick: 0.9,
    alongNormal: 1, // 0..1: тяга курсора проецируется на нормаль узла → грань выгибается линзой, линии не ломаются по одной
    maxOffset: 0.45, // доли шага a: узел никогда не уходит от покоя дальше — сетка остаётся сеткой
    breath: 0.012, breathShells: [0.012, 0.01, 0.008], breathHz: 0.14, heatDecay: 0.9, velocityHeat: 0.15,
  },
  heat: {
    base: [0.2, 0.45], baseHz: 1.0, fromPointer: 0.85,
    front: { peak: 0.9, delay: 0.2, sigma: 0.12 },
  },
  shock: {
    speed: 3.2, band: 0.4, life: 1.0, max: 5, centerClamp: 1.6, haloFlare: 0.3, growth: { delay: 0.15, speed: 2.4 },
    tap: { move: 8, ms: 300 }, // тач: удар только по тапу (сдвиг ≤ move px, ≤ ms), свайп-скролл не бьёт
  },
  packets: { first: 2.6, period: 3.2, speed: 7, sigma: 0.8, bump: 0.55, corePulse: 0.3, halo: 0.15 },
  growth: { start: 0.1, nodeDur: 0.7, jitter: 0.03, total: motion.dur.grow, settle: 1.8, yawFrom: -0.35, coreDur: 0.6, assembledAt: 2.0 },

  frame: {
    fov: 38, near: 1, far: 40, camZ: 11.4, camZGrow: 12.6, // camZ = R0 / (0.28 · 2 · tan 19°) → внешний радиус = 0.28 vh
    desktop: { offsetX: 0.26, offsetY: 0.04, narrowBelow: 1280, narrowScale: 0.86 },
    mobile: { offsetX: 0.28, offsetY: 0.33, radiusVw: 0.3 }, // центр ≈ 78 % ширины / 17 % высоты секции: блок в пустом правом верху, край уходит за экран
    tilt: [0.5, 0, 0], // только наклон (аксонометрия, вертикали остаются вертикальными); без крена
  },
  // yaw0 — покой чуть в стороне от точной изометрии (там рёбра вложенных кубов совпадают в проекции)
  // spin — медленный оборот (как блоки igloo); swing — маятник ±swing вокруг yaw0 с частотой swingHz (если плоские моменты у 0°/90° мешают)
  orbit: { yaw0: 0.65, mode: "spin" as "spin" | "swing", speed: 0.06, swing: 0.35, swingHz: 0.025, parallaxYaw: 0.18, parallaxPitch: 0.12, damp: 4, reducedYaw: 0.65 },
  fog: { nearOffset: -0.3, farOffset: 2.6, farOffsetGrow: 1.2 }, // × (R0 · масштаб группы), относительно живой z камеры
  depthFade: 0.32,
  core: {
    size: 0.34, rimPow: 3.2, rimGain: 1.4, rimGainNoBloom: 1.0, // куб-сид; рёбра рисует рамка (френель на плоских гранях даёт тон, не кромку)
    pulse: { min: 0.25, max: 0.4, hz: 0.35 }, ignite: 0.7, igniteDecay: 3, noiseAmp: 0, noiseFreq: 3.0, noiseSpeed: 0.4,
  },
  halo: { size: 2.2, idle: 0.14, idleNoBloom: 0.2, ignite: 0.9, igniteDecay: 2.5, shockDecay: 3 },
  line: {
    strut: { width: 1.6, widthMobile: 1.4, widthLow: 1.3, intensity: 0.2 },
    hair: { width: 1.0, widthMobile: 0.9, widthLow: 0.8, intensity: 0.1 },
    hotMix: 0.7,
  }, // ширины в CSS px; рамка и осевые — ширина hair
  node: { square: 1, heatSize: 1.8, maxSize: 36, alpha: [0.55, 1.0], baseMul: 0.85, glowGain: 1.8, glowGainNoBloom: 1.1 }, // square 1 = пиксель, 0 = диск
  shade: { min: 0.3, feather: 0.06 }, // NDC; оба тира (на мобайле структура лежит за h1/лидом)
  mobile: { intensity: 0.7 },
  lights: {
    hemi: { sky: "#F2F0E9", ground: "#0F1215", intensity: 0.5 },
    dir: { color: "#F2F0E9", intensity: 0.9, position: [-4, 5, 6] },
    hubColorMul: 0.7, hubEmissive: 1.8, hubRoughness: 0.45, hubMetalness: 0.1,
  },
  post: { bloom: { strength: 0.5, radius: 0.55, threshold: 0.8 }, fxaa: true },
  quality: {
    dpr: [1.0, 1.25, 1.5], dprMobile: 1.25,
    // только вниз по onDecline; без flipflops/onFallback — drei считает и подъёмы, а стабильные 60 fps
    // читаются как «подъём» каждые 2.5 с → fallback уронил бы качество в 0 на любом здоровом десктопе
    monitor: { delay: 3.0, iterations: 10, ms: 250, threshold: 0.75 },
  },
  journey: {
    camZEnd: 8.2, yaw: 0.9, ungrow: [0.35, 1], coreShrink: [0.7, 1], dim: [0.6, 1],
    center: 0.6, // ядро сдвигается к центру сцены на 60 % своего смещения (quintInOut(p))
    shadeOff: [0.3, 0.6], // тень под текстом снимается, пока копия уезжает
  },
} as const;

// Производное (не ручка): окно рождений = полный рост − старт − длительность узла (1.9 − 0.1 − 0.7 = 1.1).
export const GROWTH_SPAN = NETWORK.growth.total - NETWORK.growth.start - NETWORK.growth.nodeDur;
/** Шаг решётки a (локальные единицы). */
export const PITCH = NETWORK.lattice.R0 / (NETWORK.lattice.rings * NETWORK.lattice.pitchDiv);
