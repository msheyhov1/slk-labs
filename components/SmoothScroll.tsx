"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReduced } from "@/lib/gsap";

/**
 * Поднимает плавный скролл (Lenis) и сшивает его с GSAP/ScrollTrigger.
 * - помечает <html class="js"> → включает reveal-грамматику (no-JS остаётся видимым);
 * - prefers-reduced-motion → Lenis не запускаем, нативный скролл.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    if (prefersReduced()) {
      ScrollTrigger.refresh();
      return;
    }

    // Лёгкое сглаживание, не «плавучее»: короткий глайд, скролл следует за вводом.
    const lenis = new Lenis({
      lerp: 0.14,
      wheelMultiplier: 1,
      smoothWheel: true,
      syncTouch: false, // на тач — нативный скролл (без инерции Lenis)
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    return () => {
      gsap.ticker.remove(raf);
      window.removeEventListener("load", refresh);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
