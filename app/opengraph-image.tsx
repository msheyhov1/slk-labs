import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { hero } from "@/lib/content/hero";

// OG-карточка главной: ink-поверхность, костяной текст, сигнальный зелёный только как свет.
export const dynamic = "force-static"; // статический экспорт (GitHub Pages)
export const alt = site.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#14171A",
          color: "#F2F0E9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, background: "#00E08A", borderRadius: 2 }} />
            <span>
              SLK<span style={{ color: "rgba(242,240,233,0.55)" }}>-labs</span>
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#00E08A", letterSpacing: 2 }}>
            <div style={{ width: 10, height: 10, background: "#00E08A", borderRadius: 999 }} />
            LIVE
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 84, fontWeight: 600, lineHeight: 1.02, letterSpacing: -2, maxWidth: 1000 }}>
            {hero.title}
          </div>
          <div style={{ fontSize: 30, color: "rgba(242,240,233,0.72)" }}>{hero.descriptor}</div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(218,214,204,0.18)",
            paddingTop: 24,
            fontSize: 20,
            color: "rgba(242,240,233,0.55)",
            letterSpacing: 2,
          }}
        >
          <span>{hero.eyebrow.toUpperCase()}</span>
          <span>{site.url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    ),
    size,
  );
}
