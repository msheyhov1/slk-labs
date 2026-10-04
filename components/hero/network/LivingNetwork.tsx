"use client";

// Рендер «Блока» — единственный файл (кроме post.ts), трогающий three-объекты.
// Canvas + Scene: геометрии оборачивают буферы симуляции без копий; useFrame гонит риг
// (камера/туман/орбита/параллакс) → тень под текстом → луч курсора → sim.step → flush.
// Канвас pointer-events:none — курсор и клики слушаем на window, луч считаем сами.
import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { PerformanceMonitor } from "@react-three/drei/core/PerformanceMonitor";
import { NETWORK as C, type Tier } from "./config";
import { buildLattice, mulberry32 } from "./lattice";
import { buildGrowth, clamp, expoOut, quintInOut, smoothstep } from "./growth";
import { LatticeSimulation, type PointerRay, type Shock } from "./simulation";
import {
  NODE_VERT, NODE_FRAG, CORE_VERT, CORE_FRAG, HALO_VERT, HALO_FRAG,
  HUB_VERT_DECL, HUB_VERT_BODY, HUB_FRAG_DECL, HUB_FRAG_BODY,
} from "./shaders";
import { journey } from "./journey";
import PostFX from "./PostFX";

// r3f императивно мутирует геометрию и буферы симуляции в useFrame — это WebGL-рендер-цикл,
// а не React-стейт. Правило React Compiler здесь неприменимо.
/* eslint-disable react-hooks/immutability */

