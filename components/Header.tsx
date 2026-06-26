"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { nav } from "@/lib/site";

export function Header() {
  // прозрачный поверх тёмного героя; костяной фон — после ухода с героя
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
