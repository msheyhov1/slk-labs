"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReduced } from "@/lib/gsap";
import { motion } from "@/lib/motion";

/**
 * Поднимает плавный скролл (Lenis) и сшивает его с GSAP/ScrollTrigger.
 * - помечает <html class="js"> → включает reveal-грамматику (no-JS остаётся видимым);
 * - prefers-reduced-motion → Lenis не запускаем, нативный скролл;
 * - якоря (a[href^="#"]) ведёт Lenis: нативный прыжок + «снап назад» Lenis дал бы вспышку на кадр
 *   (хуже — в запиненный герой); offset = scroll-padding-top корня (--header-h), Lenis вычитает его сам.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    // шрифты догрузились → высоты секций поменялись → перемерить (KineticText ждёт тот же promise раньше)
    let alive = true;
    let rejump: (() => void) | null = null; // Lenis-ветка: повторить прыжок по хэшу — контент выше цели перетёк
    document.fonts?.ready.then(() => { if (!alive) return; ScrollTrigger.refresh(); rejump?.(); });

    if (prefersReduced()) {
      ScrollTrigger.refresh();
      return () => { alive = false; };
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

    // эффекты детей уже создали пин → спейсер есть → все триггеры меряются с ним
    ScrollTrigger.refresh();
    // нативный прыжок по хэшу случился до появления спейсера → перепрыгнуть на место. Lenis мерит limit
    // в конструкторе (тоже до спейсера) и клампит scrollTo по нему → сначала перемерить (resize), иначе
    // последние секции (#contact) не доезжают на высоту спейсера
    const jumpToHash = () => { lenis.resize(); lenis.scrollTo(location.hash, { immediate: true, force: true }); };
    if (location.hash) jumpToHash();
    // после догрузки шрифтов — ещё раз (контент выше цели мог перетечь), пока пользователь сам не скроллил
    let userScrolled = false;
    const onInput = () => { userScrolled = true; };
    const inputs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    for (const ev of inputs) window.addEventListener(ev, onInput, { passive: true, once: true });
    rejump = () => { if (location.hash && !userScrolled) jumpToHash(); };

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);

    // якоря: CSS/GSAP/Lenis-паритет easing; фокус на цели после прибытия (a11y)
    const settle = gsap.parseEase(motion.ease.settle);
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const hash = a.getAttribute("href") ?? "";
      if (hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, {
        duration: motion.dur.scene,
        easing: settle,
        onComplete: () => {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        },
      });
      history.pushState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      alive = false;
      gsap.ticker.remove(raf);
      for (const ev of inputs) window.removeEventListener(ev, onInput);
      window.removeEventListener("load", refresh);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
