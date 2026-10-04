import type { ReactNode } from "react";
import type { Media, Preset } from "@/lib/cases";
import { Blueprint } from "./Blueprint";

/** Бокс 16/10 обложки — одинаков для карточки, сцены кейса и плашек галереи. */
export function CoverMedia({ media, preset, seed, chrome, className = "" }: { media: Media; preset: Preset; seed: number; chrome?: ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden bg-[var(--color-ink-deep)] ${className}`}>
      <Blueprint preset={preset} seed={seed} view={media.view ?? "cover"} className="bp-cover" />
      {chrome}
    </div>
  );
}
