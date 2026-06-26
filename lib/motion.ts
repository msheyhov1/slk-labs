// GSAP-карта моушна. Зеркалит CSS-токены (tokens.css §Motion) —
// CSS и GSAP двигаются одинаково, второй правды нет.
export const motion = {
  dur: { micro: 0.15, short: 0.3, base: 0.6, slow: 0.9, scene: 1.2 },
  stagger: 0.06,
  ease: {
    out: "power2.out",
    settle: "settle", // CustomEase «оседание» = cubic-bezier(0.16,1,0.3,1)
    scene: "scene", //  = cubic-bezier(0.83,0,0.17,1)
    standard: "power1.inOut",
  },
} as const;
