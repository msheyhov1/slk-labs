"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { journey } from "./network/journey";

/** Статичный слот под живую сеть: тихая структура, пока грузится WebGL. */
function NetPlaceholder() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 90% at 70% 30%, rgb(var(--color-signal-rgb) / 0.05), transparent 60%)",
      }}
    />
  );
}

// Один WebGL-момент: грузим только на клиенте, лениво, после интерактива.
const LivingNetwork = dynamic(() => import("./network/LivingNetwork"), {
  ssr: false,
  loading: () => <NetPlaceholder />,
});

/**
 * Слой живой сети в герое. pointer-events:none — канвас не перехватывает скролл и клики по CTA;
 * курсор сеть слушает на window. WebGL-контекст создаётся только когда герой впервые
 * на экране (IntersectionObserver); вне экрана сцена ставится на паузу (frameloop 'demand').
 */
export default function HeroNetwork() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]; // IO может отдать пачку [ушёл, вернулся] — актуально последнее
        journey.visible = e.isIntersecting;
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setMounted(true);
      },
      { rootMargin: "80px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0">
      {mounted ? <LivingNetwork visible={visible} /> : <NetPlaceholder />}
    </div>
  );
}
