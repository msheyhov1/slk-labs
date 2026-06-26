// Чистая физика живой сети — БЕЗ three и react (тестируемо, изолированно).
// Владеет типизированными массивами; компонент оборачивает их в BufferAttribute.
//
// Модель: каждый узел пружиной держится у «дома» (rest) и дышит; курсор мягко
// тянет (sin-профиль — тяга гаснет у самого курсора → не слипаются) и держит
// «чистую зону» (отталкивание вплотную); касание бросает ударную волну.
import { NETWORK as C } from "./config";

export type Pointer = { x: number; y: number; active: boolean };
export type Shock = { x: number; y: number; t: number };

const BASE = C.colors.base.rgb;
const SIGNAL = C.colors.signal.rgb;

export class NetworkSimulation {
  readonly N: number;
  readonly maxSeg: number;
  segCount = 0;

  // публичные буферы (геометрия ссылается прямо на них)
  readonly positions: Float32Array; // N * 3 (xyz)
  readonly heat: Float32Array; // N
  readonly sizes: Float32Array; // N
  readonly segPositions: Float32Array; // maxSeg * 2 * 3
  readonly segColors: Float32Array; // maxSeg * 2 * 3

  private readonly rest: Float32Array; // N * 2 — точки покоя
  private readonly vel: Float32Array; // N * 2
  private readonly baseHeat: Uint8Array; // N — «горячие» узлы
  private readonly phase: Float32Array; // N
  private vw = 0;
  private vh = 0;

  constructor(width: number, height: number) {
    const mobile = width < C.mobileBreakpoint;
    const divisor = mobile ? C.density.divisorMobile : C.density.divisorDesktop;
    const cap = mobile ? C.density.maxMobile : C.density.max;
    this.N = Math.max(C.density.min, Math.min(cap, Math.round((width * height) / divisor)));
    this.maxSeg = this.N * 10;

    this.positions = new Float32Array(this.N * 3);
    this.heat = new Float32Array(this.N);
    this.sizes = new Float32Array(this.N);
    this.rest = new Float32Array(this.N * 2);
    this.vel = new Float32Array(this.N * 2);
    this.baseHeat = new Uint8Array(this.N);
    this.phase = new Float32Array(this.N);
    this.segPositions = new Float32Array(this.maxSeg * 6);
    this.segColors = new Float32Array(this.maxSeg * 6);

    this.setBounds(width, height);
    const hw = width / 2;
    const hh = height / 2;
    for (let i = 0; i < this.N; i++) {
      const x = (Math.random() * 2 - 1) * hw;
      const y = (Math.random() * 2 - 1) * hh;
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = (Math.random() * 2 - 1) * 0.8;
      this.rest[i * 2] = x;
      this.rest[i * 2 + 1] = y;
      this.baseHeat[i] = Math.random() < C.baseHeatChance ? 1 : 0;
      this.sizes[i] = this.baseHeat[i] ? 3.6 : 2.3;
      this.phase[i] = Math.random() * Math.PI * 2;
    }
  }

  setBounds(width: number, height: number) {
    this.vw = width;
    this.vh = height;
  }

  /** Один шаг симуляции. Мутирует positions/heat/seg*; обновляет segCount. */
  step(time: number, dt: number, pointer: Pointer, shocks: Shock[], reduced: boolean) {
    const { positions: pos, heat, rest, vel, segPositions: segPos, segColors: segCol, N } = this;
    const minDim = Math.min(this.vw, this.vh);
    const maxDist = minDim * C.linkDist;
    const R = minDim * C.influence;

    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const iv = i * 2;
      let x = pos[ix];
      let y = pos[ix + 1];

      const bx = rest[iv] + (reduced ? 0 : Math.sin(time * 0.5 + this.phase[i]) * C.breath);
      const by = rest[iv + 1] + (reduced ? 0 : Math.cos(time * 0.42 + this.phase[i] * 1.3) * C.breath);

      let h = this.baseHeat[i]
        ? reduced
          ? 0.6
          : 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(time * 1.4 + this.phase[i]))
        : 0;

