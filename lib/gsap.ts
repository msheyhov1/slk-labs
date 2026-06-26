// Единая точка регистрации GSAP-плагинов + паритет CSS-easing ↔ GSAP.
// Импортировать ТОЛЬКО из клиентских компонентов ("use client").
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, CustomEase);
  // Зеркалим сигнатурный CSS-easing (--ease-out-expo) один в один.
  if (!CustomEase.get("settle")) CustomEase.create("settle", "0.16, 1, 0.3, 1");
  if (!CustomEase.get("scene")) CustomEase.create("scene", "0.83, 0, 0.17, 1");
}

export function prefersReduced(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export { gsap, ScrollTrigger, CustomEase };
