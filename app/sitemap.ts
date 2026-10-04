import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listed } from "@/lib/cases";
import { caseHref } from "@/lib/paths";

export const dynamic = "force-static"; // статический экспорт (GitHub Pages)

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${site.url}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    ...listed().map((c) => ({ url: `${site.url}${caseHref(c.slug)}`, lastModified, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
