// Генератор «чертежей» кейсов: чистый, детерминированный (seed), без React/three.
// Один и тот же чертёж — обложка карточки (SVG в DOM), плашка на странице и OG-картинка.
import { mulberry32 } from "@/lib/prng";
import { fbm3 } from "@/lib/noise";
import type { Preset } from "@/lib/cases";

export type Role = "base" | "dim" | "dash" | "fill" | "dust" | "lit";
export type BpPath = { d: string; role: Role };
export type BpNode = { x: number; y: number; lit?: boolean };
export type View = "cover" | "detail-a" | "detail-b";
export type Blueprint = { w: 640; h: 400; paths: BpPath[]; nodes: BpNode[]; focus: { x: number; y: number } };

/** hex-зеркала tokens.css (как NETWORK.colors) — только для OG-сериализации. */
export const PALETTE = { ink: "#14171A", inkDeep: "#0F1215", base: "#DAD6CC", bone: "#F2F0E9", signal: "#00E08A" } as const;

const f = (n: number) => n.toFixed(1);
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;

// ---------- globe: «глобус поставок» ----------
function globe(seed: number, alt: boolean): Blueprint {
  const rng = mulberry32(seed);
  const cx = 320, cy = 200, R = 150;
  const tilt = ((alt ? -23.4 : 23.4) * Math.PI) / 180;
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const p3 = (lat: number, lon: number) => {
    const x = Math.cos(lat) * Math.sin(lon), y0 = Math.sin(lat), z0 = Math.cos(lat) * Math.cos(lon);
    return { x, y: y0 * ct - z0 * st, z: y0 * st + z0 * ct };
  };
  const scr = (p: { x: number; y: number }) => ({ x: cx + R * p.x, y: cy - R * p.y });
  const paths: BpPath[] = [];
  const runs = (pts: { x: number; y: number; z: number }[], frontRole: Role) => {
    let front = "", back = "", pf = false, pb = false;
    for (const p of pts) {
      const s = scr(p);
      if (p.z >= 0) { front += (pf ? " L " : "M ") + pt(s.x, s.y); pf = true; pb = false; }
      else { back += (pb ? " L " : "M ") + pt(s.x, s.y); pb = true; pf = false; }
    }
    if (front) paths.push({ d: front, role: frontRole });
    if (back) paths.push({ d: back, role: "dim" });
  };
  for (let m = 0; m < 4; m++) {
    const lon = (m * Math.PI) / 4;
    const pts = []; for (let i = 0; i <= 48; i++) { const a = -Math.PI / 2 + (i / 48) * Math.PI; pts.push(p3(a, lon)); }
    runs(pts, "base");
    const pts2 = []; for (let i = 0; i <= 48; i++) { const a = -Math.PI / 2 + (i / 48) * Math.PI; pts2.push(p3(a, lon + Math.PI)); }
    runs(pts2, "base");
  }
  for (const deg of [-60, -30, 0, 30, 60]) {
    const lat = (deg * Math.PI) / 180;
    const pts = []; for (let i = 0; i <= 48; i++) pts.push(p3(lat, (i / 48) * Math.PI * 2));
    runs(pts, deg === 0 ? "dash" : "base");
  }
  // «суша»: точки Фибоначчи по порогу шума (только лицевая сторона)
  let dust = "";
  for (let j = 0; j < 220; j++) {
    const y = 1 - (2 * (j + 0.5)) / 220, r = Math.sqrt(1 - y * y), ph = j * 2.399963;
    const d = { x: r * Math.cos(ph), y, z: r * Math.sin(ph) };
    if (fbm3(d.x * 1.1, d.y * 1.1, d.z * 1.1) <= 0.08) continue;
    const q = { x: d.x, y: d.y * ct - d.z * st, z: d.y * st + d.z * ct };
    if (q.z < 0.05) continue;
    const s = scr(q); dust += `M ${pt(s.x, s.y)} l 0.01 0 `;
  }
  if (dust) paths.push({ d: dust.trim(), role: "dust" });
  // порты (лицевая сторона) и дуги
  const nPorts = alt ? 12 : 10, nArcs = alt ? 8 : 6;
  const ports: { x: number; y: number; z: number }[] = [];
  while (ports.length < nPorts) {
    const lat = ((-45 + 105 * rng()) * Math.PI) / 180, lon = rng() * Math.PI * 2;
    const p = p3(lat, lon); if (p.z > 0.15) ports.push(p);
  }
  const nodes: BpNode[] = ports.map((p, i) => ({ ...scr(p), lit: i === 0 }));
  const used = new Set<string>();
  let made = 0, guard = 0;
  while (made < nArcs && guard++ < 100) {
    const a = made === 0 ? 0 : Math.floor(rng() * nPorts), b = Math.floor(rng() * nPorts);
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b || used.has(key)) continue;
    used.add(key);
    const A = nodes[a], B = nodes[b];
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const dx = mx - cx, dy = my - cy, len = Math.hypot(dx, dy) || 1;
    const c = { x: mx + (dx / len) * 0.18 * R * 2, y: my + (dy / len) * 0.18 * R * 2 };
    paths.push({ d: `M ${pt(A.x, A.y)} Q ${pt(c.x, c.y)} ${pt(B.x, B.y)}`, role: made === 0 ? "lit" : "base" });
    made++;
  }
  return { w: 640, h: 400, paths, nodes, focus: { x: nodes[0].x, y: nodes[0].y } };
}