type Quality = 0 | 1 | 2;
type Rect = { x0: number; x1: number; y0: number; y1: number }; // NDC
type Lines = { geo: LineSegmentsGeometry; mat: LineMaterial; obj: LineSegments2; dist: THREE.InstancedInterleavedBuffer | null }; // dist — только у пунктира
type Built = ReturnType<typeof build>;
type State = {
  ptr: { nx: number; ny: number; inside: boolean };
  par: { yaw: number; pitch: number };
  rects: Rect[];
  shocks: Shock[];
  pointer: PointerRay;
  growthFired: boolean;
  firstFrame: boolean;
  armed: boolean;
  place: { ox: number; oy: number }; // смещение ядра в покое (мировые единицы) — дрейф к центру по journey
};
type Tmp = {
  m: THREE.Matrix4; inv: THREE.Matrix4; hm: THREE.Matrix4; ray: THREE.Raycaster; v2: THREE.Vector2;
  o: THREE.Vector3; d: THREE.Vector3; c: THREE.Vector3; q: THREE.Quaternion;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// высота вьюпорта в мировых единицах на плоскости z=0 при camZ (≈ 7.85)
const VH_WORLD = 2 * C.frame.camZ * Math.tan(THREE.MathUtils.degToRad(C.frame.fov / 2));

const hasBloom = (tier: Tier, q: Quality) => tier === "desktop" && q >= 2;
function lineWidth(kind: "strut" | "hair", tier: Tier, q: Quality) {
  const w = C.line[kind];
  if (q === 0) return w.widthLow;
  return tier === "mobile" ? w.widthMobile : w.width;
}

/** Решётка → симуляция → three-объекты. Один раз на монтирование Scene. */
function build(tier: Tier) {
  const lattice = buildLattice(tier);
  const growth = buildGrowth(lattice, mulberry32(C.seed ^ 0x9e3779b9));
  // hex → linear один раз (THREE.Color делает sRGB→linear сам)
  const base = new THREE.Color(C.colors.base);
  const signal = new THREE.Color(C.colors.signal);
  const bone = new THREE.Color(C.colors.bone);
  const inkDeep = new THREE.Color(C.colors.inkDeep);
  const sim = new LatticeSimulation(lattice, growth, { base: [base.r, base.g, base.b], signal: [signal.r, signal.g, signal.b] }, tier);
  const bounds = () => new THREE.Sphere(new THREE.Vector3(), C.lattice.R0 * 2);
  const dyn = (arr: Float32Array, n: number) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);

  // узлы + пыль — один Points-draw
  const pointsGeo = new THREE.BufferGeometry();
  const pointAttrs = { pos: dyn(sim.positions, 3), heat: dyn(sim.heat, 1), grow: dyn(sim.grow, 1), shade: dyn(sim.shade, 1) };
  pointsGeo.setAttribute("position", pointAttrs.pos);
  pointsGeo.setAttribute("aHeat", pointAttrs.heat);
  pointsGeo.setAttribute("aGrow", pointAttrs.grow);
  pointsGeo.setAttribute("aShade", pointAttrs.shade);
  pointsGeo.setAttribute("aMeta", new THREE.BufferAttribute(sim.meta, 4));
  pointsGeo.boundingSphere = bounds();
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: {
      uDpr: { value: 1 }, uRefZ: { value: C.frame.camZ }, uCenterZ: { value: C.frame.camZ },
      uDepthRange: { value: C.lattice.R0 }, uFadeMin: { value: C.depthFade }, uMaxSize: { value: C.node.maxSize },
      uTime: { value: 0 }, uFront: { value: 0 }, uHeatSize: { value: C.node.heatSize }, uDustSize: { value: C.lattice.dust.size },
      uBase: { value: base }, uSignal: { value: signal }, uGlowGain: { value: C.node.glowGain }, uIntensity: { value: 1 },
      uDustAlpha: { value: 0 }, uBaseMul: { value: C.node.baseMul }, uSquare: { value: C.node.square },
      uAlpha: { value: new THREE.Vector2(C.node.alpha[0], C.node.alpha[1]) },
    },
    vertexShader: NODE_VERT, fragmentShader: NODE_FRAG,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pointsGeo, nodeMat);
  points.frustumCulled = false;
  points.renderOrder = 2;

  // связи (LineSegments2): струты и волоски — два непрерывных диапазона буферов симуляции;
  // рамка и осевые — статичные цвета, позиции пишет симуляция (дорисовка/ретракт)
  const makeLines = (pos: Float32Array, col: Float32Array, count: number, dashed = false): Lines => {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(pos); // держит Float32Array по ссылке
    geo.setColors(col);
    (geo.attributes.instanceStart as THREE.InterleavedBufferAttribute).data.setUsage(THREE.DynamicDrawUsage);
    (geo.attributes.instanceColorStart as THREE.InterleavedBufferAttribute).data.setUsage(THREE.DynamicDrawUsage);
    geo.instanceCount = count;
    geo.boundingSphere = bounds();
    const mat = new LineMaterial({
      color: 0xffffff, vertexColors: true, linewidth: 1, worldUnits: false, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: true, alphaToCoverage: false,
      dashed, dashSize: C.lattice.axes.dash, gapSize: C.lattice.axes.gap,
    });
    // пунктир: дистанции (0 → длина отрезка) пишем сами во flush — computeLineDistances() пересоздаёт буфер
    let dist: THREE.InstancedInterleavedBuffer | null = null;
    if (dashed) {
      dist = new THREE.InstancedInterleavedBuffer(new Float32Array(count * 2), 2, 1).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("instanceDistanceStart", new THREE.InterleavedBufferAttribute(dist, 1, 0));
      geo.setAttribute("instanceDistanceEnd", new THREE.InterleavedBufferAttribute(dist, 1, 1));
    }
    const obj = new LineSegments2(geo, mat);
    obj.frustumCulled = false;
    obj.renderOrder = 1;
    return { geo, mat, obj, dist };
  };
  const struts = makeLines(sim.strutPos, sim.strutCol, lattice.strutCount);
  const hairs = makeLines(sim.hairPos, sim.hairCol, lattice.hairCount);
  const tierMul = tier === "mobile" ? C.mobile.intensity : 1;
  const flatCol = (count: number, I: number) => {
    const c = new Float32Array(count * 6);
    for (let i = 0; i < c.length; i += 3) { c[i] = base.r * I; c[i + 1] = base.g * I; c[i + 2] = base.b * I; }
    return c;
  };
  const frame = makeLines(sim.framePos, flatCol(lattice.frame.count, C.lattice.frame.intensity * tierMul), lattice.frame.count);
  const axes = makeLines(sim.axesPos, flatCol(lattice.axes.count, C.lattice.axes.intensity * tierMul), lattice.axes.count, true);
  if (process.env.NODE_ENV !== "production")
    console.debug(`[network] ${tier}: N=${sim.N} E=${lattice.edgeA.length} (struts ${lattice.strutCount}, hairs ${lattice.hairCount}) H=${sim.H} dust=${sim.D} frame=${lattice.frame.count}`);

  // хабы — кубики-бусины на углах и центрах граней; зелёный только как emissive от жара (инъекция в стандартный материал)
  const hubGeo = new THREE.BoxGeometry(1, 1, 1);
  const hubHeatAttr = new THREE.InstancedBufferAttribute(sim.hubHeat, 1).setUsage(THREE.DynamicDrawUsage);
  hubGeo.setAttribute("aHeat", hubHeatAttr);
  const hubMat = new THREE.MeshStandardMaterial({
    color: bone.clone().multiplyScalar(C.lights.hubColorMul), roughness: C.lights.hubRoughness,
    metalness: C.lights.hubMetalness, flatShading: true, emissive: 0x000000,
  });
  hubMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSignal = { value: signal };
    shader.uniforms.uHubEmissive = { value: C.lights.hubEmissive };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${HUB_VERT_DECL}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${HUB_VERT_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${HUB_FRAG_DECL}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${HUB_FRAG_BODY}`);
  };
  hubMat.customProgramCacheKey = () => "slk-hub";
  const hubs = new THREE.InstancedMesh(hubGeo, hubMat, Math.max(1, sim.H));
  hubs.count = sim.H;
  hubs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hubs.frustumCulled = false;
  hubs.renderOrder = 0;

  // ядро — куб-сид, выровнен по сетке; его рёбра рисует рамка (frame.core)
  const coreGeo = new THREE.BoxGeometry(C.core.size, C.core.size, C.core.size);
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uBody: { value: inkDeep }, uBase: { value: base }, uSignal: { value: signal },
      uRimPow: { value: C.core.rimPow }, uRimGain: { value: C.core.rimGain }, uPulse: { value: 0 }, uTime: { value: 0 },
      uNoiseAmp: { value: C.core.noiseAmp }, uNoiseFreq: { value: C.core.noiseFreq }, uNoiseSpeed: { value: C.core.noiseSpeed },
    },
    vertexShader: CORE_VERT, fragmentShader: CORE_FRAG,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.renderOrder = 0;
  core.scale.setScalar(1e-4);

  // гало — аддитивный диск, всегда смотрит в камеру
  const haloGeo = new THREE.PlaneGeometry(C.halo.size, C.halo.size);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uSignal: { value: signal }, uHalo: { value: 0 } },
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.frustumCulled = false;
  halo.renderOrder = 3;

  // граф: frame (размещение + параллакс + масштаб) → tilt → spin (ЛОКАЛЬНОЕ пространство sim)
  const spinG = new THREE.Group();
  spinG.add(core, hubs, struts.obj, hairs.obj, frame.obj, axes.obj, points, halo);
  const tiltG = new THREE.Group();
  tiltG.rotation.set(C.frame.tilt[0], C.frame.tilt[1], C.frame.tilt[2]);
  tiltG.add(spinG);
  const frameG = new THREE.Group();
  frameG.add(tiltG);

  const dispose = () => {
    pointsGeo.dispose(); nodeMat.dispose();
    for (const L of [struts, hairs, frame, axes]) { L.geo.dispose(); L.mat.dispose(); }
    hubGeo.dispose(); hubMat.dispose(); hubs.dispose();
    coreGeo.dispose(); coreMat.dispose(); haloGeo.dispose(); haloMat.dispose();
  };
  return { lattice, growth, sim, pointsGeo, pointAttrs, nodeMat, struts, hairs, frame, axes, hubs, hubHeatAttr, core, coreMat, halo, haloMat, spinG, frameG, dispose };
}

/** Проекция точки (ox, oy, 0) мира в CSS px канваса при камере на оси z (без three-объектов). */
function projectAt(ox: number, oy: number, camZ: number, w: number, h: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(C.frame.fov / 2)), a = w / h;
  return { x: ((ox / (t * a * camZ) + 1) / 2) * w, y: ((1 - oy / (t * camZ)) / 2) * h };
}

/** Размещение: центр/масштаб группы от размеров канваса (мировые единицы на плоскости z=0). Возвращает смещение ядра. */
function placement(S: Built, tier: Tier, w: number, h: number): { ox: number; oy: number } {
  const vw = VH_WORLD * (w / h);
  const F = C.frame;
  let ox: number, oy: number, s: number;
  if (tier === "mobile") {
    s = (F.mobile.radiusVw * vw) / C.lattice.R0; // диаметр = 60 % ширины; центр в правом верху, край уходит за экран — намеренно
    ox = F.mobile.offsetX * vw;
    oy = F.mobile.offsetY * VH_WORLD;
  } else {
    const D = F.desktop;
    ox = D.offsetX * vw;
    oy = D.offsetY * VH_WORLD;
    s = w < D.narrowBelow ? D.narrowScale + (1 - D.narrowScale) * clamp((w - 1024) / (D.narrowBelow - 1024), 0, 1) : 1;
  }
  S.frameG.position.set(ox, oy, 0);
  S.frameG.scale.setScalar(s);
  S.nodeMat.uniforms.uDepthRange.value = C.lattice.R0 * s;
  return { ox, oy };
}

/** Прямоугольники h1/лида в NDC канваса — под ними структура приглушается. */
function measureRects(canvas: HTMLCanvasElement): Rect[] {
  const c = canvas.getBoundingClientRect();
  if (!c.width || !c.height) return [];
  const out: Rect[] = [];
  document.querySelectorAll("#hero [data-hero-text]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    out.push({
      x0: ((r.left - c.left) / c.width) * 2 - 1,
      x1: ((r.right - c.left) / c.width) * 2 - 1,
      y0: 1 - ((r.bottom - c.top) / c.height) * 2,
      y1: 1 - ((r.top - c.top) / c.height) * 2,
    });
  });
  return out;
}

/** Тень под текстом: проекция узлов (позиции прошлого кадра — лаг в кадр невидим) → sim.shade.
 *  p — прогресс journey: пока копия уезжает (shadeOff), тень снимается. */
function computeShade(S: Built, rects: Rect[], camera: THREE.Camera, m: THREE.Matrix4, p: number) {
  const { sim } = S;
  const { shade, positions: pos, N } = sim;
  const dim = (1 - C.shade.min) * (1 - smoothstep(C.journey.shadeOff[0], C.journey.shadeOff[1], p));
  if (!rects.length || dim <= 0) { shade.fill(1, 0, N); return; }
  m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(S.spinG.matrixWorld);
  const e = m.elements;
  const f = C.shade.feather;
  for (let i = 0; i < N; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    const cw = e[3] * x + e[7] * y + e[11] * z + e[15];
    if (cw <= 1e-6) { shade[i] = 1; continue; }
    const nx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / cw;
    const ny = (e[1] * x + e[5] * y + e[9] * z + e[13]) / cw;
    let s = 1;
    for (let r = 0; r < rects.length; r++) {
      const q = rects[r];
      const ix = smoothstep(q.x0 - f, q.x0 + f, nx) * (1 - smoothstep(q.x1 - f, q.x1 + f, nx));
      const iy = smoothstep(q.y0 - f, q.y0 + f, ny) * (1 - smoothstep(q.y1 - f, q.y1 + f, ny));
      const sr = 1 - dim * ix * iy;
      if (sr < s) s = sr;
    }
    shade[i] = s;
  }
}

/** Луч из NDC курсора в ЛОКАЛЬНОЕ пространство spin-группы → tmp.o / tmp.d. */
function localRay(S: Built, tmp: Tmp, camera: THREE.Camera, nx: number, ny: number) {
  tmp.ray.setFromCamera(tmp.v2.set(nx, ny), camera);
  tmp.inv.copy(S.spinG.matrixWorld).invert();
  tmp.o.copy(tmp.ray.ray.origin).applyMatrix4(tmp.inv);
  tmp.d.copy(tmp.ray.ray.direction).transformDirection(tmp.inv);
}

/** Позиции/цвета рёбер LineSegments2 — на GPU. */
function touchLines(L: Lines) {
  (L.geo.attributes.instanceStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
  (L.geo.attributes.instanceColorStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
}

/** Сброс буферов симуляции в GPU + скаляры ядра/гало/узлов. */
function flush(S: Built, camera: THREE.Camera, tmp: Tmp) {
  const { sim } = S;
  const { pos, heat, grow, shade } = S.pointAttrs;
  if (sim.D > 0) {
    // блок пыли [N, N+D) записан один раз — грузим только узлы (three чистит диапазоны после каждой загрузки)
    pos.addUpdateRange(0, sim.N * 3);
    heat.addUpdateRange(0, sim.N);
    grow.addUpdateRange(0, sim.N);
    shade.addUpdateRange(0, sim.N);
  }
  pos.needsUpdate = true;
  heat.needsUpdate = true;
  grow.needsUpdate = true;
  shade.needsUpdate = true;
  touchLines(S.struts);
  touchLines(S.hairs);
  touchLines(S.frame);
  touchLines(S.axes);
  if (S.axes.dist) {
    // пунктир осевых: дистанция 0 → текущая длина, штрихи расходятся из ядра
    const d = S.axes.dist.array as Float32Array, p = sim.axesPos;
    for (let s = 0; s < S.lattice.axes.count; s++) {
      const o = s * 6;
      d[s * 2] = 0;
      d[s * 2 + 1] = Math.hypot(p[o + 3] - p[o], p[o + 4] - p[o + 1], p[o + 5] - p[o + 2]);
    }
    S.axes.dist.needsUpdate = true;
  }
  for (let k = 0; k < sim.H; k++) {
    const s = Math.max(sim.hubScale[k], 1e-5);
    tmp.hm.makeScale(s, s, s).setPosition(sim.hubPos[k * 3], sim.hubPos[k * 3 + 1], sim.hubPos[k * 3 + 2]);
    S.hubs.setMatrixAt(k, tmp.hm);
  }
  S.hubs.instanceMatrix.needsUpdate = true;
  S.hubHeatAttr.needsUpdate = true;
  S.core.scale.setScalar(Math.max(sim.coreScale, 1e-4));
  S.coreMat.uniforms.uPulse.value = sim.pulse;
  S.coreMat.uniforms.uTime.value = sim.simTime;
  // гало смотрит в камеру: локальный кватернион = spinWorld⁻¹ · camera
  S.spinG.getWorldQuaternion(tmp.q).invert();
  S.halo.quaternion.copy(camera.quaternion).premultiply(tmp.q);
  S.haloMat.uniforms.uHalo.value = sim.halo;
  S.nodeMat.uniforms.uTime.value = sim.simTime;
  S.nodeMat.uniforms.uFront.value = sim.front;
  S.nodeMat.uniforms.uCenterZ.value = camera.position.z - S.frameG.position.z;
}

/** reduced-motion: один статичный кадр — та картинка, в которую оседает анимация. Без invalidate — его зовёт вызывающий. */
function renderStatic(S: Built, st: State, tmp: Tmp, tier: Tier, camera: THREE.Camera, scene: THREE.Scene, w: number, h: number) {
  const { sim } = S;
  st.place = placement(S, tier, w, h); // p = 0: ядро на месте покоя
  camera.position.z = C.frame.camZ;
  camera.updateMatrixWorld();
  const R0s = C.lattice.R0 * S.frameG.scale.x;
  const fog = scene.fog as THREE.Fog | null;
  if (fog) { fog.near = C.frame.camZ + C.fog.nearOffset * R0s; fog.far = C.frame.camZ + C.fog.farOffset * R0s; }
  S.spinG.rotation.y = C.orbit.reducedYaw;
  S.frameG.rotation.set(0, 0, 0);
  S.frameG.updateMatrixWorld(true);
  sim.stepStatic();
  computeShade(S, st.rects, camera, tmp.m, 0); sim.stepStatic(); // второй проход — связи с учётом тени (оба тира)
  S.nodeMat.uniforms.uIntensity.value = tier === "mobile" ? C.mobile.intensity : 1;
  flush(S, camera, tmp);
  if (!journey.assembled) { journey.assembled = true; journey._resolvers.splice(0).forEach((r) => r()); }
}

function Scene({ reduced, tier, hoverFine, quality, onArmMonitor }: {
  reduced: boolean; tier: Tier; hoverFine: boolean; quality: Quality; onArmMonitor: () => void;
}) {
  const { gl, camera, scene, size, viewport, invalidate, get } = useThree();
  const dpr = viewport.dpr;
  const S = useMemo(() => build(tier), [tier]);
  const st = useMemo<State>(() => ({
    ptr: { nx: 0, ny: 0, inside: false }, par: { yaw: 0, pitch: 0 }, rects: [], shocks: [],
    pointer: { ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 1, active: false },
    growthFired: false, firstFrame: true, armed: false, place: { ox: 0, oy: 0 },
  }), []);
  const tmp = useMemo<Tmp>(() => ({
    m: new THREE.Matrix4(), inv: new THREE.Matrix4(), hm: new THREE.Matrix4(), ray: new THREE.Raycaster(),
    v2: new THREE.Vector2(), o: new THREE.Vector3(), d: new THREE.Vector3(), c: new THREE.Vector3(), q: new THREE.Quaternion(),
  }), []);

  // освобождаем WebGL-ресурсы при размонтировании
  useEffect(() => () => S.dispose(), [S]);

  // invalidate для journey.setProgress при frameloop 'demand'
  useEffect(() => {
    journey._invalidate = invalidate;
    return () => { journey._invalidate = null; };
  }, [invalidate]);

  // качество: только bloom / ширины линий / пыль / усиления (dpr — снаружи) — без реаллокаций
  useEffect(() => {
    const bloom = hasBloom(tier, quality);
    S.struts.mat.linewidth = lineWidth("strut", tier, quality);
    S.hairs.mat.linewidth = S.frame.mat.linewidth = S.axes.mat.linewidth = lineWidth("hair", tier, quality);
    S.nodeMat.uniforms.uDustAlpha.value = tier === "desktop" && quality > 0 ? C.lattice.dust.alpha : 0;
    S.nodeMat.uniforms.uGlowGain.value = bloom ? C.node.glowGain : C.node.glowGainNoBloom;
    S.coreMat.uniforms.uRimGain.value = bloom ? C.core.rimGain : C.core.rimGainNoBloom;
    S.sim.haloIdle = bloom ? C.halo.idle : C.halo.idleNoBloom;
    journey.quality = quality;
    invalidate();
  }, [S, tier, quality, invalidate]);

  // resize: разрешение линий (CSS px → ширина в CSS px), dpr, размещение, прямоугольники текста
  useEffect(() => {
    for (const L of [S.struts, S.hairs, S.frame, S.axes]) L.mat.resolution.set(size.width, size.height);
    S.nodeMat.uniforms.uDpr.value = dpr;
    const { ox, oy } = placement(S, tier, size.width, size.height);
    st.place = { ox, oy };
    // проекция ядра в CSS px секции — для сида нити (ScrollJourney). Параллакс вращает frameG вокруг
    // ядра, поэтому точка статична на layout; end = конец дайва (camZEnd + дрейф к центру).
    const k = 1 - C.journey.center;
    journey.core = {
      rest: projectAt(ox, oy, C.frame.camZ, size.width, size.height),
      end: projectAt(ox * k, oy * k, C.journey.camZEnd, size.width, size.height),
    };
    journey.emitLayout();
    st.rects = measureRects(gl.domElement);
    invalidate();
  }, [S, st, tier, gl, size.width, size.height, dpr, invalidate]);

  // шрифты догрузились → текст мог перетечь → перемерить; статичный кадр испечён со старой тенью → перепечь
  useEffect(() => {
    if (tier !== "desktop") return;
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      st.rects = measureRects(gl.domElement);
      if (reduced) { const { size: sz } = get(); renderStatic(S, st, tmp, tier, camera, scene, sz.width, sz.height); }
      invalidate();
    });
    return () => { alive = false; };
  }, [S, st, tmp, reduced, tier, gl, camera, scene, get, invalidate]);

  // слушатели на window (канвас pointer-events:none): курсор → NDC, клик → удар
  useEffect(() => {
    if (reduced) return;
    const el = gl.domElement;
    const ndcOf = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return null; // гард от NaN при resize
      return {
        nx: ((cx - r.left) / r.width) * 2 - 1,
        ny: 1 - ((cy - r.top) / r.height) * 2,
        inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom,
      };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") { st.ptr.inside = false; return; }
      const p = ndcOf(e.clientX, e.clientY);
      if (!p) return;
      st.ptr.nx = p.nx; st.ptr.ny = p.ny; st.ptr.inside = p.inside;
    };
    /** Удар из точки экрана: луч → ближайшая к ядру точка (с лимитом радиуса) → сфера. */
    const shockAt = (cx: number, cy: number) => {
      const p = ndcOf(cx, cy);
      if (!p || !p.inside) return;
      camera.updateMatrixWorld();
      S.frameG.updateMatrixWorld(true);
      localRay(S, tmp, camera, p.nx, p.ny);
      const tc = Math.max(0, -tmp.o.dot(tmp.d));
      tmp.c.copy(tmp.d).multiplyScalar(tc).add(tmp.o);
      const lim = C.shock.centerClamp * C.lattice.R0;
      if (tmp.c.length() > lim) tmp.c.setLength(lim);
      st.shocks.push({ x: tmp.c.x, y: tmp.c.y, z: tmp.c.z, t: 0 });
      while (st.shocks.length > C.shock.max) st.shocks.shift();
      invalidate();
    };
    const onCta = (e: PointerEvent) => {
      const t = e.target as Element | null;
      return !!(t && typeof t.closest === "function" && t.closest("a,button,input,textarea,select,label,[role=button]"));
    };
    // тач: удар только по тапу (pointerup без сдвига и быстро) — иначе каждый свайп-скролл от героя бил бы по решётке
    let tap: { id: number; x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (onCta(e)) return; // CTA не пульсирует
      if (e.pointerType === "touch") { tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; return; }
      shockAt(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (!tap || e.pointerId !== tap.id) return;
      const dx = e.clientX - tap.x, dy = e.clientY - tap.y, ms = performance.now() - tap.t;
      tap = null;
      if (dx * dx + dy * dy <= C.shock.tap.move * C.shock.tap.move && ms <= C.shock.tap.ms) shockAt(e.clientX, e.clientY);
    };
    const onCancel = () => { tap = null; };
    const onLeave = () => { st.ptr.inside = false; };
    if (hoverFine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, [reduced, hoverFine, S, st, tmp, gl, camera, invalidate]);

  // reduced-motion: один статичный кадр (и заново на resize/dpr)
  useEffect(() => {
    if (!reduced) return;
    renderStatic(S, st, tmp, tier, camera, scene, size.width, size.height);
    invalidate();
  }, [reduced, S, st, tmp, tier, camera, scene, size.width, size.height, dpr, invalidate]);

  useFrame((_, delta) => {
    if (reduced || !journey.visible) return;
    const { sim } = S;
    const dt = Math.min(delta, 1 / 30);
    const T = sim.simTime;
    const p = journey.progress;
    if (st.firstFrame) { st.firstFrame = false; st.rects = measureRects(gl.domElement); }
    // дрейф ядра к центру сцены по ходу дайва (та же кривая, что у камеры)
    const q = quintInOut(p);
    S.frameG.position.set(st.place.ox * (1 - C.journey.center * q), st.place.oy * (1 - C.journey.center * q), 0);

    // 3. риг: камера/туман оседают после роста; орбита; параллакс от курсора
    const settle = expoOut(T / C.growth.settle);
    const camZ = lerp(lerp(C.frame.camZGrow, C.frame.camZ, settle), C.journey.camZEnd, quintInOut(p));
    camera.position.z = camZ;
    camera.updateMatrixWorld();
    const R0s = C.lattice.R0 * S.frameG.scale.x;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) { fog.near = camZ + C.fog.nearOffset * R0s; fog.far = camZ + lerp(C.fog.farOffsetGrow, C.fog.farOffset, settle) * R0s; }
    const spin = C.orbit.mode === "swing" ? C.orbit.swing * Math.sin(2 * Math.PI * C.orbit.swingHz * T) : C.orbit.speed * T;
    S.spinG.rotation.y = C.orbit.yaw0 + C.growth.yawFrom * (1 - settle) + spin + C.journey.yaw * p;
    const look = hoverFine && st.ptr.inside;
    const yawT = look ? st.ptr.nx * C.orbit.parallaxYaw : 0;
    const pitchT = look ? -st.ptr.ny * C.orbit.parallaxPitch : 0;
    const k = 1 - Math.exp(-C.orbit.damp * dt);
    st.par.yaw += (yawT - st.par.yaw) * k;
    st.par.pitch += (pitchT - st.par.pitch) * k;
    S.frameG.rotation.set(st.par.pitch, st.par.yaw, 0);
    S.frameG.updateMatrixWorld(true);

    // 4. тень под текстом (оба тира: на мобайле решётка лежит за h1/лидом); снимается по shadeOff
    computeShade(S, st.rects, camera, tmp.m, p);

    // 5. луч курсора в локальном пространстве
    const active = look && journey.visible;
    if (active) {
      localRay(S, tmp, camera, st.ptr.nx, st.ptr.ny);
      st.pointer.ox = tmp.o.x; st.pointer.oy = tmp.o.y; st.pointer.oz = tmp.o.z;
      st.pointer.dx = tmp.d.x; st.pointer.dy = tmp.d.y; st.pointer.dz = tmp.d.z;
    }
    st.pointer.active = active;

    // 6. удар роста — один раз
    if (!st.growthFired && T >= C.shock.growth.delay) {
      st.growthFired = true;
      st.shocks.push({ x: 0, y: 0, z: 0, t: 0, speed: C.shock.growth.speed });
    }

    // 7–8. шаг + сброс в GPU
    S.nodeMat.uniforms.uIntensity.value =
      (tier === "mobile" ? C.mobile.intensity : 1) * (1 - 0.5 * smoothstep(C.journey.dim[0], C.journey.dim[1], p));
    sim.step(dt, st.pointer, st.shocks, p);
    flush(S, camera, tmp);

    // 9–10. флаги: собрано / монитор производительности
    if (!journey.assembled && sim.assembled) { journey.assembled = true; journey._resolvers.splice(0).forEach((r) => r()); }
    if (!st.armed && sim.simTime >= C.quality.monitor.delay) { st.armed = true; onArmMonitor(); }
  });

  return <primitive object={S.frameG} dispose={null} />;
}

export default function LivingNetwork({ visible }: { visible: boolean }) {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // ярус/указатель решаются один раз при монтировании
  const env = useMemo(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const tier: Tier = window.innerWidth < C.tiers.mobileMaxWidth || coarse ? "mobile" : "desktop";
    const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const lowCore = (navigator.hardwareConcurrency ?? 8) <= C.tiers.lowCoreCount;
    const devicePixelRatio = window.devicePixelRatio || 1;
    return { tier, hoverFine, lowCore, devicePixelRatio };
  }, []);
  // десктоп: 2 → 1 → 0 (bloom / dpr / ширины / пыль); мобайл: m1 (1) → m0 (0)
  const [quality, setQuality] = useState<Quality>(() => (env.tier === "desktop" ? (env.lowCore ? 1 : 2) : 1));
  const [monitorArmed, setMonitorArmed] = useState(false);
  const dpr =
    env.tier === "desktop"
      ? Math.min(env.devicePixelRatio, C.quality.dpr[quality])
      : Math.min(env.devicePixelRatio, quality > 0 ? C.quality.dprMobile : 1);
  const M = C.quality.monitor;

  return (
    <Canvas
      flat
      dpr={dpr}
      gl={{ antialias: env.tier === "mobile", alpha: false, powerPreference: "high-performance", stencil: false }}
      camera={{ fov: C.frame.fov, near: C.frame.near, far: C.frame.far, position: [0, 0, C.frame.camZGrow] }}
      frameloop={reduced || !visible ? "demand" : "always"}
      style={{ pointerEvents: "none" }} // r3f сам ставит inline pointer-events:auto — перебиваем, ввод идёт с window
      onCreated={({ gl }) => gl.setClearColor(C.colors.ink, 1)}
    >
      <color attach="background" args={[C.colors.ink]} />
      <fog attach="fog" args={[C.colors.ink, 10.7, 17.1]} />
      <hemisphereLight args={[C.lights.hemi.sky, C.lights.hemi.ground, C.lights.hemi.intensity]} />
      <directionalLight
        color={C.lights.dir.color}
        intensity={C.lights.dir.intensity}
        position={[C.lights.dir.position[0], C.lights.dir.position[1], C.lights.dir.position[2]]}
      />
      <Scene
        key={reduced ? "r" : "a"}
        reduced={reduced}
        tier={env.tier}
        hoverFine={env.hoverFine}
        quality={quality}
        onArmMonitor={() => setMonitorArmed(true)}
      />
      {env.tier === "desktop" && <PostFX quality={quality} />}
      {/* только вниз по onDecline; flipflops/onFallback не задаём (см. config.quality.monitor). Монтируем лишь пока
          герой на экране: ремаунт сбрасывает выборку, иначе редкие demand-кадры после паузы читались бы как 0–4 fps */}
      {!reduced && monitorArmed && visible && (
        <PerformanceMonitor
          iterations={M.iterations}
          ms={M.ms}
          threshold={M.threshold}
          onDecline={() => setQuality((q) => Math.max(0, q - 1) as Quality)}
        />
      )}
    </Canvas>
  );
}
