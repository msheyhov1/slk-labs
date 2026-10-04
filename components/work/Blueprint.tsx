import { blueprint, type View } from "@/lib/blueprint";
import type { Preset } from "@/lib/cases";

/** Чертёж кейса (серверный SVG). Роли линий → CSS .bp [data-bp] (globals.css). */
export function Blueprint({ preset, seed, view = "cover", className = "" }: { preset: Preset; seed: number; view?: View; className?: string }) {
  const bp = blueprint(preset, seed, view);
  const zoom = view === "detail-a" ? `translate(${bp.focus.x} ${bp.focus.y}) scale(2.2) translate(${-bp.focus.x} ${-bp.focus.y})` : undefined;
  return (
    <svg className={`bp ${className}`} viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <g transform={zoom}>
        {bp.paths.filter((p) => p.role !== "lit").map((p, i) => <path key={i} d={p.d} data-bp={p.role} />)}
        {bp.paths.filter((p) => p.role === "lit").map((p, i) => (
          <g key={`l${i}`}>
            <path d={p.d} data-bp="base" />
            <path d={p.d} data-bp="lit" pathLength={1} />
          </g>
        ))}
        {bp.nodes.map((n, i) => <rect key={`n${i}`} x={n.x - 2} y={n.y - 2} width={4} height={4} data-bp={n.lit ? "lit-node" : "node"} />)}
      </g>
    </svg>
  );
}