// ---------- lattice: «решётка смен» ----------
function lattice(seed: number, alt: boolean): Blueprint {
  const rng = mulberry32(seed);
  const ox = 92, oy = 110, cw = 64, ch = 40, skew = 22, cols = 7, rows = 3;
  const cell = (c: number, r: number, k = 0) => ({ x: ox + c * cw + r * skew - 7 * k * (alt ? 2.6 : 1), y: oy + r * ch - 7 * k * (alt ? 2.6 : 1) });
  const rect = (c: number, r: number, k: number, inset = 0) => {
    const p = cell(c, r, k);
    return `M ${pt(p.x + inset, p.y + inset)} l ${f(cw - 2 * inset)} 0 l ${f(skew * 0)} ${f(ch - 2 * inset)} l ${f(-(cw - 2 * inset))} 0 Z`;
  };
  const paths: BpPath[] = [];
  for (let k = 2; k >= 0; k--) {
    let d = ""; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) d += rect(c, r, k) + " ";
    paths.push({ d: d.trim(), role: k === 0 ? "base" : "dim" });
  }
  const nAssign = alt ? 15 : 12;
  const picked = new Set<number>();
  while (picked.size < nAssign) picked.add(Math.floor(rng() * cols * rows));
  let fill = ""; const nodes: BpNode[] = [];
  for (const i of picked) {
    const c = i % cols, r = Math.floor(i / cols);
    fill += rect(c, r, 0, 3) + " ";
    const p = cell(c, r); nodes.push({ x: p.x + cw / 2, y: p.y + ch / 2 });
  }
  paths.push({ d: fill.trim(), role: "fill" });
  for (let n = 0; n < 4; n++) {
    const len = 3 + Math.floor(rng() * 3), c0 = Math.floor(rng() * (cols - len + 1));
    let r = Math.floor(rng() * rows), d = "";
    for (let i = 0; i < len; i++) {
      const p = cell(c0 + i, r); const x = p.x + cw / 2, y = p.y + ch / 2;
      d += (i ? " L " : "M ") + pt(x, y);
      if (i === 0 && n === 0) nodes.unshift({ x, y, lit: true });
      r = Math.max(0, Math.min(rows - 1, r + (rng() < 0.5 ? -1 : 1) * (rng() < 0.6 ? 1 : 0)));
    }
    paths.push({ d, role: n === 0 ? "lit" : "base" });
  }
  const now = cell(4, 0).x;
  paths.push({ d: `M ${pt(now, 96)} L ${pt(now + 2 * skew, 312)}`, role: "dash" });
  return { w: 640, h: 400, paths, nodes, focus: { x: nodes[0].x, y: nodes[0].y } };
}

