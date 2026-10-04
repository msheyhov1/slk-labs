import type { Presented } from "@/lib/cases";
import { work } from "@/lib/content/work";
import { Scramble } from "@/components/Scramble";

/** «Слой прибора» поверх чертежа: индекс, узел, показания, подпись пресета, подсказка. Всё декоративно. */
export function CoverChrome({ p, stage = false }: { p: Presented; stage?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 p-[18px] font-mono uppercase">
      <span className="absolute left-[18px] top-[18px] text-[12px] tracking-[0.06em] text-signal"><Scramble text={p.idx} /></span>
      <span data-node className="absolute right-[18px] top-[18px] h-[var(--node-size)] w-[var(--node-size)] rounded-[1px] bg-signal signal-glow" />
      <div className="absolute bottom-[18px] left-[18px] flex flex-col gap-1">
        <span className="hidden text-[11px] tracking-[0.06em] text-[var(--color-ink-fg-3)] min-[400px]:block">
          {p.readouts.map(([k, v]) => `${k} ${v}`).join(" · ")}
        </span>
        <span className="text-[11px] tracking-label text-[var(--color-ink-fg-4)]">{work.presetLabel[p.preset]}</span>
      </div>
      <span className="absolute bottom-[18px] right-[18px] flex items-center gap-2 text-[11px] tracking-label text-[var(--color-ink-fg-4)]">
        {stage ? (
          <>
            <span className="signal-glow h-[6px] w-[6px] rounded-full bg-signal" />
            <span className="text-signal">{work.live}</span>
          </>
        ) : (
          work.coverHint
        )}
      </span>
    </div>
  );
}
