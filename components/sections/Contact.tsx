import { MonoLabel } from "@/components/ui/MonoLabel";
import { Reveal } from "@/components/Reveal";
import { contact } from "@/lib/content/contact";

export function Contact() {
  return (
    <footer
      id="contact"
      aria-labelledby="contact-title"
      className="bg-bone px-[var(--gutter)] py-[clamp(72px,10vw,128px)] pb-12"
    >
      <div className="mx-auto w-full max-w-[var(--container-max)]">
        <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-end gap-[clamp(40px,6vw,96px)] border-b border-hairline pb-16">
          <div>
            <MonoLabel tone="signal-ink">{contact.index}</MonoLabel>
            <h2
              id="contact-title"
              className="mt-[18px] text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-[1.02] tracking-display text-ink"
            >
              {contact.titleLines[0]}
              <br />
              {contact.titleLines[1]}
            </h2>
          </div>

          <div className="flex flex-col gap-[18px]">
            <a
              href={contact.cta.href}
              className="flex items-center justify-between gap-4 rounded-sm bg-ink px-[22px] py-[18px] text-[1.15rem] font-medium text-[var(--color-ink-fg)] no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:bg-[var(--color-ink-deep)]"
            >
              {contact.cta.label} <span className="text-signal">→</span>
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="font-mono text-[15px] tracking-[0.04em] text-ink-2 no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:text-signal-ink"
            >
              {contact.email}
            </a>
            <div className="flex flex-wrap gap-5 font-mono text-[13px] uppercase tracking-[0.06em] text-ink-2">
              <a
                href={contact.telegram.href}
                rel="noopener"
                className="no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:text-signal-ink"
              >
                {contact.telegram.label}
              </a>
              <span>{contact.location}</span>
            </div>
          </div>
        </Reveal>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-7">
          <div className="flex items-center gap-[10px] font-mono text-[12px] tracking-[0.06em] text-ink-2">
            <span aria-hidden className="slk-pulse h-2 w-2 rounded-[1px] bg-signal-ink" />
            <span>{contact.legal}</span>
          </div>
          <span className="font-mono text-[12px] tracking-[0.06em] text-ink-2">{contact.stack}</span>
        </div>
      </div>
    </footer>
  );
}
