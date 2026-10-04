import Link from "next/link";
import type { ReactNode } from "react";
import { caseHref } from "@/lib/paths";

/** Карточка-ссылка на страницу кейса (next/link добавит basePath). */
/** reveal — только внутри <Reveal stagger> (грид Works): иначе html.js [data-reveal] скрыл бы ссылку навсегда. */
export function CaseLink({ slug, ariaLabel, className = "", reveal = false, children }: { slug: string; ariaLabel: string; className?: string; reveal?: boolean; children: ReactNode }) {
  return (
    <Link href={caseHref(slug)} data-reveal={reveal ? "" : undefined} data-case={slug} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}
