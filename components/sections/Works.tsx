import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/Reveal";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { listed, present } from "@/lib/cases";
import { work } from "@/lib/content/work";
import { CaseLink } from "@/components/work/CaseLink";
import { CoverMedia } from "@/components/work/CoverMedia";
import { CoverChrome } from "@/components/work/CoverChrome";

export function Works() {
  return (
    <section
      id="works"
      aria-labelledby="works-title"
      data-journey-section
      data-surface="dark"
      className="bg-ink text-[var(--color-ink-fg)]"
    >
      <Container className="relative py-[clamp(72px,10vw,128px)]">
        <ThreadLayer />
        <SectionHead index="01 / Кейсы" title="Избранные проекты" tone="dark" titleId="works-title">
          <span className="font-mono text-[13px] uppercase tracking-[0.06em] text-[var(--color-ink-fg-3)]">
            2024 — 2025 / {String(listed().length).padStart(2, "0")} записи
          </span>
        </SectionHead>

        <Reveal
          stagger
          className="mt-px grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-px border border-[var(--color-hairline-on-ink-soft)] bg-[var(--color-hairline-on-ink-soft)]"
        >
          {listed().map(present).map((p) => (
            <CaseLink
              key={p.slug}
              slug={p.slug}
              reveal
              ariaLabel={work.aria.card(p.title, p.sub)}
              className="group flex flex-col bg-ink no-underline transition-colors duration-[var(--dur-short)] ease-standard hover:bg-ink-soft"
            >
              <CoverMedia media={p.cover} preset={p.preset} seed={p.seed} chrome={<CoverChrome p={p} />} />
              <div className="px-[clamp(20px,2.4vw,28px)] pb-7 pt-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="m-0 text-[1.5rem] font-semibold tracking-tight text-[var(--color-ink-fg)]">
                    {p.title}
                  </h3>
                  <span className="text-base text-[var(--color-ink-fg-3)]">{p.sub}</span>
                </div>
                <p className="mt-3 max-w-[40ch] text-small leading-body text-[var(--color-ink-fg-3)]">
                  {p.summary}
                </p>
                <div className="mt-[18px] flex flex-wrap gap-[18px] border-t border-[var(--color-hairline-on-ink-soft)] pt-4 font-mono text-[12px] uppercase tracking-[0.06em] text-[var(--color-ink-fg-3)]">
                  <span>{p.type}</span>
                  <span>{p.year}</span>
                  <span className="text-signal">{p.stack}</span>
                  {p.nda && (
                    <span className="rounded-[1px] border border-[var(--color-hairline-on-ink-strong)] px-[6px] py-[1px] text-[var(--color-ink-fg-4)]">
                      {work.nda.badge}
                    </span>
                  )}
                </div>
              </div>
            </CaseLink>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
