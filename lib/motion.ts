// GSAP-карта моушна. Зеркалит CSS-токены (tokens.css §Motion) —
// CSS и GSAP двигаются одинаково, второй правды нет.
export const motion = {
  dur: { micro: 0.15, short: 0.3, base: 0.6, slow: 0.9, scene: 1.2, grow: 1.9 },
  stagger: 0.06,
  ease: {
    out: "power2.out",
    settle: "settle", // CustomEase «оседание» = cubic-bezier(0.16,1,0.3,1)
    scene: "scene", //  = cubic-bezier(0.83,0,0.17,1)
    standard: "power1.inOut",
  },
  // Скролл-путешествие «нить из ядра» (ScrollJourney). p-единицы = прогресс дайва 0..1.
  journey: {
    pinVh: 0.8, // пин героя (десктоп, fine pointer, герой ≤ vh)
    // без пина (мобайл / высокий герой): сцена проходит путь за ≤ diveVh vh скролла; окно короче, если ядро
    // в конце дайва ушло бы под хедер (остаётся ≥ coreClear·vh под ним), но не короче diveMinVh;
    // и не длиннее heroH − tipLine·vh (кончик сида встречает хребет первой секции без дыры)
    flow: { diveVh: 0.45, diveMinVh: 0.2, coreClear: 0.06 },
    scrub: { hero: 0.6, thread: 0.5 },
    copyOut: [0, 0.6], copyFade: [0.25, 0.55], copyRiseVh: 0.28, copyStagger: 0.04, // p-единицы
    seed: [0.82, 0.9, 1], // p: горизонтальная ветка → вертикальная до линии кончика
    tipLine: 0.72, // кончик нити всегда на 72 % вьюпорта
    tipLen: 56, // = --thread-tip-len
    nodeHysteresis: 8, // px: узел гаснет только на 8 px раньше, чем зажёгся
    fitSlack: 8, // px: герой считается «помещается», если ≤ vh + 8
    nodeFlash: 1.35, // scale всплеска узла (ховер карточек — тот же множитель в CSS)
  },
} as const;
