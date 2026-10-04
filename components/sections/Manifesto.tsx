import { Container } from "@/components/ui/Container";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { KineticText } from "@/components/KineticText";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { manifesto } from "@/lib/content/manifesto";

export function Manifesto() {
  return (
    <section
      id="manifesto"
      aria-labelledby="manifesto-title"
      data-journey-section
      data-surface="bone"
      className="bg-bone"
    >
      <Container className="relative py-[clamp(96px,14vw,180px)]">
        <ThreadLayer />
        <div className="relative">
          {/* полная ширина контента → узел ряда ложится на x хребта */}
          <i aria-hidden data-stitch-node className="stitch-node stitch-node--row" />
          <div className="mx-auto max-w-[64rem]">
            <MonoLabel tone="signal-ink">{manifesto.index}</MonoLabel>
          </div>
        </div>
        <div className="mx-auto max-w-[64rem]">
          <KineticText
            as="h2"
            className="mt-7 text-[clamp(1.9rem,4.4vw,3.6rem)] font-semibold leading-tight tracking-tight text-ink"
            text={manifesto.body}
          />

          <KineticText
            as="p"
            className="mt-10 text-[clamp(1.9rem,4.4vw,3.6rem)] font-semibold leading-tight tracking-tight text-signal-ink"
            text={manifesto.payoff}
            start="top 88%"
          />
        </div>
      </Container>
      <span id="manifesto-title" className="sr-only">
        Манифест — {manifesto.payoff}
      </span>
    </section>
  );
}
