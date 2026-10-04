// Симуляция «Ядра» — чистая, БЕЗ three/react. Владеет всеми буферами (атрибуты геометрий
// ссылаются прямо на них, без копий). Своё время simTime продвигается только внутри step() →
// пауза вне экрана невидима для роста/пакетов/ударов. Всё — функция (simTime, progress),
// поэтому скраб скролла назад точен.
import { NETWORK as C, type Tier } from "./config";
import type { Lattice } from "./lattice";
import { type Growth, growFactor, expoOut, smoothstep } from "./growth";

/** Луч курсора в ЛОКАЛЬНОМ пространстве spin-группы (o + d·t, d — единичный). */
export type PointerRay = { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number; active: boolean };
/** Удар — сфера из точки c, ЛОКАЛЬНОЕ пространство; speed задан только у удара роста. */
export type Shock = { x: number; y: number; z: number; t: number; speed?: number };
export type RGB = readonly [number, number, number];

// Силы заданы в «импульсах за кадр при 60 fps» (как kick·60): пружина и тяга курсора
// умножаются на FORCE, иначе пружина 3.4 переглушена и узлы доползают до покоя ~8 с
// вместо ~0.9 с. Отношение pull/spring (глубина туннеля у курсора) при этом сохранено.
const FORCE = 60;

const P = C.physics, HT = C.heat, S = C.shock, PK = C.packets, G = C.growth, J = C.journey;
const R0 = C.lattice.R0;
const R = P.influence * R0; // радиус реакции на курсор, локальные единицы
const CLEAR_R = P.clearZone * R; // чистая зона (туннель)

export class LatticeSimulation {
  readonly N: number;
  readonly D: number;
  readonly H: number;

  // буферы без копий — атрибуты геометрий оборачивают их
  readonly positions: Float32Array; // (N+D)*3; блок пыли [N, N+D) пишется один раз
  readonly heat: Float32Array; // N+D (пыль = 0)
  readonly grow: Float32Array; // N+D (пыль = 1)
  readonly shade: Float32Array; // N+D (узлы пишет рендер каждый кадр; пыль = 1)
  readonly meta: Float32Array; // (N+D)*4 статично: size, kind (0 узел / 1 пыль), consumedAt, phase
  readonly strutPos: Float32Array; // strutCount*6
  readonly strutCol: Float32Array;
  readonly hairPos: Float32Array; // hairCount*6
  readonly hairCol: Float32Array;
  readonly hubPos: Float32Array; // H*3
  readonly hubHeat: Float32Array; // H
  readonly hubScale: Float32Array; // H

  // скаляры, читаемые рендером после step()
  simTime = 0;
  tEff = 0;
  front = 0; // tEff / tMax, 0..1
  assembled = false;
  coreScale = 0;
  pulse = 0;
  halo = 0;
  haloIdle: number = C.halo.idle; // рендер ставит idleNoBloom, когда bloom выключен
  packetRunning = false;

  private readonly vel: Float32Array; // N*3
  private readonly l: Lattice;
  private readonly g: Growth;
  private readonly tier: Tier;
  private readonly base: RGB;
  private readonly signal: RGB;
  private readonly tMax: number;
  private packetStart = -1;
  private nextPacket = 0;

  constructor(lattice: Lattice, growth: Growth, colorsLinear: { base: RGB; signal: RGB }, tier: Tier) {
    this.l = lattice;
    this.g = growth;
    this.tier = tier;
    this.base = colorsLinear.base;
    this.signal = colorsLinear.signal;
    this.tMax = growth.tMax;
    const N = (this.N = lattice.N);
    const D = (this.D = lattice.dust.count);
    this.H = lattice.hubIndex.length;

    this.positions = new Float32Array((N + D) * 3);
    this.heat = new Float32Array(N + D);
    this.grow = new Float32Array(N + D);
    this.shade = new Float32Array(N + D).fill(1);
    this.meta = new Float32Array((N + D) * 4);
    this.vel = new Float32Array(N * 3);
    this.strutPos = new Float32Array(lattice.strutCount * 6);
    this.strutCol = new Float32Array(lattice.strutCount * 6);
    this.hairPos = new Float32Array(lattice.hairCount * 6);
    this.hairCol = new Float32Array(lattice.hairCount * 6);
    this.hubPos = new Float32Array(this.H * 3);
    this.hubHeat = new Float32Array(this.H);
    this.hubScale = new Float32Array(this.H);

    for (let i = 0; i < N; i++) {
      this.meta[i * 4] = lattice.size[i];
      this.meta[i * 4 + 1] = 0;
      this.meta[i * 4 + 2] = 0;
      this.meta[i * 4 + 3] = lattice.phase[i];
    }
    const dust = lattice.dust;
    for (let d = 0; d < D; d++) {
      const j = N + d;
      this.positions[j * 3] = dust.pos[d * 3];
      this.positions[j * 3 + 1] = dust.pos[d * 3 + 1];
      this.positions[j * 3 + 2] = dust.pos[d * 3 + 2];
      this.meta[j * 4] = C.lattice.dust.size;
      this.meta[j * 4 + 1] = 1;
      this.meta[j * 4 + 2] = dust.consumedAt[d];
      this.meta[j * 4 + 3] = dust.phase[d];
      this.grow[j] = 1;
    }
  }

