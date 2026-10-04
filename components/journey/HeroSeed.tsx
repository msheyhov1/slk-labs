/**
 * Сид нити в герое (серверный): след, который покидает ядро в конце дайва —
 * горизонталь к гаттеру (h), вертикаль до линии кончика (vA), затем клипнутый столбик с кончиком
 * до низа героя (vB, «нога Б»). Вся геометрия (left/top/width/height) пишется ScrollJourney на measure
 * из journey.core — единственная JS-позиционируемая часть нити.
 */
export function HeroSeed() {
  return (
    <div data-seed aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-clip">
      <i data-seed-h className="thread-seed-h absolute h-px origin-right will-change-transform" />
      <i data-seed-va className="absolute w-px origin-top bg-[var(--thread)] will-change-transform" />
      <div data-seed-vbw className="absolute w-px overflow-clip">
        <i data-seed-vb className="absolute inset-x-0 top-0 h-full origin-top bg-[var(--thread)] will-change-transform" />
        <i data-seed-tip className="thread-tip absolute inset-x-0 top-0 h-[var(--thread-tip-len)] will-change-transform" />
      </div>
    </div>
  );
}
