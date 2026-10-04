import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";

/**
 * Шапка секции: моно-индекс + заголовок + правый слот (нота/мета).
 * Линия под шапкой не border, а рисуемая: узел нити ([data-stitch-node]) на хребте слева
 * и подчёркивание ([data-stitch-line]), которое дорисовывается из узла, когда нить доходит до шапки
 * (ScrollJourney). Без JS (нет html.journey) линия видна сразу.
 */
export function SectionHead({
  index,
  title,
  children,
  tone = "light",
  titleId,
}: {
  index: string;
  title: ReactNode;
  children?: ReactNode;
  tone?: "light" | "dark";
  titleId?: string;
}) {
  const dark = tone === "dark";
  return (
    <Reveal className="relative flex flex-wrap items-end justify-between gap-6 pb-8">
      <i
        aria-hidden
        data-stitch-line
        className={`absolute inset-x-0 bottom-0 h-px origin-left ${
          dark ? "bg-[var(--color-hairline-on-ink)]" : "bg-hairline"
        }`}
      />
      <i aria-hidden data-stitch-node className="stitch-node bottom-[calc(var(--node-size)/-2)]" />
      <div>
        <span
          className={`font-mono text-[13px] uppercase tracking-label ${
            dark ? "text-signal" : "text-signal-ink"
          }`}
        >
          {index}
        </span>
        <h2
          id={titleId}
          className={`mt-[18px] text-h2 font-semibold leading-[1.08] tracking-tight ${
            dark ? "text-[var(--color-ink-fg)]" : "text-ink"
          }`}
        >
          {title}
        </h2>
      </div>
      {children}
    </Reveal>
  );
}
