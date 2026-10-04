import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Button } from "@/components/ui/Button";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { CoverMedia } from "./CoverMedia";
import { CoverChrome } from "./CoverChrome";
import type { Presented } from "@/lib/cases";
import { work } from "@/lib/content/work";

/** «Комната» кейса: тёмный герой — сцена (чертёж) + копия. h1 — текст (LCP), без Reveal. */
export function CaseHero({ p }: { p: Presented }) {
  const rows: Array<[string, string, boolean?]> = [
    [work.meta.type, p.type],
    [work.meta.year, p.year],
    [work.meta.stack, p.meta.stack.join(" · "), true],
    [work.meta.role, p.meta.role],
  ];
  if (p.meta.duration) rows.push([work.meta.duration, p.meta.duration]);
  if (p.nda) rows.push([work.meta.client, work.nda.client]);
  else if (p.meta.client) rows.push([work.meta.client, p.meta.client]);
  return (
    <section id="case-hero" aria-labelledby="case-title" data-journey-section data-surface="dark" className="bg-ink text-[var(--color-ink-fg)]">
      <Container className="relative pb-[clamp(56px,8vw,96px)] pt-[calc(var(--header-h)+40px)] lg:flex lg:min-h-[100svh] lg:flex-col lg:justify-center">
        <ThreadLayer />
        <nav aria-label={work.aria.nav} className="mb-8 flex items-center gap-4 font-mono text-[12px] uppercase tracking-label">
          <Link href="/#works" className="-my-3 py-3 text-[var(--color-ink-fg-3)] no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:text-[var(--color-ink-fg)]">
            {work.back}
          </Link>
        </nav>
        <div className="grid gap-[clamp(28px,4vw,64px)] lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <div data-stage role="img" aria-label={work.aria.stage(p.title)}>
              <CoverMedia media={p.cover} preset={p.preset} seed={p.seed} chrome={<CoverChrome p={p} stage />} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative flex items-center gap-3">
              <i aria-hidden data-stitch-node className="stitch-node stitch-node--row" />
              <MonoLabel tone="signal">{p.idx}</MonoLabel>
              {p.nda && (
                <MonoLabel tone="fg-3" className="rounded-[1px] border border-[var(--color-hairline-on-ink-strong)] px-[6px] py-[1px] text-[11px]">
                  {work.nda.badge}
                </MonoLabel>
              )}
            </div>
            <h1 id="case-title" className="m-0 mt-[18px] max-w-[18ch] text-h1 font-semibold leading-[1.02] tracking-display">{p.title}</h1>
            <p className="mt-5 text-lead leading-body text-[var(--color-ink-fg-2)]">{p.sub}</p>
            <p className="mt-6 max-w-[var(--container-text)] text-body leading-body text-[var(--color-ink-fg-3)]">{p.summary}</p>
            <dl className="mt-10 grid grid-cols-2 gap-px border border-[var(--color-hairline-on-ink-soft)] bg-[var(--color-hairline-on-ink-soft)] sm:grid-cols-3">
              {rows.map(([k, v, signal]) => (
                <div key={k} className="m-0 bg-ink px-[18px] py-4">
                  <dt className="font-mono text-[11px] uppercase tracking-label text-[var(--color-ink-fg-3)]">{k}</dt>
                  <dd className={`m-0 mt-[6px] font-mono text-[13px] ${signal ? "text-signal" : "text-[var(--color-ink-fg)]"}`}>{v}</dd>
                </div>
              ))}
            </dl>
            {!p.nda && p.meta.link && (
              <Button variant="ghostDark" href={p.meta.link.href} rel="noopener" className="mt-8">
                {p.meta.link.label ?? work.open}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