  /** Один анимированный шаг. Мутирует все буферы и скаляры. */
  step(dtIn: number, pointer: PointerRay, shocks: Shock[], progress: number): void {
    // 1. своё время
    const dt = Math.min(dtIn, 1 / 30);
    this.simTime += dt;
    const T = this.simTime;
    const fr = Math.pow(P.friction, dt * 60);
    const hd = Math.pow(P.heatDecay, dt * 60);
    const tMax = this.tMax;

    // 2. анти-рост от прогресса скролла: верхушки втягиваются первыми
    const Dg = smoothstep(J.ungrow[0], J.ungrow[1], progress);
    const tEff = Math.min(T, tMax) - Dg * tMax;
    this.tEff = tEff;
    this.front = Math.min(1, Math.max(0, tEff / tMax));
    this.assembled = T >= G.assembledAt;

    // 3. пакеты: ядро раз в period посылает импульс по дереву
    let w = (T - this.packetStart) * PK.speed;
    let running = this.packetStart >= 0 && w <= this.g.maxHop + 3;
    if (!running && T >= PK.first && T >= this.nextPacket) {
      this.packetStart = T;
      this.nextPacket = T + PK.period;
      w = 0;
      running = true;
    }
    this.packetRunning = running;
    const packetSig2 = 2 * PK.sigma * PK.sigma;

    // 4. узлы в порядке BFS (родитель уже обновлён в этом кадре)
    const { positions: pos, heat, grow, vel } = this;
    const { rest, normal, shell, phase, warm } = this.l;
    const { order, parent, birth, hop } = this.g;
    const pa = pointer.active;
    const nSh = shocks.length;
    const TWO_PI = Math.PI * 2;

    for (let oi = 0; oi < this.N; oi++) {
      const i = order[oi];
      const i3 = i * 3;
      const g = growFactor(tEff, birth[i], G.nodeDur);
      grow[i] = g;
      const p = parent[i];
      const ax0 = p >= 0 ? pos[p * 3] : 0;
      const ay0 = p >= 0 ? pos[p * 3 + 1] : 0;
      const az0 = p >= 0 ? pos[p * 3 + 2] : 0;
      if (g <= 0) {
        // ещё не родился — сидит на якоре (родителе/ядре)
        pos[i3] = ax0; pos[i3 + 1] = ay0; pos[i3 + 2] = az0;
        vel[i3] = 0; vel[i3 + 1] = 0; vel[i3 + 2] = 0;
        heat[i] *= hd;
        continue;
      }
      const k = shell[i];
      const sB = 1 + P.breathShells[k] * Math.sin(TWO_PI * P.breathHz * T + 0.6 * k);
      const br = P.breath * Math.sin(0.5 * T + phase[i]);
      const rbx = rest[i3] * sB + normal[i3] * br;
      const rby = rest[i3 + 1] * sB + normal[i3 + 1] * br;
      const rbz = rest[i3 + 2] * sB + normal[i3 + 2] * br;
      const tx = ax0 + (rbx - ax0) * g;
      const ty = ay0 + (rby - ay0) * g;
      const tz = az0 + (rbz - az0) * g;

      let x = pos[i3], y = pos[i3 + 1], z = pos[i3 + 2];
      const spring = P.spring * FORCE;
      let accx = (tx - x) * spring, accy = (ty - y) * spring, accz = (tz - z) * spring;
      let h = 0;

      if (pa) {
        // ближайшая точка луча: тяга по sin-профилю (гаснет у луча и на краю) + чистая зона = туннель
        const rx = x - pointer.ox, ry = y - pointer.oy, rz = z - pointer.oz;
        const t = rx * pointer.dx + ry * pointer.dy + rz * pointer.dz;
        const ddx = pointer.ox + pointer.dx * t - x;
        const ddy = pointer.oy + pointer.dy * t - y;
        const ddz = pointer.oz + pointer.dz * t - z;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz) || 1e-4;
        if (dist < R) {
          const ux = ddx / dist, uy = ddy / dist, uz = ddz / dist;
          const reach = Math.sin((dist / R) * Math.PI) * P.pull * FORCE;
          accx += ux * reach; accy += uy * reach; accz += uz * reach;
          if (dist < CLEAR_R) {
            const rep = (1 - dist / CLEAR_R) * P.pull * 2.2 * FORCE;
            accx -= ux * rep; accy -= uy * rep; accz -= uz * rep;
          }
          h = Math.max(h, (1 - dist / R) * HT.fromPointer);
        }
      }

      for (let s = 0; s < nSh; s++) {
        const sh = shocks[s];
        const radius = sh.t * (sh.speed ?? S.speed);
        const cx = x - sh.x, cy = y - sh.y, cz = z - sh.z;
        const dd = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1e-4;
        const off = Math.abs(dd - radius);
        if (off < S.band) {
          const kk = (1 - off / S.band) * (1 - sh.t / S.life);
          const imp = (kk * P.kick * 60) / dd;
          accx += cx * imp; accy += cy * imp; accz += cz * imp;
          h = Math.max(h, kk);
        }
      }

      const vx = (vel[i3] + accx * dt) * fr;
      const vy = (vel[i3 + 1] + accy * dt) * fr;
      const vz = (vel[i3 + 2] + accz * dt) * fr;
      x += vx * dt; y += vy * dt; z += vz * dt;
      vel[i3] = vx; vel[i3 + 1] = vy; vel[i3 + 2] = vz;
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      h = Math.max(h, Math.min(1, Math.sqrt(vx * vx + vy * vy + vz * vz) * P.velocityHeat));

      // источники жара: тёплые узлы, зелёный фронт роста, пакет
      if (warm[i]) h = Math.max(h, HT.base[0] + (HT.base[1] - HT.base[0]) * (0.5 + 0.5 * Math.sin(HT.baseHz * T + phase[i])));
      const fx = (tEff - birth[i] - HT.front.delay) / HT.front.sigma;
      h = Math.max(h, HT.front.peak * Math.exp(-fx * fx));
      if (running) {
        const dw = w - hop[i];
        h = Math.max(h, PK.bump * Math.exp(-(dw * dw) / packetSig2));
      }
      heat[i] = Math.max(heat[i] * hd, h);
    }

