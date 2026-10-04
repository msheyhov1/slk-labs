"use client";

import { useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { nav } from "@/lib/site";

type Surface = "dark" | "bone";

export function Header() {
  // Поверхность под хедером: прозрачный+светлый над тёмным (герой, Works) ↔ костяной blur+тёмный над светлым.
  // Источник — [data-surface] на секциях: ScrollTrigger по линии низа хедера (--header-h). Это состояние,
  // не моушн → работает и в reduced-motion, и с нативным скроллом. Обёртка героя — pinSpacer,
  // её высота включает спейсер пина → хедер прозрачен весь пин.
  const [surface, setSurface] = useState<Surface>("dark");

  useEffect(() => {
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
    const ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>("[data-surface]").forEach((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: `top ${headerH}px`,
          end: `bottom ${headerH}px`,
          onToggle: (s) => { if (s.isActive) setSurface(el.dataset.surface as Surface); },
        }),
      );
    });
    return () => ctx.revert();
  }, []);

  const scrolled = surface === "bone";

  const shell = scrolled
    ? "border-hairline bg-[var(--color-bone-glass)] backdrop-blur-[14px]"
    : "border-transparent bg-transparent";
  const logo = scrolled ? "text-ink" : "text-[var(--color-ink-fg)]";
  const suffix = scrolled ? "text-ink-2" : "text-[var(--color-ink-fg-3)]";
  const dot = scrolled ? "bg-signal-ink" : "bg-signal";
  const link = scrolled
    ? "text-ink-2 hover:text-ink"
    : "text-[var(--color-ink-fg-3)] hover:text-[var(--color-ink-fg)]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-[var(--header-h)] items-center border-b transition-colors duration-300 ease-standard ${shell}`}
    >
      <Container className="flex items-center justify-between gap-6">
        <a
          href="#top"
          aria-label="SLK-labs — на главную"
          className={`flex items-center gap-[10px] no-underline ${logo}`}
        >
          <span aria-hidden className={`slk-pulse h-2 w-2 shrink-0 rounded-[1px] ${dot}`} />
          <span className="text-[17px] font-semibold tracking-tight">
            SLK<span className={suffix}>-labs</span>
          </span>
        </a>

        <nav aria-label="Основная навигация" className="flex items-center gap-5 sm:gap-7">
          {nav.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className={`-my-3 py-3 font-mono text-[12px] uppercase tracking-label no-underline transition-colors duration-[var(--dur-micro)] ease-standard sm:text-[13px] ${link}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </Container>
    </header>
  );
}
