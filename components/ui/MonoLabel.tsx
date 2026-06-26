import type { ReactNode } from "react";

type Tone = "ink" | "ink-2" | "signal-ink" | "signal" | "fg" | "fg-3";

const TONE: Record<Tone, string> = {
  ink: "text-ink",
  "ink-2": "text-ink-2",
  "signal-ink": "text-signal-ink", // читаемый зелёный на светлом
  signal: "text-signal", // только против тёмного
  fg: "text-[var(--color-ink-fg)]",
  "fg-3": "text-[var(--color-ink-fg-3)]",
};

/** «Слой прибора»: моноширинный лейбл — координаты, индексы, статусы. */
export function MonoLabel({
  children,
  tone = "ink-2",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-label uppercase tracking-label ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