      if (!reduced) {
        let ax = (bx - x) * C.spring;
        let ay = (by - y) * C.spring;

        if (pointer.active) {
          const dx = pointer.x - x;
          const dy = pointer.y - y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < R) {
            const ux = dx / d;
            const uy = dy / d;
            const reach = Math.sin((d / R) * Math.PI) * C.pull; // гаснет у курсора
            ax += ux * reach;
            ay += uy * reach;
            const clearR = R * C.clearZone;
            if (d < clearR) {
              const rep = (1 - d / clearR) * C.pull * 2.2; // чистая зона
              ax -= ux * rep;
              ay -= uy * rep;
            }
            h = Math.max(h, (1 - d / R) * C.heatFromPointer);
          }
        }

        for (let s = 0; s < shocks.length; s++) {
          const sh = shocks[s];
          const radius = sh.t * minDim * 1.05;
          const band = R * 0.55;
          const dx = x - sh.x;
          const dy = y - sh.y;
          const d = Math.hypot(dx, dy) || 1;
          if (Math.abs(d - radius) < band) {
            const k = (1 - Math.abs(d - radius) / band) * (1 - sh.t / 1.4);
            ax += (dx / d) * k * C.kick * 60;
            ay += (dy / d) * k * C.kick * 60;
            h = Math.max(h, k);
          }
        }

        let vx = vel[iv] + ax * dt;
        let vy = vel[iv + 1] + ay * dt;
        vx *= C.friction;
        vy *= C.friction;
        x += vx * dt;
        y += vy * dt;
        vel[iv] = vx;
        vel[iv + 1] = vy;
        pos[ix] = x;
        pos[ix + 1] = y;

        h = Math.max(h, Math.min(1, Math.hypot(vx, vy) * 0.12));
      }

      heat[i] = reduced ? h : Math.max(heat[i] * 0.9, h);
    }

    if (!reduced) {
      for (let s = shocks.length - 1; s >= 0; s--) {
        shocks[s].t += dt;
        if (shocks[s].t > 1.4) shocks.splice(s, 1);
      }
    }

    // связи между узлами + зелёные лучи к курсору
    let seg = 0;
    const baseI = C.line.baseIntensity;
    for (let i = 0; i < N && seg < this.maxSeg; i++) {
      for (let j = i + 1; j < N && seg < this.maxSeg; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const d = Math.hypot(dx, dy);
        if (d < maxDist) {
          const al = 1 - d / maxDist;
          const hot = Math.max(heat[i], heat[j]);
          const o = seg * 6;
          segPos[o] = pos[i * 3]; segPos[o + 1] = pos[i * 3 + 1]; segPos[o + 2] = pos[i * 3 + 2];
          segPos[o + 3] = pos[j * 3]; segPos[o + 4] = pos[j * 3 + 1]; segPos[o + 5] = pos[j * 3 + 2];
          const bi = baseI * al;
          const grn = hot * al * C.line.hotMix;
          const cr = BASE[0] * bi + SIGNAL[0] * grn;
          const cg = BASE[1] * bi + SIGNAL[1] * grn;
          const cb = BASE[2] * bi + SIGNAL[2] * grn;
          segCol[o] = cr; segCol[o + 1] = cg; segCol[o + 2] = cb;
          segCol[o + 3] = cr; segCol[o + 4] = cg; segCol[o + 5] = cb;
          seg++;
        }
      }
    }
    if (!reduced && pointer.active) {
      const px = pointer.x;
      const py = pointer.y;
      for (let i = 0; i < N && seg < this.maxSeg; i++) {
        const d = Math.hypot(pos[i * 3] - px, pos[i * 3 + 1] - py);
        if (d < R) {
          const al = (1 - d / R) * C.pointerRayOpacity;
          const o = seg * 6;
          segPos[o] = pos[i * 3]; segPos[o + 1] = pos[i * 3 + 1]; segPos[o + 2] = pos[i * 3 + 2];
          segPos[o + 3] = px; segPos[o + 4] = py; segPos[o + 5] = 0;
          const cr = SIGNAL[0] * al, cg = SIGNAL[1] * al, cb = SIGNAL[2] * al;
          segCol[o] = cr; segCol[o + 1] = cg; segCol[o + 2] = cb;
          segCol[o + 3] = cr; segCol[o + 4] = cg; segCol[o + 5] = cb;
          seg++;
        }
      }
    }
    this.segCount = seg;
  }
}