    // 5. удары: время жизни + лимит (старые выбывают)
    for (let s = shocks.length - 1; s >= 0; s--) {
      shocks[s].t += dt;
      if (shocks[s].t > S.life) shocks.splice(s, 1);
    }
    while (shocks.length > S.max) shocks.shift();

    // 6. скаляры ядра/гало
    this.coreScale = expoOut(T / G.coreDur) * (1 - 0.4 * smoothstep(J.coreShrink[0], J.coreShrink[1], progress));
    const CP = C.core.pulse;
    let pulse = CP.min + (CP.max - CP.min) * (0.5 + 0.5 * Math.sin(TWO_PI * CP.hz * T)) + C.core.ignite * Math.exp(-C.core.igniteDecay * T);
    if (running) pulse += PK.corePulse * Math.exp(-3 * (T - this.packetStart));
    this.pulse = pulse;
    let halo = this.haloIdle + C.halo.ignite * Math.exp(-C.halo.igniteDecay * T);
    for (let s = 0; s < shocks.length; s++) halo += S.haloFlare * Math.exp(-C.halo.shockDecay * shocks[s].t);
    if (running) halo += PK.halo * Math.exp(-2 * (T - this.packetStart));
    this.halo = halo * (1 - progress);

    // 7–8. связи и хабы
    this.fillLinks(false);
    this.fillHubs();
  }

  /** reduced-motion: собранная решётка одним выстрелом — ровно та картинка, в которую оседает анимация. */
  stepStatic(): void {
    const { positions: pos, vel, grow, heat } = this;
    const { rest, warm } = this.l;
    for (let i = 0; i < this.N; i++) {
      const i3 = i * 3;
      pos[i3] = rest[i3]; pos[i3 + 1] = rest[i3 + 1]; pos[i3 + 2] = rest[i3 + 2];
      vel[i3] = 0; vel[i3 + 1] = 0; vel[i3 + 2] = 0;
      grow[i] = 1;
      heat[i] = warm[i] ? 0.45 : 0;
    }
    this.tEff = this.tMax;
    this.front = 1;
    this.assembled = true;
    this.coreScale = 1;
    this.pulse = C.core.pulse.min;
    this.halo = this.haloIdle;
    this.packetRunning = false;
    this.fillLinks(true);
    this.fillHubs();
  }

  /** O(E): позиции и цвета концов рёбер. Корень = (0,0,0), grow 1, heat = pulse, shade 1. */
  private fillLinks(full: boolean): void {
    const { positions: pos, heat, grow, shade, base, signal } = this;
    const { edgeA, edgeB, edgeKind, strutCount } = this.l;
    const tree = this.g.treeEdge;
    const E = edgeA.length;
    const tierMul = this.tier === "mobile" ? C.mobile.intensity : 1;
    const hot = C.line.hotMix;
    for (let e = 0; e < E; e++) {
      const a = edgeA[e], b = edgeB[e];
      const strut = e < strutCount;
      const out = strut ? this.strutPos : this.hairPos;
      const col = strut ? this.strutCol : this.hairCol;
      const o = (strut ? e : e - strutCount) * 6;
      const kI = edgeKind[e] === 1 ? C.line.strut.intensity : C.line.hair.intensity;
      const ga = grow[a], ha = heat[a], sa = shade[a];
      let gb: number, hb: number, sb: number, bx: number, by: number, bz: number;
      if (b >= 0) { gb = grow[b]; hb = heat[b]; sb = shade[b]; bx = pos[b * 3]; by = pos[b * 3 + 1]; bz = pos[b * 3 + 2]; }
      else { gb = 1; hb = this.pulse; sb = 1; bx = 0; by = 0; bz = 0; }
      const gmin = Math.min(ga, gb);
      // до рождения ребро дерева нулевой длины → f = 0 → без «шапочек»
      const f = full ? 1 : tree[e] ? smoothstep(0, 0.15, gmin) : gmin * gmin;
      out[o] = pos[a * 3]; out[o + 1] = pos[a * 3 + 1]; out[o + 2] = pos[a * 3 + 2];
      out[o + 3] = bx; out[o + 4] = by; out[o + 5] = bz;
      const Ia = kI * f * sa * tierMul, Ga = ha * hot * f * sa * tierMul;
      col[o] = base[0] * Ia + signal[0] * Ga;
      col[o + 1] = base[1] * Ia + signal[1] * Ga;
      col[o + 2] = base[2] * Ia + signal[2] * Ga;
      const Ib = kI * f * sb * tierMul, Gb = hb * hot * f * sb * tierMul;
      col[o + 3] = base[0] * Ib + signal[0] * Gb;
      col[o + 4] = base[1] * Ib + signal[1] * Gb;
      col[o + 5] = base[2] * Ib + signal[2] * Gb;
    }
  }

  /** Хабы уважают тень под текстом (shade) и ярус: на мобайле жар бусин × mobile.intensity, как узлы и связи. */
  private fillHubs(): void {
    const { positions: pos, heat, grow, shade } = this;
    const { hubIndex } = this.l;
    const rad = C.lattice.hubs.radius;
    const tierMul = this.tier === "mobile" ? C.mobile.intensity : 1;
    for (let k = 0; k < this.H; k++) {
      const i = hubIndex[k];
      const sh = shade[i];
      this.hubPos[k * 3] = pos[i * 3];
      this.hubPos[k * 3 + 1] = pos[i * 3 + 1];
      this.hubPos[k * 3 + 2] = pos[i * 3 + 2];
      this.hubHeat[k] = heat[i] * sh * tierMul;
      this.hubScale[k] = rad * grow[i] * (1 + 0.5 * heat[i]) * sh;
    }
  }
}
