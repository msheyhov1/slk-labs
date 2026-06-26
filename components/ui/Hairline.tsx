/** Декоративная структурная линия. На светлом — графит, на тёмном — приглушённая. */
export function Hairline({
  on = "light",
  className = "",
}: {
  on?: "light" | "dark";
  className?: string;
}) {
  const color =
    on === "dark" ? "bg-[var(--color-hairline-on-ink)]" : "bg-hairline";
  return <div aria-hidden className={`h-px w-full ${color} ${className}`} />;
}
