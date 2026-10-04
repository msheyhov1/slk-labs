import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Reveal } from "@/components/Reveal";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { CoverMedia } from "./CoverMedia";
import type { Presented } from "@/lib/cases";
import { work } from "@/lib/content/work";

/** Тело кейса на костяном: показатели → задача / решение / результат → материалы. */
export function CaseBody({ p }: { p: Presented }) {
  const keys = ["problem", "solution", "result"] as const;
  return (
    <section id="case-body" data-journey-section data-surface="bone" className="bg-bone">
      <Container className="relative py-[clamp(72px,10vw,128px)]">
        <ThreadLayer />
        {p.metrics.length > 0 && (
          <Reveal as="dl" className="grid grid-cols-2 gap-px border border-hairline bg-hairline md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            {p.metrics.map((m) => (
              <div key={m.label} className="bg-bone px-[18px] py-5">
                <dt className="font-mono text-[11px] uppercase tracking-label text-ink-2">{m.label}</dt>
                <dd className={`m-0 mt-2 text-h3 font-semibold tracking-tight ${m.signal ? "text-signal-ink" : "text-ink"}`}>{m.value}</dd>
              </div>
            ))}
          </Reveal>
        )}
        {keys.map((k) => (
          <div key={k} className="mt-[clamp(56px,8vw,96px)]">
            <SectionHead index={work.sections[k]} title={p.sections[k].title} tone="light" />
            <Reveal className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 lg:col-start-6">
                {p.sections[k].body.map((t, i) => (
                  <p key={i} className="mb-5 mt-0 max-w-[var(--container-text)] text-body leading-body text-ink">{t}</p>
                ))}
              </div>
            </Reveal>
          </div>
        ))}
        <div className="mt-[clamp(56px,8vw,96px)]">
          <SectionHead index={work.sections.materials} title={work.materialsTitle} tone="light">
            {p.nda && <MonoLabel tone="ink-2">{work.nda.note}</MonoLabel>}
          </SectionHead>
          <Reveal stagger className="mt-8 grid gap-px border border-hairline bg-hairline md:grid-cols-2">
            {p.gallery.map((m, i) => (
              <figure key={i} data-reveal className="m-0 bg-bone p-px">
                <CoverMedia media={m} preset={p.preset} seed={p.seed} />
                <figcaption className="px-4 py-3 font-mono text-[12px] uppercase tracking-label text-ink-2">{m.caption ?? work.plateCaption}</figcaption>
              </figure>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
