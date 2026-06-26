import { Container } from "@/components/ui/Container";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Button } from "@/components/ui/Button";
import { hero } from "@/lib/content/hero";
import HeroNetwork from "./HeroNetwork";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-ink text-[var(--color-ink-fg)]"
    >
      <HeroNetwork />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 70% 30%, rgb(var(--color-signal-rgb) / 0.06), transparent 60%)",
        }}
      />

      <Container className="relative z-[2] py-[120px] pt-[136px]">
        <div className="mb-10 flex items-center justify-between gap-6 border-b border-[var(--color-hairline-on-ink)] pb-7">
          <MonoLabel tone="fg-3">{hero.eyebrow}</MonoLabel>
          <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[13px] tracking-[0.06em] text-signal">
            <span className="signal-glow h-[6px] w-[6px] rounded-full bg-signal" />
            {hero.status}
          </span>
        </div>

        <h1 className="m-0 max-w-[16ch] text-[clamp(2.6rem,7vw,7rem)] font-semibold leading-[1.0] tracking-display">
          {hero.title}
        </h1>

        <p className="mt-8 max-w-[42rem] text-lead leading-body text-[var(--color-ink-fg-2)]">
          {hero.lead}
          <span className="text-[var(--color-ink-fg-3)]"> {hero.descriptor}</span>
        </p>

        <div className="mt-10 flex flex-wrap gap-[14px]">
          <Button variant="signal" href={hero.actions.primary.href}>
            {hero.actions.primary.label} <span aria-hidden>→</span>
          </Button>
          <Button variant="ghostDark" href={hero.actions.secondary.href}>
            {hero.actions.secondary.label}
          </Button>
        </div>

        <dl className="mt-20 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px border border-[var(--color-hairline-on-ink-soft)] bg-[var(--color-hairline-on-ink-soft)]">
          {hero.specs.map((s) => (
            <div key={s.label} className="m-0 bg-ink px-[18px] py-4">
              <dt className="font-mono text-[11px] uppercase tracking-label text-ink-2">{s.label}</dt>
              <dd
                className={`m-0 mt-[6px] font-mono text-[14px] ${
                  "signal" in s && s.signal ? "text-signal" : "text-[var(--color-ink-fg)]"
                }`}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
