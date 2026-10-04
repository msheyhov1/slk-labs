// Крошечный мутируемый стор без three: прогресс скролла (пишет ScrollTrigger позже),
// видимость (IntersectionObserver в HeroNetwork), флаг сборки. Единственный файл сети,
// который импортирует главный бандл (~0.3 KB).
export const journey = {
  progress: 0, // 0..1 — пишется снаружи, читается только в useFrame
  visible: true, // пишет IntersectionObserver в HeroNetwork
  assembled: false, // переключается при simTime ≥ growth.assembledAt (2.0 с)
  quality: 2 as 0 | 1 | 2,
  _invalidate: null as null | (() => void), // ставит сцена; нужен при frameloop 'demand'
  _resolvers: [] as Array<() => void>,
  // проекция ядра в CSS px канваса героя (= секции): rest — p = 0, end — p = 1 (пишет LivingNetwork на layout)
  core: null as null | { rest: { x: number; y: number }; end: { x: number; y: number } },
  _layout: [] as Array<() => void>,
  setProgress(p: number) {
    journey.progress = Math.min(1, Math.max(0, p));
    journey._invalidate?.();
  },
  onAssembled(): Promise<void> {
    return journey.assembled ? Promise.resolve() : new Promise((r) => journey._resolvers.push(r));
  },
  /** Подписка на перерасчёт core (resize канваса / монтирование сцены). Возвращает отписку. */
  onLayout(fn: () => void) {
    journey._layout.push(fn);
    return () => { journey._layout = journey._layout.filter((f) => f !== fn); };
  },
  emitLayout() { journey._layout.forEach((f) => f()); },
};
