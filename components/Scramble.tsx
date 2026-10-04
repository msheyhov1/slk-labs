"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { prefersReduced } from "@/lib/gsap";
import { motion } from "@/lib/motion";

const GLYPHS = "01·/—+×ABCDEFKLMNPRSTXYZ";

/**
 * Скрэмбл моно-лейбла: при появлении (и при наведении на ближайшую ссылку/карточку) знаки
 * «перебираются» и оседают в текст слева направо (expo.out). Текст в DOM всегда финальный для
 * SEO/скринридера (aria-label); reduced-motion → без анимации.
 */
export function Scramble({ text, className = "", children }: { text: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      const dur = motion.dur.slow * 1000;
      const t0 = performance.now();
      const tick = (now: number) => {
        const u = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(2, -10 * u); // expo.out
        const settled = Math.floor(e * text.length);
        let out = "";
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          out += i < settled || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        el.textContent = out;
        if (u < 1) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    const host = el.closest("a, article, [data-scramble-host]");
    const onEnter = () => run();
    host?.addEventListener("pointerenter", onEnter);
    return () => { cancelAnimationFrame(raf); io.disconnect(); host?.removeEventListener("pointerenter", onEnter); };
  }, [text]);

  return (
    <span className={className} aria-label={text}>
      <span ref={ref} aria-hidden>{text}</span>
      {children}
    </span>
  );
}
