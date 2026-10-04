"use client";

// Композер на десктопе: useFrame с приоритетом 1 → r3f сам не рендерит, рендерим мы.
// Quality < 2 выключает bloom (остаётся RenderPass → Output → FXAA). На reduced-motion
// композер рендерит единственный кадр по invalidate (bloom один раз).
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { NETWORK } from "./config";
import { createComposer } from "./post";

// Композер — императивный WebGL-объект, его флаги меняются в эффектах (не React-стейт).
/* eslint-disable react-hooks/immutability */

export default function PostFX({ quality }: { quality: 0 | 1 | 2 }) {
  const { gl, scene, camera, size, viewport } = useThree();
  const dpr = viewport.dpr;

  const fx = useMemo(
    () => createComposer(gl, scene, camera, size.width, size.height, dpr, NETWORK.post),
    // размер/dpr применяются эффектом ниже — композер создаётся один раз на рендерер
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gl, scene, camera],
  );

  useEffect(() => {
    fx.setSize(size.width, size.height, dpr);
  }, [fx, size.width, size.height, dpr]);

  useEffect(() => {
    fx.bloom.enabled = quality >= 2;
  }, [fx, quality]);

  useEffect(() => () => fx.dispose(), [fx]);

  useFrame(() => fx.composer.render(), 1);
  return null;
}
