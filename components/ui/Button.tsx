import type { AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "signal" | "ink" | "ghostDark" | "ghostLight";

const BASE =
  "inline-flex items-center gap-[10px] rounded-sm px-6 py-[14px] text-base font-medium no-underline border border-transparent transition-[background-color,border-color,color] duration-[var(--dur-micro)] ease-standard";

const VARIANT: Record<Variant, string> = {
  // зелёный против ink — соответствует контраст-закону
  signal: "bg-signal text-ink hover:bg-signal-bright",
  ink: "bg-ink text-[var(--color-ink-fg)] hover:bg-[var(--color-ink-deep)]",
  ghostDark:
    "bg-transparent text-[var(--color-ink-fg)] border-[var(--color-hairline-on-ink-strong)] hover:border-[var(--color-ink-fg)]",
  ghostLight:
    "bg-transparent text-ink border-hairline hover:border-ink",
};

export function Button({
  variant = "signal",
  children,
  className = "",
  ...rest
}: {
  variant?: Variant;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </a>
  );
}
