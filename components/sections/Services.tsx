import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { Reveal } from "@/components/Reveal";
import { services, servicesIntro } from "@/lib/content/services";

export function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="bg-bone py-[clamp(72px,10vw,128px)]"
    >
      <Container>
        <SectionHead index={servicesIntro.index} title={servicesIntro.title} titleId="services-title">
          <p className="m-0 max-w-[30rem] text-body leading-body text-ink-2">{servicesIntro.note}</p>
        </SectionHead>

        <Reveal
          stagger
          className="mt-px grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-px border border-hairline bg-hairline"
        >
          {services.map((s) => (
            <article
              key={s.n}
              data-reveal
              className="flex flex-col gap-4 bg-bone p-[clamp(28px,3vw,40px)] transition-colors duration-[var(--dur-short)] ease-standard hover:bg-bone-sunken"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[13px] tracking-[0.06em] text-ink-2">{s.n}</span>
                <span aria-hidden className="h-[7px] w-[7px] rounded-[1px] bg-signal-ink" />
              </div>
              <h3 className="m-0 text-[1.4rem] font-semibold leading-[1.15] tracking-tight text-ink">
                {s.title}
              </h3>
              <p className="m-0 flex-1 text-body leading-body text-ink-2">{s.desc}</p>
              <div className="border-t border-hairline pt-4 font-mono text-[12px] uppercase tracking-[0.06em] text-signal-ink">
                {s.tag}
              </div>
            </article>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
