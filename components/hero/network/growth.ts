// Порядок сборки — чистая логика, БЕЗ three/react. BFS от корня (ядра) даёт hop/parent/order:
// hop = число отрезков сетки от сида, т.е. кольцо 1 → углы/центры колец 2–3 по спицам → грани от
// рёбер внутрь; время рождения = старт + hop·шаг + малый джиттер (когорты одного хопа идут в ногу). Easing-хелперы — тот же кубик, что CustomEase
// settle/scene в lib/gsap (паритет без gsap в 3D-чанке).
import { NETWORK as C, GROWTH_SPAN } from "./config";
import type { Lattice } from "./lattice";

export interface Growth {
  hop: Uint8Array; // N — расстояние от корня в рёбрах (дети корня = 1)
  parent: Int16Array; // N — родитель в BFS-дереве; −1 = ROOT
  order: Uint16Array; // N — порядок BFS (родители раньше детей)
  birth: Float32Array; // N — момент рождения, с
  treeEdge: Uint8Array; // E — ребро принадлежит дереву роста
  maxHop: number;
  tMax: number;
}

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** == CustomEase «settle» (--ease-out-expo) */
export const expoOut = (u: number) => (u >= 1 ? 1 : u <= 0 ? 0 : 1 - Math.pow(2, -10 * u));
/** == CustomEase «scene» (--ease-in-out-quint) */
export const quintInOut = (p: number) => (p < 0.5 ? 16 * p ** 5 : 1 - Math.pow(-2 * p + 2, 5) / 2);
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const growFactor = (T: number, birth: number, nodeDur: number) => expoOut((T - birth) / nodeDur);

export function buildGrowth(l: Lattice, rng: () => number): Growth {
  const { N } = l;
  const E = l.edgeA.length;
  const adj: number[][] = Array.from({ length: N }, () => []);
  const rootKids: number[] = [];
  for (let e = 0; e < E; e++) {
    const a = l.edgeA[e], b = l.edgeB[e];
    if (b < 0) rootKids.push(a);
    else { adj[a].push(b); adj[b].push(a); }
  }
  for (const list of adj) list.sort((x, y) => x - y); // соседи по возрастанию индекса
  rootKids.sort((x, y) => x - y);

  const hop = new Uint8Array(N), parent = new Int16Array(N).fill(-1), order = new Uint16Array(N), visited = new Uint8Array(N);
  let head = 0, tail = 0;
  for (const i of rootKids) if (!visited[i]) { visited[i] = 1; hop[i] = 1; order[tail++] = i; }
  while (head < tail) {
    const u = order[head++];
    for (const v of adj[u]) if (!visited[v]) { visited[v] = 1; hop[v] = hop[u] + 1; parent[v] = u; order[tail++] = v; }
  }
  // страховка: решётка связна по построению, но недостижимое — как ребёнок корня
  for (let i = 0; i < N; i++) if (!visited[i]) { visited[i] = 1; hop[i] = 1; parent[i] = -1; order[tail++] = i; }

  let maxHop = 1;
  for (let i = 0; i < N; i++) if (hop[i] > maxHop) maxHop = hop[i];
  const hopDelay = GROWTH_SPAN / maxHop;
  const birth = new Float32Array(N);
  for (let i = 0; i < N; i++) birth[i] = C.growth.start + hop[i] * hopDelay + rng() * C.growth.jitter;

  const treeEdge = new Uint8Array(E);
  for (let e = 0; e < E; e++) {
    const a = l.edgeA[e], b = l.edgeB[e];
    treeEdge[e] = parent[a] === b || (b >= 0 && parent[b] === a) ? 1 : 0;
  }
  return { hop, parent, order, birth, treeEdge, maxHop, tMax: C.growth.total };
}
