"use client";

import dynamic from "next/dynamic";

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
 * Слой живой сети в герое. pointer-events:none — канвас не перехватывает скролл
 * и клики по CTA; курсор сеть слушает на window, так что взаимодействие сохраняется.
 */
export default function HeroNetwork() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <LivingNetwork />
    </div>
  );
}
