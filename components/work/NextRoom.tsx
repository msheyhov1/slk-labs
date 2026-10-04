import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { Reveal } from "@/components/Reveal";
import { ThreadLayer } from "@/components/journey/ThreadLayer";
import { CoverMedia } from "./CoverMedia";
import { CoverChrome } from "./CoverChrome";
import { CaseLink } from "./CaseLink";
import type { Presented } from "@/lib/cases";
import { work } from "@/lib/content/work";

/** «Следующая комната»: тёмная секция с обложкой соседнего кейса. */
export function NextRoom({ p }: { p: Presented }) {
  return (
    <section id="case-next" data-journey-section data-surface="dark" className="bg-ink text-[var(--color-ink-fg)]">
      <Container className="relative py-[clamp(56px,8vw,96px)]">
        <ThreadLayer />
        <SectionHead index={work.next} title={p.title} tone="dark">
          <MonoLabel tone="fg-3">{p.idx}</MonoLabel>
        </SectionHead>
        <Reveal className="mt-8 grid gap-8 lg:grid-cols-12">
          <CaseLink slug={p.slug} ariaLabel={work.aria.card(p.title, p.sub)} className="group block no-underline lg:col-span-7">
            <CoverMedia media={p.cover} preset={p.preset} seed={p.seed} chrome={<CoverChrome p={p} />} />
          </CaseLink>
          <div className="flex flex-col justify-end gap-6 lg:col-span-5">
            <p className="m-0 text-body leading-body text-[var(--color-ink-fg-3)]">{p.summary}</p>
            <Link href="/#works" className="inline-flex w-fit items-center gap-[10px] rounded-sm border border-[var(--color-hairline-on-ink-strong)] px-6 py-[14px] text-base font-medium text-[var(--color-ink-fg)] no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:border-[var(--color-ink-fg)]">
              {work.back}
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
