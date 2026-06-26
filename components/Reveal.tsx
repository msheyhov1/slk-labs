"use client";

import { createElement, useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, prefersReduced } from "@/lib/gsap";
import { motion } from "@/lib/motion";

// ref пробрасывается в полиморфный элемент через createElement (DOM-ref, не доступ к .current)
/* eslint-disable react-hooks/refs */

/**
 * Грамматика «сборки»: элемент(ы) ОСЕДАЮТ в покой (y + autoAlpha), не «фейдятся».
 * - stagger: анимирует прямые потомки с [data-reveal] последовательно;
 *   иначе — сам контейнер (тоже помечается [data-reveal] для CSS-скрытия).
 * - prefers-reduced-motion → ничего не двигаем, CSS показывает контент.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className = "",
  stagger = false,
  start = "top 85%",
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;

    const targets = stagger
      ? Array.from(el.querySelectorAll<HTMLElement>(":scope [data-reveal]"))
      : [el];
    if (!targets.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: 22 },
        {
          autoAlpha: 1,
          y: 0,
          duration: motion.dur.base,
          ease: motion.ease.settle,
          stagger: stagger ? motion.stagger : 0,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [stagger, start]);

  return createElement(
    Tag,
    { ref, "data-reveal": stagger ? undefined : "", className },
    children,
  );
}
