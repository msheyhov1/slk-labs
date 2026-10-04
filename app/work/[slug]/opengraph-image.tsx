import { ImageResponse } from "next/og";
import { blueprint, blueprintSvg, PALETTE } from "@/lib/blueprint";
import { getCase, listed, present } from "@/lib/cases";
import { site } from "@/lib/site";
import { work } from "@/lib/content/work";

// OG-плашка кейса: слева копия, справа тот же чертёж, что на обложке (один seed).
export const dynamic = "force-static"; // обязательно под output: "export"
export const alt = "Кейс SLK-labs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export function generateStaticParams() {
  return listed().map(({ slug }) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCase(slug);
  const p = present(c ?? listed()[0]);
  const svg = blueprintSvg(blueprint(p.preset, p.seed, "cover"));
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: PALETTE.ink, color: PALETTE.bone, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, padding: 64 }}>
          <div style={{ display: "flex", gap: 16, fontSize: 22, color: PALETTE.signal, letterSpacing: 2 }}>
            {p.idx} · {p.type.toUpperCase()}{p.nda ? ` · ${work.nda.badge}` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 58, lineHeight: 1.05, fontWeight: 600, letterSpacing: -1 }}>{p.title}</div>
            <div style={{ fontSize: 26, marginTop: 18, color: "rgba(242,240,233,0.72)" }}>{p.og.tagline}</div>
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "rgba(242,240,233,0.55)" }}>{site.name} — Сайты. Боты. Автоматизация.</div>
        </div>
        <div style={{ display: "flex", width: 600, height: 630, background: PALETTE.inkDeep, borderLeft: "1px solid rgba(218,214,204,0.16)" }}>
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={600} height={630} alt="" />
        </div>
      </div>
    ),
    size,
  );
}
