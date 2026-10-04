// Решётка «Ядра» — чистая геометрия, БЕЗ three/react. Детерминирована по seed.
// Оболочки Фибоначчи → маска покрытия (окна, не дырки) → варп/джиттер/линза →
// рёбра (kNN в оболочке = hairs; межоболочечные и корневые = struts) → связность → хабы → пыль.
import { NETWORK as C, type Tier } from "./config";

export type EdgeKind = 0 /* hair — внутри оболочки */ | 1 /* strut — между оболочками / к ядру */;

export interface Lattice {
  N: number;
  rest: Float32Array; // N*3 — позиции покоя
  normal: Float32Array; // N*3 — единичные нормали (для дыхания)
  shell: Uint8Array; // N — индекс оболочки (0 = внешняя)
  size: Float32Array; // N — базовый размер точки
  phase: Float32Array; // N — фаза пульса/дыхания
  warm: Uint8Array; // N — «тёплые» узлы: тихий пульс в покое
  hubIndex: Uint16Array; // H — индексы узлов-хабов
  edgeA: Int16Array; // E
  edgeB: Int16Array; // E; −1 = ROOT (ядро, начало координат)
  edgeKind: Uint8Array; // E
  strutCount: number; // струты первые [0, strutCount)
  hairCount: number; // волоски следом [strutCount, E)
  dust: { count: number; pos: Float32Array; consumedAt: Float32Array; phase: Float32Array };
}

/** Стандартный mulberry32 — детерминированный ГПСЧ в [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fract = (x: number) => x - Math.floor(x);
const hash = (ix: number, iy: number, iz: number) =>
  fract(Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453);
const sm = (f: number) => f * f * (3 - 2 * f);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Value-noise, трилинейная интерполяция — та же конструкция, что в GLSL ядра. [0, 1]. */
function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const c00 = mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx);
  const c10 = mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx);
  const c01 = mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx);
  const c11 = mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx);
  return mix(mix(c00, c10, fy), mix(c01, c11, fy), fz);
}

/** fbm: 3 октавы value-noise, результат в [−1, 1]. */
export function fbm3(x: number, y: number, z: number): number {
  const n =
    (vnoise(x, y, z) + 0.5 * vnoise(2 * x, 2 * y, 2 * z) + 0.25 * vnoise(4 * x, 4 * y, 4 * z)) / 1.75;
  return n * 2 - 1;
}

