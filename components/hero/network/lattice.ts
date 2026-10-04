// Решётка «Блок» — чистая геометрия, БЕЗ three/react и БЕЗ случайности в размещении.
// Целочисленная сетка (i,j,k) с шагом a; кольцо r = max(|i|,|j|,|k|) (Чебышёв) → вложенные кубы:
// кольца 1..rings — поверхности кубов, 0 — ядро. На грани кольца оставляем точки по правилу faces
// (full / odd / none); рёбра куба, углы и центры граней — всегда. Рёбра: соседние по сетке точки
// одного кольца (ребро куба = strut, линия грани = hair) + спицы из опорных точек кольца r (центры
// граней — по оси = strut; углы — по телесной диагонали = hair) в то же место кольца r−1 (кольцо 1 → ядро).
// Хабы, тёплые узлы, пыль и рамка — тоже правилом.
import { NETWORK as C, PITCH, type Tier, type FaceMode } from "./config";

export type EdgeKind = 0 /* hair — линия грани */ | 1 /* strut — ребро куба / спица / к ядру */;

/** Статичные отрезки чертежа (fixed → free): уголки рамки, шкала, рёбра ядра. hop — порядок дорисовки. */
export interface FrameSegments {
  count: number;
  rest: Float32Array; // count*6 — fixed(xyz), free(xyz) в покое
  hop: Uint8Array; // count — задержка дорисовки в хопах (× frame.hopDelay)
  core: Uint8Array; // count — 1 = ребро ядра: масштабируется coreScale·frame.coreEdge
}

export interface Lattice {
  N: number;
  pitch: number; // шаг a
  rest: Float32Array; // N*3 — позиции покоя
  normal: Float32Array; // N*3 — внешняя нормаль куба (грань → ось, ребро → диагональ, угол → телесная диагональ)
  shell: Uint8Array; // N — индекс оболочки (0 = внешнее кольцо)
  size: Float32Array; // N — базовый размер точки
  phase: Float32Array; // N — фаза дыхания: диагональная волна (i+j+k), не случайная
  warm: Uint8Array; // N — «тёплые» узлы: середины рёбер колец warmRings
  hubIndex: Uint16Array; // H — углы + центры граней
  edgeA: Int16Array; // E
  edgeB: Int16Array; // E; −1 = ROOT (ядро, начало координат)
  edgeKind: Uint8Array; // E
  strutCount: number; // струты первые [0, strutCount)
  hairCount: number; // волоски следом [strutCount, E)
  dust: { count: number; pos: Float32Array; consumedAt: Float32Array; phase: Float32Array };
  frame: FrameSegments; // уголки + шкала + рёбра ядра (сплошные)
  axes: FrameSegments; // осевые через ядро (пунктир), всегда hop 0
}

// PRNG живёт в lib/ (его же используют чертежи кейсов и OG); здесь — реэкспорт для джиттера рождений.
import { mulberry32 } from "@/lib/prng";
export { mulberry32 };

const ROOT = -1;

/** Линия грани кольца r с постоянной координатой c (|c| < r) рисуется? */
function onLine(mode: FaceMode, c: number): boolean {
  if (mode === "full") return true;
  if (mode === "odd") return (c & 1) !== 0;
  return false;
}