// ---------- ribbon: «лента курса» ----------
function ribbon(seed: number, alt: boolean): Blueprint {
  const n = alt ? 180 : 240, x0 = 72, x1 = 600, base = 250;
  const walk = (s: number, scale: number) => {
    const rng = mulberry32(s); let v = 0; const out: number[] = [];
    for (let i = 0; i < n; i++) { v += -0.08 * v + (rng() - 0.5) * 0.9 * 3; out.push(v * scale); }
    return out;
  };
  const line = (vals: number[], dx = 0, dy = 0) =>
    vals.map((v, i) => (i ? "L " : "M ") + pt(x0 + ((x1 - x0) * i) / (n - 1) + dx, base - v + dy)).join(" ");
  const paths: BpPath[] = [];
  for (let k = (alt ? 3 : 5); k >= 1; k--) paths.push({ d: line(walk(seed + k * 17, 0.7), -12 * k, 16 * k), role: "dim" });
  const main = walk(seed, 1);
  const rng = mulberry32(seed ^ 0x51);
  let h = 10; const up: string[] = [], dn: string[] = [];
  for (let i = 0; i < n; i++) {
    h += ((6 + 8 * rng()) - h) * 0.1;
    const x = x0 + ((x1 - x0) * i) / (n - 1);
    up.push(pt(x, base - main[i] - h)); dn.unshift(pt(x, base - main[i] + h));
  }
  paths.push({ d: `M ${up.join(" L ")} L ${dn.join(" L ")} Z`, role: "fill" });
  paths.push({ d: line(main), role: "base" });
  const th = alt ? 40 : 54;
  paths.push({ d: `M ${pt(x0, base - th)} L ${pt(x1, base - th)} M ${pt(x0, base + th)} L ${pt(x1, base + th)}`, role: "dash" });
  let ticks = ""; for (let t = 0; t < 6; t++) ticks += `M ${pt(64, 140 + t * 44)} l 8 0 `;
  paths.push({ d: ticks.trim(), role: "dim" });
  const tail = main.slice(-60);
  paths.push({ d: tail.map((v, i) => (i ? "L " : "M ") + pt(x0 + ((x1 - x0) * (n - 60 + i)) / (n - 1), base - v)).join(" "), role: "lit" });
  const last = { x: x1, y: base - main[n - 1] };
  return { w: 640, h: 400, paths, nodes: [{ ...last, lit: true }], focus: last };
}

export function blueprint(preset: Preset, seed: number, view: View = "cover"): Blueprint {
  const alt = view === "detail-b";
  const s = alt ? (seed ^ 0x9e3779b9) >>> 0 : seed;
  return preset === "globe" ? globe(s, alt) : preset === "lattice" ? lattice(s, alt) : ribbon(s, alt);
}

/** Строка SVG для OG (явные цвета из PALETTE, все lit-линии дорисованы, без <text>). */
export function blueprintSvg(bp: Blueprint): string {
  const style: Record<Role, string> = {
    base: `fill="none" stroke="${PALETTE.base}" stroke-opacity="0.28" stroke-width="1"`,
    dim: `fill="none" stroke="${PALETTE.base}" stroke-opacity="0.16" stroke-width="1"`,
    dash: `fill="none" stroke="${PALETTE.base}" stroke-opacity="0.28" stroke-width="1" stroke-dasharray="3 5"`,
    fill: `fill="${PALETTE.bone}" fill-opacity="0.06" stroke="none"`,
    dust: `fill="none" stroke="${PALETTE.base}" stroke-opacity="0.28" stroke-width="2" stroke-linecap="round"`,
    lit: `fill="none" stroke="${PALETTE.signal}" stroke-width="1.25"`,
  };
  const paths = bp.paths.map((p) => `<path d="${p.d}" ${style[p.role]}/>`).join("");
  const nodes = bp.nodes.map((n) => `<rect x="${f(n.x - 2)}" y="${f(n.y - 2)}" width="4" height="4" fill="${n.lit ? PALETTE.signal : PALETTE.bone}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice"><rect width="640" height="400" fill="${PALETTE.inkDeep}"/>${paths}${nodes}</svg>`;
}
