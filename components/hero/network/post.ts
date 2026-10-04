// Пост-обработка (только десктоп): EffectComposer → RenderPass → UnrealBloomPass → OutputPass → FXAAPass.
// HalfFloat-буфер хранит HDR (>1) горячих узлов → цветёт в bloom; OutputPass делает sRGB-трансфер
// (tone mapping выключен — Canvas flat); FXAA последним пишет на экран уже в sRGB.
import { Vector2, type Camera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { FXAAPass } from "three/examples/jsm/postprocessing/FXAAPass.js";
import type { NETWORK } from "./config";

export type PostConfig = typeof NETWORK.post;

export function createComposer(gl: WebGLRenderer, scene: Scene, camera: Camera, w: number, h: number, dpr: number, cfg: PostConfig) {
  const composer = new EffectComposer(gl); // HalfFloat RT размером w·dpr × h·dpr
  const render = new RenderPass(scene, camera);
  // полный размер в device px — pass сам делит пополам внутри
  const bloom = new UnrealBloomPass(new Vector2(w * dpr, h * dpr), cfg.bloom.strength, cfg.bloom.radius, cfg.bloom.threshold);
  const output = new OutputPass();
  const fxaa = new FXAAPass();
  fxaa.enabled = cfg.fxaa;
  composer.addPass(render);
  composer.addPass(bloom);
  composer.addPass(output);
  composer.addPass(fxaa);
  return {
    composer,
    bloom,
    setSize(width: number, height: number, pixelRatio: number) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(width, height); // пробрасывается во все pass'ы
    },
    dispose() {
      composer.dispose();
      bloom.dispose();
      output.dispose();
      fxaa.dispose();
    },
  };
}
