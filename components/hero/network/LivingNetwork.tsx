"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { prefersReduced } from "@/lib/gsap";
import { NETWORK } from "./config";
import { NODE_VERT, NODE_FRAG } from "./shaders";
import { NetworkSimulation, type Shock } from "./simulation";

// r3f императивно мутирует геометрию и буферы симуляции в useFrame — это
// WebGL-рендер-цикл, а не React-стейт. Правило React Compiler здесь неприменимо.
/* eslint-disable react-hooks/immutability */

/** Сцена: создаёт геометрии поверх буферов симуляции, гоняет физику в useFrame. */
function NetField({ reduced }: { reduced: boolean }) {
  const { viewport, gl, invalidate } = useThree();
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2);

  const { sim, nodeGeo, nodeMat, lineGeo, lineMat } = useMemo(() => {
    const sim = new NetworkSimulation(viewport.width, viewport.height);

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(sim.positions, 3));
    nodeGeo.setAttribute("aHeat", new THREE.BufferAttribute(sim.heat, 1));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(sim.sizes, 1));
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: {
        uBase: { value: new THREE.Color(NETWORK.colors.base.hex) },
        uSignal: { value: new THREE.Color(NETWORK.colors.signal.hex) },
        uDpr: { value: dpr },
      },
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(sim.segPositions, 3));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(sim.segColors, 3));
    lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { sim, nodeGeo, nodeMat, lineGeo, lineMat };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pointer = useRef({ x: 0, y: 0, active: false });
  const shocks = useRef<Shock[]>([]);

  // курсор слушаем на window → канвас остаётся pointer-events:none (скролл/клики свободны)
  useEffect(() => {
    if (reduced) return;
    const el = gl.domElement;
    const toWorld = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return { inside: false, x: 0, y: 0 }; // гард от NaN при resize
      return {
        inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom,
        x: ((cx - r.left) / r.width * 2 - 1) * (viewport.width / 2),
        y: -((cy - r.top) / r.height * 2 - 1) * (viewport.height / 2),
      };
    };
    const onMove = (e: PointerEvent) => {
      const p = toWorld(e.clientX, e.clientY);
      pointer.current = { x: p.x, y: p.y, active: p.inside };
    };
    const onDown = (e: PointerEvent) => {
      const p = toWorld(e.clientX, e.clientY);
      if (!p.inside) return;
      shocks.current.push({ x: p.x, y: p.y, t: 0 });
      if (shocks.current.length > 5) shocks.current.shift();
    };
    const onBlur = () => { pointer.current.active = false; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("blur", onBlur);
    };
  }, [reduced, gl, viewport.width, viewport.height]);

  const flush = () => {
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.aHeat.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.setDrawRange(0, sim.segCount * 2);
  };

  // reduced-motion: посчитать статичную структуру один раз
  useEffect(() => {
    if (!reduced) return;
    sim.setBounds(viewport.width, viewport.height);
    sim.step(0, 0, pointer.current, shocks.current, true);
    flush();
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // освобождаем WebGL-ресурсы при размонтировании (геометрии/материалы)
  useEffect(() => {
    return () => {
      nodeGeo.dispose();
      nodeMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    if (reduced) return;
    sim.setBounds(viewport.width, viewport.height);
    sim.step(state.clock.elapsedTime, Math.min(delta, 1 / 30), pointer.current, shocks.current, false);
    flush();
  });

  return (
    <group>
      <points geometry={nodeGeo} material={nodeMat} />
      <lineSegments geometry={lineGeo} material={lineMat} />
    </group>
  );
}

export default function LivingNetwork() {
  const reduced = typeof window !== "undefined" ? prefersReduced() : false;
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 12], fov: 45 }}
      frameloop={reduced ? "demand" : "always"}
    >
      <NetField reduced={reduced} />
    </Canvas>
  );
}
