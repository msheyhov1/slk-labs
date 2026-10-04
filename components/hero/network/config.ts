// «Ядро» — ВСЕ ручки живой сети в одном месте: форма решётки, порядок роста, физика,
// цвет, кадрирование, пост-обработка, качество. Логика (lattice/growth/simulation) и
// рендер (LivingNetwork/PostFX) значений не содержат — только читают отсюда.
// colors — hex-зеркала tokens.css; в linear их переводит рендер через new THREE.Color (не руками).
import { motion } from "@/lib/motion";

export type Tier = "desktop" | "mobile";

export const NETWORK = {
  seed: 1337,
  tiers: { mobileMaxWidth: 768, lowCoreCount: 4 }, // css px; hardwareConcurrency ≤ 4 → десктоп стартует с quality 1

  colors: { ink: "#14171A", inkDeep: "#0F1215", base: "#DAD6CC", bone: "#F2F0E9", signal: "#00E08A" },

  lattice: {
    R0: 2.2, // внешний радиус, локальные единицы
    lens: [1.0, 0.82, 0.9], // анизотропный масштаб → наклонённая линза, не шар
    desktop: {
      shells: [
        { r: 1.0, gen: 230, coverage: 0.78, size: 2.4 }, // gen = точек Фибоначчи; coverage = доля оставленных
        { r: 0.7, gen: 122, coverage: 0.9, size: 2.8 },
        { r: 0.41, gen: 50, coverage: 1.0, size: 3.2 },
      ],
    }, // → N ≈ 340
    mobile: {
      shells: [
        { r: 1.0, gen: 115, coverage: 0.8, size: 2.2 },
        { r: 0.45, gen: 50, coverage: 1.0, size: 2.8 },
      ],
    }, // → N ≈ 142
    jitter: 0.06, warp: 0.18, warpFreq: 1.7, maskFreq: 1.1,
    kNear: 3, crossRatio: 0.4,
    hubs: { minDegree: 4, perShellDesktop: 14, perShellMobile: 10, radius: 0.075 },
    dust: { count: 600, rMin: 0.5, rMax: 1.35, keepRatio: 0.12, alpha: 0.14, size: 1.4 }, // только десктоп
  },

  physics: {
    spring: 3.4, friction: 0.86, pull: 1.0, influence: 0.42, clearZone: 0.26, kick: 1.6,
    breath: 0.03, breathShells: [0.012, 0.01, 0.008], breathHz: 0.14, heatDecay: 0.9, velocityHeat: 0.2,
  },
  heat: {
    baseChance: 0.12, base: [0.2, 0.45], baseHz: 1.4, fromPointer: 0.85,
    front: { peak: 0.95, delay: 0.2, sigma: 0.16 },
  },
  shock: {
    speed: 3.2, band: 0.5, life: 1.2, max: 5, centerClamp: 1.6, haloFlare: 0.4, growth: { delay: 0.15, speed: 2.4 },
    tap: { move: 8, ms: 300 }, // тач: удар только по тапу (сдвиг ≤ move px, ≤ ms), свайп-скролл не бьёт
  },
  packets: { first: 2.6, period: 3.2, speed: 9, sigma: 1.1, bump: 0.55, corePulse: 0.3, halo: 0.15 },
  growth: { start: 0.1, nodeDur: 0.7, jitter: 0.08, total: motion.dur.grow, settle: 1.8, yawFrom: -0.55, coreDur: 0.6, assembledAt: 2.0 },

  frame: {
    fov: 38, near: 1, far: 40, camZ: 11.4, camZGrow: 12.6, // camZ = R0 / (0.28 · 2 · tan 19°) → внешний радиус = 0.28 vh
    desktop: { offsetX: 0.26, offsetY: 0.04, narrowBelow: 1280, narrowScale: 0.86 },
    mobile: { offsetX: 0.28, offsetY: 0.3, radiusVw: 0.3 }, // центр ≈ 78 % ширины / 20 % высоты секции: ядро в пустом правом верху, край уходит за экран
    tilt: [0.35, 0, -0.2],
  },
  orbit: { speed: 0.06, parallaxYaw: 0.18, parallaxPitch: 0.12, damp: 4, reducedYaw: 0.4 },
  fog: { nearOffset: -0.3, farOffset: 2.6, farOffsetGrow: 1.2 }, // × (R0 · масштаб группы), относительно живой z камеры
  depthFade: 0.32,
  core: {
    radius: 0.42, detail: 4, rimPow: 2.6, rimGain: 1.6, rimGainNoBloom: 1.1,
    pulse: { min: 0.25, max: 0.4, hz: 0.35 }, ignite: 0.7, igniteDecay: 3, noiseAmp: 0.02, noiseFreq: 3.0, noiseSpeed: 0.4,
  },
  halo: { size: 2.8, idle: 0.18, idleNoBloom: 0.26, ignite: 0.9, igniteDecay: 2.5, shockDecay: 3 },
  line: {
    strut: { width: 1.7, widthMobile: 1.4, widthLow: 1.3, intensity: 0.16 },
    hair: { width: 1.0, widthMobile: 0.9, widthLow: 0.8, intensity: 0.1 },
    hotMix: 0.7,
  }, // ширины в CSS px
  node: { heatSize: 1.8, maxSize: 36, alpha: [0.55, 1.0], baseMul: 0.85, glowGain: 1.8, glowGainNoBloom: 1.1 },
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
