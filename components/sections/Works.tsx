import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/Reveal";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { cases } from "@/lib/cases";

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
            2024 — 2025 / {String(cases.length).padStart(2, "0")} записи
          </span>
        </SectionHead>

        <Reveal
          stagger
          className="mt-px grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-px border border-[var(--color-hairline-on-ink-soft)] bg-[var(--color-hairline-on-ink-soft)]"
        >
          {cases.map((c) => (
            <a
              key={c.slug}
              data-reveal
              href="#contact"
              aria-label={`Кейс ${c.title} — ${c.sub}`}
              className="flex flex-col bg-ink no-underline transition-colors duration-[var(--dur-short)] ease-standard hover:bg-ink-soft"
            >
              <div className="diagonal-hatch relative flex aspect-[16/10] items-end overflow-hidden p-[18px]">
                <span className="absolute left-[18px] top-[18px] font-mono text-[12px] tracking-[0.06em] text-signal">
                  {c.idx}
                </span>
                {/* узел карточки: ховер зажигает (CSS [data-node]) */}
                <span
                  aria-hidden
                  data-node
                  className="absolute right-[18px] top-[18px] h-[var(--node-size)] w-[var(--node-size)] rounded-[1px] bg-signal signal-glow"
                />
                <span className="font-mono text-[11px] uppercase tracking-label text-[var(--color-ink-fg-4)]">
                  [ превью проекта ]
                </span>
              </div>
              <div className="px-[clamp(20px,2.4vw,28px)] pb-7 pt-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="m-0 text-[1.5rem] font-semibold tracking-tight text-[var(--color-ink-fg)]">
                    {c.title}
                  </h3>
                  <span className="text-base text-ink-2">{c.sub}</span>
                </div>
                <p className="mt-3 max-w-[40ch] text-small leading-body text-[var(--color-ink-fg-3)]">
                  {c.summary}
                </p>
                <div className="mt-[18px] flex flex-wrap gap-[18px] border-t border-[var(--color-hairline-on-ink-soft)] pt-4 font-mono text-[12px] uppercase tracking-[0.06em] text-[var(--color-ink-fg-3)]">
                  <span>{c.type}</span>
                  <span>{c.year}</span>
                  <span className="text-signal">{c.stack}</span>
                </div>
              </div>
            </a>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