export function buildLattice(tier: Tier): Lattice {
  const L = C.lattice;
  const R = L.rings;
  const a = PITCH;
  const faces = L.faces[tier];
  const sizes = L.sizes[tier];
  const key = (i: number, j: number, k: number) => ((i + R) * (2 * R + 1) + (j + R)) * (2 * R + 1) + (k + R);
  const ringOf = (i: number, j: number, k: number) => Math.max(Math.abs(i), Math.abs(j), Math.abs(k));

  // 1. узлы: по кольцам, внутри кольца — по (i, j, k) возрастанию; indexOf — обратный поиск
  const gi: number[] = [], gj: number[] = [], gk: number[] = [], ring: number[] = [];
  const indexOf = new Int16Array((2 * R + 1) ** 3).fill(-1);
  const keep = (r: number, i: number, j: number, k: number) => {
    const m = (Math.abs(i) === r ? 1 : 0) + (Math.abs(j) === r ? 1 : 0) + (Math.abs(k) === r ? 1 : 0);
    if (m >= 2) return true; // ребро или угол
    // точка грани: координаты в грани — те, что не на ±r
    const u = Math.abs(i) === r ? j : i, v = Math.abs(k) === r ? j : k;
    if (u === 0 && v === 0) return true; // центр грани (точка прокола оси)
    const mode = faces[r - 1];
    return onLine(mode, u) || onLine(mode, v);
  };
  for (let r = 1; r <= R; r++)
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++)
        for (let k = -r; k <= r; k++) {
          if (ringOf(i, j, k) !== r || !keep(r, i, j, k)) continue;
          indexOf[key(i, j, k)] = gi.length;
          gi.push(i); gj.push(j); gk.push(k); ring.push(r);
        }
  const N = gi.length;

  // 2. рёбра одного кольца: соседи по +i/+j/+k; ребро куба → strut, линия грани → hair (по правилу faces)
  const struts: number[] = [], hairs: number[] = [];
  const atR = (c: number, r: number) => Math.abs(c) === r;
  for (let p = 0; p < N; p++) {
    const r = ring[p], i = gi[p], j = gj[p], k = gk[p];
    const mode = faces[r - 1];
    const tryEdge = (di: number, dj: number, dk: number) => {
      const i2 = i + di, j2 = j + dj, k2 = k + dk;
      if (ringOf(i2, j2, k2) !== r) return;
      const q = indexOf[key(i2, j2, k2)];
      if (q < 0) return;
      // координаты на ±r, общие для обеих точек (перпендикуляр направлению отрезка)
      const fixI = di === 0 && atR(i, r), fixJ = dj === 0 && atR(j, r), fixK = dk === 0 && atR(k, r);
      const fixed = (fixI ? 1 : 0) + (fixJ ? 1 : 0) + (fixK ? 1 : 0);
      if (fixed >= 2) { struts.push(p, q); return; } // ребро куба
      // линия грани: постоянная координата в грани = та, что не на ±r и не вдоль отрезка
      const c = di !== 0 ? (fixJ ? k : j) : dj !== 0 ? (fixI ? k : i) : fixI ? j : i;
      if (onLine(mode, c)) hairs.push(p, q);
    };
    tryEdge(1, 0, 0); tryEdge(0, 1, 0); tryEdge(0, 0, 1);
  }
  // 3. спицы из опорных точек: центр грани → по оси внутрь (strut), угол → по телесной диагонали (hair);
  //    кольцо 1 → ядро. Середины рёбер держатся за рёбра куба — без «ежа» из 26 лучей вокруг сида
  const clampTo = (c: number, r: number) => Math.max(-r, Math.min(r, c));
  for (let p = 0; p < N; p++) {
    const r = ring[p], i = gi[p], j = gj[p], k = gk[p];
    const m = (atR(i, r) ? 1 : 0) + (atR(j, r) ? 1 : 0) + (atR(k, r) ? 1 : 0);
    const u = atR(i, r) ? j : i, v = atR(k, r) ? j : k;
    const corner = m === 3, centre = m === 1 && u === 0 && v === 0;
    if (!corner && !centre) continue;
    const q = r === 1 ? ROOT : indexOf[key(clampTo(i, r - 1), clampTo(j, r - 1), clampTo(k, r - 1))];
    if (q === ROOT || q >= 0) (centre ? struts : hairs).push(p, q);
  }

  // 4. связность: по построению полная; страховка — BFS от ядра, оторванное пришивается к ближайшему достигнутому
  const adj: number[][] = Array.from({ length: N }, () => []);
  const addAdj = (p: number, q: number) => { if (p >= 0 && q >= 0) { adj[p].push(q); adj[q].push(p); } };
  for (let e = 0; e < hairs.length; e += 2) addAdj(hairs[e], hairs[e + 1]);
  for (let e = 0; e < struts.length; e += 2) addAdj(struts[e], struts[e + 1]);
  const reached = new Uint8Array(N);
  const flood = (seed: number) => {
    const q = [seed]; reached[seed] = 1;
    for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!reached[v]) { reached[v] = 1; q.push(v); }
  };
  for (let p = 0; p < N; p++) if (ring[p] === 1 && !reached[p]) flood(p);
  const d2 = (p: number, q: number) => (gi[p] - gi[q]) ** 2 + (gj[p] - gj[q]) ** 2 + (gk[p] - gk[q]) ** 2;
  for (let p = 0; p < N; p++) {
    if (reached[p]) continue;
    let best = -1, bd = Infinity;
    for (let q = 0; q < N; q++) if (reached[q]) { const d = d2(p, q); if (d < bd) { bd = d; best = q; } }
    struts.push(p, best); addAdj(p, best); flood(p);
  }

  const strutCount = struts.length / 2, hairCount = hairs.length / 2, E = strutCount + hairCount;
  const edgeA = new Int16Array(E), edgeB = new Int16Array(E), edgeKind = new Uint8Array(E);
  for (let e = 0; e < strutCount; e++) { edgeA[e] = struts[2 * e]; edgeB[e] = struts[2 * e + 1]; edgeKind[e] = 1; }
  for (let e = 0; e < hairCount; e++) { edgeA[strutCount + e] = hairs[2 * e]; edgeB[strutCount + e] = hairs[2 * e + 1]; edgeKind[strutCount + e] = 0; }

  // 5. атрибуты узлов: позиции, нормали, оболочки (0 = внешняя), размеры, фаза-волна, тёплые, хабы
  const rest = new Float32Array(N * 3), normal = new Float32Array(N * 3);
  const shell = new Uint8Array(N), size = new Float32Array(N), phase = new Float32Array(N), warm = new Uint8Array(N);
  const hubs: number[] = [];
  const warmSet = new Set<number>(L.warmRings);
  for (let p = 0; p < N; p++) {
    const r = ring[p], i = gi[p], j = gj[p], k = gk[p];
    rest[p * 3] = i * a; rest[p * 3 + 1] = j * a; rest[p * 3 + 2] = k * a;
    const nx = atR(i, r) ? Math.sign(i) : 0, ny = atR(j, r) ? Math.sign(j) : 0, nz = atR(k, r) ? Math.sign(k) : 0;
    const len = Math.hypot(nx, ny, nz) || 1;
    normal[p * 3] = nx / len; normal[p * 3 + 1] = ny / len; normal[p * 3 + 2] = nz / len;
    shell[p] = R - r;
    size[p] = sizes[r - 1];
    phase[p] = ((i + j + k) * Math.PI) / 4 + (r * Math.PI) / 3;
    const m = Math.abs(nx) + Math.abs(ny) + Math.abs(nz);
    const zeros = (i === 0 ? 1 : 0) + (j === 0 ? 1 : 0) + (k === 0 ? 1 : 0);
    if (m === 2 && zeros === 1 && warmSet.has(r)) warm[p] = 1; // середина ребра
    if ((m === 3 && r >= L.hubs.cornersFrom[tier]) || (m === 1 && zeros === 2 && r >= L.hubs.centresFrom[tier])) hubs.push(p); // угол / центр грани
  }

  // 6. пыль (только десктоп), без случайности: призраки невыстроенных клеток кольца R + шахматка кольца dust.ring
  const dpos: number[] = [], dcons: number[] = [], dphase: number[] = [];
  if (tier === "desktop") {
    const D = L.dust;
    if (D.ghosts)
      for (let i = -R; i <= R; i++)
        for (let j = -R; j <= R; j++)
          for (let k = -R; k <= R; k++) {
            if (ringOf(i, j, k) !== R || indexOf[key(i, j, k)] >= 0) continue;
            dpos.push(i * a, j * a, k * a); dcons.push(2.0); dphase.push((i + j + k) * 0.7);
          }
    const r4 = D.ring;
    if (r4 > R) for (let i = -r4; i <= r4; i++)
      for (let j = -r4; j <= r4; j++)
        for (let k = -r4; k <= r4; k++) {
          const s = i + j + k;
          if (ringOf(i, j, k) !== r4 || (s & 1) !== 0) continue;
          dpos.push(i * a, j * a, k * a);
          dcons.push(((s % D.keepMod) + D.keepMod) % D.keepMod === 0 ? 2.0 : D.consumedAt);
          dphase.push(s * 0.7);
        }
  }

  // 7. чертёжная рамка (fixed → free): уголки на 8 углах куба F, шкала делений на ребре (+F, y, +F), рёбра ядра
  const F = (R + L.frame.margin) * a;
  const fr: number[] = [], fhop: number[] = [], fcore: number[] = [];
  const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, hop: number, core = 0) => {
    fr.push(x0, y0, z0, x1, y1, z1); fhop.push(hop); fcore.push(core);
  };
  const bl = L.frame.bracket * a;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const hop = (sx > 0 ? 1 : 0) + (sy > 0 ? 1 : 0) + (sz > 0 ? 1 : 0); // от угла (−,−,−) по хопам
    const x = sx * F, y = sy * F, z = sz * F;
    seg(x, y, z, x - sx * bl, y, z, hop);
    seg(x, y, z, x, y - sy * bl, z, hop);
    seg(x, y, z, x, y, z - sz * bl, hop);
  }
  const tickHop = 2; // угол (+,−,+)
  seg(F, -R * a, F, F, R * a, F, tickHop);
  for (let t = 0; t < L.frame.ticks; t++) {
    const y = (-R + (2 * R * t) / (L.frame.ticks - 1)) * a;
    seg(F, y, F, F + L.frame.tick * a, y, F, tickHop);
  }
  const h = C.core.size / 2;
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    seg(-h, s * h, t * h, h, s * h, t * h, 0, 1);
    seg(s * h, -h, t * h, s * h, h, t * h, 0, 1);
    seg(s * h, t * h, -h, s * h, t * h, h, 0, 1);
  }
  const frame: FrameSegments = { count: fhop.length, rest: Float32Array.from(fr), hop: Uint8Array.from(fhop), core: Uint8Array.from(fcore) };
  // осевые: из ядра к рамке по ±x/±y/±z (пунктир, отдельный буфер)
  const ax: number[] = [];
  for (const s of [-1, 1]) { ax.push(0, 0, 0, s * F, 0, 0); ax.push(0, 0, 0, 0, s * F, 0); ax.push(0, 0, 0, 0, 0, s * F); }
  const axes: FrameSegments = { count: 6, rest: Float32Array.from(ax), hop: new Uint8Array(6), core: new Uint8Array(6) };

  return {
    N, pitch: a, rest, normal, shell, size, phase, warm,
    hubIndex: Uint16Array.from(hubs),
    edgeA, edgeB, edgeKind, strutCount, hairCount,
    dust: { count: dpos.length / 3, pos: Float32Array.from(dpos), consumedAt: Float32Array.from(dcons), phase: Float32Array.from(dphase) },
    frame, axes,
  };
}