export function buildLattice(tier: Tier): Lattice {
  const L = C.lattice;
  const shells = tier === "desktop" ? L.desktop.shells : L.mobile.shells;
  const last = shells.length - 1;
  const rng = mulberry32(C.seed);
  const [lx, ly, lz] = L.lens;

  const px: number[] = [], py: number[] = [], pz: number[] = [];
  const shellOf: number[] = [], sizeOf: number[] = [], phaseOf: number[] = [], warmOf: number[] = [];
  const shellStart: number[] = [], shellEnd: number[] = [];

  for (let k = 0; k <= last; k++) {
    const { r, gen, coverage, size } = shells[k];
    shellStart.push(px.length);
    // 1. направления Фибоначчи + 2. маска покрытия (низкочастотная → окна, не рассыпанные дырки)
    const dx = new Float64Array(gen), dy = new Float64Array(gen), dz = new Float64Array(gen), m = new Float64Array(gen);
    for (let j = 0; j < gen; j++) {
      const y = 1 - (2 * (j + 0.5)) / gen;
      const rho = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = j * 2.399963;
      dx[j] = rho * Math.cos(phi); dy[j] = y; dz[j] = rho * Math.sin(phi);
      m[j] = fbm3(dx[j] * L.maskFreq + 31.7 * k, dy[j] * L.maskFreq + 17.3 * k, dz[j] * L.maskFreq + 5.1 * k);
    }
    const keepCount = Math.round(coverage * gen);
    const kept = Array.from({ length: gen }, (_, j) => j)
      .sort((a, b) => m[b] - m[a] || a - b)
      .slice(0, keepCount)
      .sort((a, b) => a - b);
    for (const j of kept) {
      // 3. варп радиуса + джиттер + линза
      const radius = L.R0 * r * (1 + L.warp * fbm3(dx[j] * L.warpFreq + 7.1 * k, dy[j] * L.warpFreq + 3.3 * k, dz[j] * L.warpFreq + 11.9 * k));
      const jit = L.jitter * L.R0 * r;
      const x = (dx[j] * radius + jit * (rng() * 2 - 1)) * lx;
      const y = (dy[j] * radius + jit * (rng() * 2 - 1)) * ly;
      const z = (dz[j] * radius + jit * (rng() * 2 - 1)) * lz;
      px.push(x); py.push(y); pz.push(z);
      shellOf.push(k); sizeOf.push(size);
      phaseOf.push(rng() * Math.PI * 2);
      warmOf.push(rng() < C.heat.baseChance ? 1 : 0);
    }
    shellEnd.push(px.length);
  }
  const N = px.length;
  const d2 = (i: number, j: number) => {
    const ax = px[i] - px[j], ay = py[i] - py[j], az = pz[i] - pz[j];
    return ax * ax + ay * ay + az * az;
  };

  // 4a. kNN внутри оболочки → hairs (пары (min,max) без дублей)
  const hairSet = new Set<number>();
  const hairs: number[] = [];
  const struts: number[] = [];
  const K = L.kNear;
  const bestI = new Array<number>(K), bestD = new Array<number>(K);
  for (let k = 0; k <= last; k++) {
    const s = shellStart[k], e = shellEnd[k];
    for (let i = s; i < e; i++) {
      bestI.fill(-1); bestD.fill(Infinity);
      for (let j = s; j < e; j++) {
        if (j === i) continue;
        const d = d2(i, j);
        if (d >= bestD[K - 1]) continue;
        let q = K - 1;
        while (q > 0 && bestD[q - 1] > d) { bestD[q] = bestD[q - 1]; bestI[q] = bestI[q - 1]; q--; }
        bestD[q] = d; bestI[q] = j;
      }
      for (let q = 0; q < K; q++) {
        const j = bestI[q];
        if (j < 0) continue;
        const a = Math.min(i, j), b = Math.max(i, j), key = a * N + b;
        if (!hairSet.has(key)) { hairSet.add(key); hairs.push(a, b); }
      }
    }
  }
  // 4b. межоболочечные струты — к ближайшему узлу следующей (внутренней) оболочки
  const nearestIn = (i: number, k: number) => {
    let best = -1, bd = Infinity;
    for (let j = shellStart[k]; j < shellEnd[k]; j++) { const d = d2(i, j); if (d < bd) { bd = d; best = j; } }
    return best;
  };
  for (let k = 0; k < last; k++)
    for (let i = shellStart[k]; i < shellEnd[k]; i++)
      if (rng() < L.crossRatio) { const j = nearestIn(i, k + 1); if (j >= 0) struts.push(i, j); }
  // 4c. корневые: вся внутренняя оболочка — к ядру
  for (let i = shellStart[last]; i < shellEnd[last]; i++) struts.push(i, -1);

  // 5. связность: BFS от корня; оторванный узел пришиваем струтом к ближайшему достигнутому
  //    и заливаем его компоненту (чтобы не плодить лишних струтов). Рост остаётся полным.
  const adj: number[][] = Array.from({ length: N }, () => []);
  const addAdj = (a: number, b: number) => { if (a >= 0 && b >= 0) { adj[a].push(b); adj[b].push(a); } };
  for (let e = 0; e < hairs.length; e += 2) addAdj(hairs[e], hairs[e + 1]);
  for (let e = 0; e < struts.length; e += 2) addAdj(struts[e], struts[e + 1]);
  const reached = new Uint8Array(N);
  const flood = (seed: number) => {
    const q = [seed]; reached[seed] = 1;
    for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!reached[v]) { reached[v] = 1; q.push(v); }
  };
  for (let i = shellStart[last]; i < shellEnd[last]; i++) if (!reached[i]) flood(i);
  for (let i = 0; i < N; i++) {
    if (reached[i]) continue;
    let best = -1, bd = Infinity;
    for (let j = 0; j < N; j++) if (reached[j]) { const d = d2(i, j); if (d < bd) { bd = d; best = j; } }
    struts.push(i, best); addAdj(i, best); flood(i);
  }

  const strutCount = struts.length / 2, hairCount = hairs.length / 2, E = strutCount + hairCount;
  const edgeA = new Int16Array(E), edgeB = new Int16Array(E), edgeKind = new Uint8Array(E);
  for (let e = 0; e < strutCount; e++) { edgeA[e] = struts[2 * e]; edgeB[e] = struts[2 * e + 1]; edgeKind[e] = 1; }
  for (let e = 0; e < hairCount; e++) { edgeA[strutCount + e] = hairs[2 * e]; edgeB[strutCount + e] = hairs[2 * e + 1]; edgeKind[strutCount + e] = 0; }

  // 6. хабы: по оболочке — perShell узлов с наибольшей степенью (≥ minDegree); всегда тёплые
  const degree = new Uint16Array(N);
  for (let e = 0; e < E; e++) { degree[edgeA[e]]++; if (edgeB[e] >= 0) degree[edgeB[e]]++; }
  const perShell = tier === "desktop" ? L.hubs.perShellDesktop : L.hubs.perShellMobile;
  const hubs: number[] = [];
  for (let k = 0; k <= last; k++) {
    const cand: number[] = [];
    for (let i = shellStart[k]; i < shellEnd[k]; i++) if (degree[i] >= L.hubs.minDegree) cand.push(i);
    cand.sort((a, b) => degree[b] - degree[a] || a - b);
    for (const i of cand.slice(0, perShell)) hubs.push(i); // хабы НЕ греем принудительно: в покое — костяные бусины
  }

  // 7. пыль (только десктоп): внутренняя съедается первой; keepRatio — никогда (дышит)
  const D = tier === "desktop" ? L.dust.count : 0;
  const dpos = new Float32Array(D * 3), dcons = new Float32Array(D), dphase = new Float32Array(D);
  for (let i = 0; i < D; i++) {
    let u = 0, v = 0, s = 1;
    do { u = rng() * 2 - 1; v = rng() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const f = 2 * Math.sqrt(1 - s);
    const t = Math.cbrt(rng());
    const rr = L.R0 * (L.dust.rMin + (L.dust.rMax - L.dust.rMin) * t);
    dpos[i * 3] = u * f * rr * lx;
    dpos[i * 3 + 1] = v * f * rr * ly;
    dpos[i * 3 + 2] = (1 - 2 * s) * rr * lz;
    dcons[i] = rng() < L.dust.keepRatio ? 2.0 : 0.08 + 0.87 * t;
    dphase[i] = rng() * Math.PI * 2;
  }

  const rest = new Float32Array(N * 3), normal = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const x = px[i], y = py[i], z = pz[i];
    const len = Math.hypot(x, y, z) || 1;
    rest[i * 3] = x; rest[i * 3 + 1] = y; rest[i * 3 + 2] = z;
    normal[i * 3] = x / len; normal[i * 3 + 1] = y / len; normal[i * 3 + 2] = z / len;
  }

  return {
    N, rest, normal,
    shell: Uint8Array.from(shellOf), size: Float32Array.from(sizeOf), phase: Float32Array.from(phaseOf), warm: Uint8Array.from(warmOf),
    hubIndex: Uint16Array.from(hubs),
    edgeA, edgeB, edgeKind, strutCount, hairCount,
    dust: { count: D, pos: dpos, consumedAt: dcons, phase: dphase },
  };
}
