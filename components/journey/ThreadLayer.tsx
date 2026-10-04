/**
 * Слой нити секции (серверный, без JS): 1-px хребет + кончик в клипнутом столбике посреди левого гаттера,
 * для последней секции — горизонтальная «ножка» в пульс-точку футера (её top/width пишет ScrollJourney).
 * Ставится ПЕРВЫМ ребёнком Container'а (Container должен быть relative и нести py секции):
 * left = gutter/2 от padding-box → та же x, что у узлов (.stitch-node) и сида в герое.
 */
export function ThreadLayer({ end = false }: { end?: boolean }) {
  return (
    <>
      <div
        data-thread
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-[calc(var(--gutter)/2)] w-px overflow-clip"
      >
        <i data-thread-spine className="absolute inset-x-0 top-0 h-full origin-top bg-[var(--thread)] will-change-transform" />
        <i data-thread-tip className="thread-tip absolute inset-x-0 top-0 h-[var(--thread-tip-len)] will-change-transform" />
      </div>
      {end && (
        <i
          data-thread-end-leg
          aria-hidden
          className="pointer-events-none absolute left-[calc(var(--gutter)/2)] top-0 h-px w-0 origin-left bg-[var(--thread)] will-change-transform"
        />
      )}
    </>
  );
}
