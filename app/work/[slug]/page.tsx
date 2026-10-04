import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCase, listed, neighbors, present } from "@/lib/cases";
import { caseHref } from "@/lib/paths";
import { site } from "@/lib/site";
import { work } from "@/lib/content/work";
import { CaseHero } from "@/components/work/CaseHero";
import { CaseBody } from "@/components/work/CaseBody";
import { NextRoom } from "@/components/work/NextRoom";
import { Contact } from "@/components/sections/Contact";
import ScrollJourney from "@/components/ScrollJourney";

// Статический экспорт: все маршруты известны при сборке, остальные — 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return listed().map(({ slug }) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) return {};
  const p = present(c);
  return {
    title: `${p.title} — ${work.titleSuffix}`,
    description: p.summary,
    alternates: { canonical: caseHref(slug) },
    openGraph: { type: "article", locale: site.locale, siteName: site.name, url: caseHref(slug), title: p.title, description: p.og.tagline },
    twitter: { card: "summary_large_image", title: p.title, description: p.og.tagline },
  };
}

export default async function CasePage({ params }: Props) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) notFound();
  const p = present(c);
  const { next } = neighbors(slug);
  const n = next ? present(next) : null;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        name: p.title,
        description: p.summary,
        url: `${site.url}${caseHref(slug)}`,
        dateCreated: p.year,
        creator: { "@type": "Organization", name: site.name, url: site.url },
        ...(p.meta.client ? { sourceOrganization: { "@type": "Organization", name: p.meta.client } } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: work.crumbs.home, item: `${site.url}/` },
          { "@type": "ListItem", position: 2, name: work.crumbs.works, item: `${site.url}/#works` },
          { "@type": "ListItem", position: 3, name: p.title, item: `${site.url}${caseHref(slug)}` },
        ],
      },
    ],
  };
  return (
    <>
      <main id="top">
        <CaseHero p={p} />
        <CaseBody p={p} />
        {n && <NextRoom p={n} />}
      </main>
      <Contact />
      <ScrollJourney />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </>
  );
}
