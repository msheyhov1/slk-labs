import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { MonoLabel } from "@/components/ui/MonoLabel";
import { work } from "@/lib/content/work";

export const metadata: Metadata = { title: work.notFound.title };

export default function NotFound() {
  return (
    <main id="top">
      <section data-surface="bone" className="bg-bone">
        <Container className="py-[clamp(96px,16vw,200px)]">
          <MonoLabel tone="signal-ink">{work.notFound.index}</MonoLabel>
          <h1 className="mt-[18px] text-h1 font-semibold leading-[1.02] tracking-display text-ink">{work.notFound.title}</h1>
          <p className="mt-6 max-w-[var(--container-text)] text-lead leading-body text-ink-2">{work.notFound.lead}</p>
          <Link href="/" className="mt-10 inline-flex items-center gap-[10px] rounded-sm border border-hairline px-6 py-[14px] text-base font-medium text-ink no-underline transition-colors duration-[var(--dur-micro)] ease-standard hover:border-ink">
            {work.notFound.home}
          </Link>
        </Container>
      </section>
    </main>
  );
}
