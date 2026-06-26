import { createElement, type ElementType, type ReactNode } from "react";

/** Максимальная ширина (88rem) + флюидный gutter из токенов. */
export function Container({
  as = "div",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return createElement(
    as,
    {
      className: `mx-auto w-full max-w-[var(--container-max)] px-[var(--gutter)] ${className}`,
    },
    children,
  );
}
