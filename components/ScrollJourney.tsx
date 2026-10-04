"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { motion } from "@/lib/motion";
import { journey } from "@/components/hero/network/journey";

/**
 * Скролл-путешествие «нить из ядра». Один контроллер на страницу, монтируется после всех секций.
 * - десктоп (fine pointer, герой ≤ vh): герой запинен на pinVh; p скролла гонит сцену (journey.setProgress)
 *   и копию героя; в конце дайва из ядра выходит след (сид) до линии кончика;
 * - мобайл / высокий герой: тот же дайв без пина, скрабом за первые diveEnd px скролла (≤ diveVh·vh);
 * - reduced: ни пина, ни скраба — статичная нить, узлы и линии показаны CSS.
 * Закон один: кончик нити всегда на линии tipLine (72 % вьюпорта). Каждая секция рисует свой хребет
 * своим скрабом от «top 72%» до «bottom+tipLen 72%»: триггер длиннее на tipLen, хребет «перебирает» масштаб
 * (перебор режет overflow-clip слоя), кончик уезжает с −tipLen до H → на шве кончик A наполовину вышел,
 * кончик B наполовину вошёл — один кончик, без «пеньков» внизу пройденных секций.
 * Все числа — motion.journey; все чтения DOM — только в measure() (refreshInit).
 */
const J = motion.journey;

// Единственное определение ярусов (зеркалит NETWORK.tiers). coarse — точное дополнение fine,
// поэтому колбэк matchMedia гарантированно срабатывает на любом устройстве.
const MEDIA = {
  fine: "(min-width: 768px) and (hover: hover) and (pointer: fine)",
  coarse: "not all and (min-width: 768px) and (hover: hover) and (pointer: fine)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

type Mode = "rest" | "end"; // где стоит ядро для сида: покой (reduced) / конец дайва
type Node = { el: HTMLElement; line: HTMLElement | null; y: number; lit: boolean; tl: gsap.core.Timeline | null };
type Rec = {
  el: HTMLElement; container: HTMLElement; layer: HTMLElement; spine: HTMLElement; tip: HTMLElement;
  endLeg: HTMLElement | null; endDot: HTMLElement | null; last: boolean;
  H: number; len: number; legW: number; pulseY: number; nodes: Node[];
  tl: gsap.core.Timeline | null; // таймлайн нити секции (для досшивки после refresh)
};

/** Смещение внутри root по цепочке offsetParent — без transform-ов (Reveal y:22 и пин не влияют). */
const offsetWithin = (el: HTMLElement, root: HTMLElement) => {
  let x = 0, y = 0, e: HTMLElement | null = el;
  while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null; }
  return { x, y };
};
const px = (n: number) => `${n}px`;
/** scaleY хребта, при котором нарисованная длина = h + tipLen (перебор клипуется слоем). */
const overshoot = (h: number) => (h > 0 ? (h + J.tipLen) / h : 1);

function buildRecs(): Rec[] {
  const out: Rec[] = [];
  document.querySelectorAll<HTMLElement>("[data-journey-section]").forEach((el) => {
    const layer = el.querySelector<HTMLElement>("[data-thread]");
    const spine = layer?.querySelector<HTMLElement>("[data-thread-spine]");
    const tip = layer?.querySelector<HTMLElement>("[data-thread-tip]");
    const container = layer?.parentElement;
    if (!layer || !spine || !tip || !container) return;
    const last = el.hasAttribute("data-journey-last");
    const nodes: Node[] = Array.from(el.querySelectorAll<HTMLElement>("[data-stitch-node]")).map((n) => ({
      el: n, line: n.parentElement?.querySelector<HTMLElement>("[data-stitch-line]") ?? null, y: 0, lit: false, tl: null,
    }));
    out.push({
      el, container, layer, spine, tip, last, nodes,
      endLeg: last ? el.querySelector<HTMLElement>("[data-thread-end-leg]") : null,
      endDot: last ? el.querySelector<HTMLElement>("[data-thread-end]") : null,
      H: 0, len: 0, legW: 0, pulseY: 0, tl: null,
    });
  });
  return out;
}

function setup(): (() => void) | undefined {
  const root = document.documentElement;
  const hero = document.getElementById("hero");
  const heroWrap = hero?.parentElement ?? null; // [data-hero-pin] — нативный pinSpacer
  const seed = hero?.querySelector<HTMLElement>("[data-seed]") ?? null;
  const copy = hero ? gsap.utils.toArray<HTMLElement>("[data-hero-copy]", hero) : [];
  const heroContainer = copy[0]?.parentElement ?? null;
  const q = (sel: string) => seed?.querySelector<HTMLElement>(sel) ?? null;
  const seedH = q("[data-seed-h]"), seedVA = q("[data-seed-va]"), seedVBW = q("[data-seed-vbw]");
  const seedVB = q("[data-seed-vb]"), seedTip = q("[data-seed-tip]");
  if (!hero || !heroWrap || !seed || !heroContainer || !seedH || !seedVA || !seedVBW || !seedVB || !seedTip) return;
  const recs = buildRecs();
  if (!recs.length) return;

  // ---------- измерение (только здесь читаем DOM) ----------
  const heroRec = { spineX: 0, tipY: 0, vbH: 0, heroH: 0, padB: 0, diveEnd: 0 };
  let measured = false;
  let mode: Mode = "end";
  let pinnedNow = false;

  const measure = (m: Mode, pinned: boolean) => {
    try {
      for (const rec of recs) {
        rec.H = rec.layer.offsetHeight; // = высота Container'а = высота секции
        for (const n of rec.nodes) n.y = offsetWithin(n.el, rec.container).y + n.el.offsetHeight / 2;
        if (rec.last && rec.endDot && rec.endLeg) {
          // вертикаль до пульс-точки, затем горизонталь в неё
          const gutter = parseFloat(getComputedStyle(rec.container).paddingLeft) || 0;
          const pulse = offsetWithin(rec.endDot, rec.container);
          rec.pulseY = pulse.y + rec.endDot.offsetHeight / 2;
          rec.legW = Math.max(0, pulse.x - gutter / 2);
          rec.spine.style.height = px(rec.pulseY);
          rec.endLeg.style.top = px(rec.pulseY);
          rec.endLeg.style.width = px(rec.legW);
          rec.len = rec.pulseY + rec.legW;
        } else {
          rec.len = rec.H + J.tipLen; // длина триггера: хребет + выход кончика из клипа
        }
      }
      // герой: сид от ядра (CSS px секции) к хребту и вниз до линии кончика
      const heroH = hero.offsetHeight, vh = window.innerHeight;
      const headerH = parseFloat(getComputedStyle(root).getPropertyValue("--header-h")) || 0;
      const hcs = getComputedStyle(heroContainer);
      const gutter = parseFloat(hcs.paddingLeft) || 0;
      const padB = parseFloat(hcs.paddingBottom) || 0; // нижний отступ героя — пустота, в «помещается» не считается
      const spineX = heroContainer.offsetLeft + gutter / 2;
      const core = journey.core; // null, пока 3D-чанк не смонтирован → сид скрыт до onLayout
      seed.style.display = core ? "" : "none";
      const c = core ? (m === "rest" ? core.rest : core.end) : { x: spineX, y: 0 };
      // flow: окно дайва (px скролла). Ядро в конце дайва должно остаться видимым под хедером — след покидает
      // его на глазах (на мобайле ядро стоит высоко, за 0.45 vh оно ушло бы под хедер), но не короче diveMinVh;
      // и при p = 1 линия кончика не ниже низа героя — иначе хребет первой секции стартовал бы раньше,
      // чем сид дошёл до неё (дыра на стыке при герое ниже (diveVh + tipLine)·vh, напр. 768×1024)
      const diveMax = J.flow.diveVh * vh;
      const byCore = core ? core.end.y - headerH - J.flow.coreClear * vh : diveMax;
      const diveEnd = Math.max(1, Math.min(diveMax, Math.max(J.flow.diveMinVh * vh, byCore), heroH - J.tipLine * vh));
      const tipY = pinned ? J.tipLine * vh : Math.min(diveEnd + J.tipLine * vh, heroH);
      const vbH = Math.max(0, heroH - tipY);
      Object.assign(seedH.style, { left: px(spineX), top: px(c.y), width: px(Math.max(0, c.x - spineX)) });
      Object.assign(seedVA.style, { left: px(spineX), top: px(c.y), height: px(Math.max(0, tipY - c.y)) });
      Object.assign(seedVBW.style, { left: px(spineX), top: px(tipY), height: px(vbH) });
      Object.assign(heroRec, { spineX, tipY, vbH, heroH, padB, diveEnd });
      measured = true;
    } catch (err) {
      // шапки остаются с CSS-линиями, хребты скрыты
      measured = false;
      root.classList.remove("journey");
      console.error("[ScrollJourney] measure failed", err);
    }
  };
  const onRefreshInit = () => measure(mode, pinnedNow); // до revert/re-apply пинов; все чтения локальны секциям

  // ---------- узлы: вспышка → оседание, подчёркивание из узла; гистерезис ----------
  const arrive = (n: Node) => {
    const tl = gsap.timeline({ paused: true })
      .fromTo(n.el, { scale: 0 }, { scale: J.nodeFlash, duration: motion.dur.micro, ease: motion.ease.out })
      .to(n.el, { scale: 1, duration: motion.dur.short, ease: motion.ease.settle });
    if (n.line) tl.fromTo(n.line, { scaleX: 0 }, { scaleX: 1, duration: motion.dur.slow, ease: motion.ease.settle }, motion.dur.micro);
    return tl;
  };
  const stitch = (rec: Rec, drawn: number) => {
    for (const n of rec.nodes) {
      if (!n.lit && drawn >= n.y) { n.lit = true; n.tl?.play(); }
      else if (n.lit && drawn < n.y - J.nodeHysteresis) { n.lit = false; n.tl?.reverse(); }
    }
  };

  // ---------- дайв героя (общий билдер) ----------
  const dive = (st: ScrollTrigger.Vars) => {
    const proxy = { p: 0 };
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: st });
    // колбэк после сборки: ST может отрендерить таймлайн уже при создании (загрузка с сохранённым скроллом)
    tl.eventCallback("onUpdate", () => journey.setProgress(tl.progress())); // сцена ест СКРАБЛЕННЫЙ прогресс — один источник правды
    tl.to(proxy, { p: 1, duration: 1 }, 0); // длительность 1 → позиции в таймлайне = p
    tl.fromTo(seedH, { scaleX: 0 }, { scaleX: 1, duration: J.seed[1] - J.seed[0] }, J.seed[0]);
    tl.fromTo(seedVA, { scaleY: 0 }, { scaleY: 1, duration: J.seed[2] - J.seed[1] }, J.seed[1]);
    return tl;
  };
  // нога Б: от линии кончика до низа героя — под законом кончика; триггер на tipLen длиннее низа героя,
  // чтобы кончик целиком вышел из клипа (входит в хребет Works с −tipLen — один кончик на шве)
  const legB = (st: ScrollTrigger.Vars) => {
    const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { ...st, scrub: J.scrub.thread, invalidateOnRefresh: true } });
    tl.fromTo(seedVB, { scaleY: 0 }, { scaleY: () => overshoot(heroRec.vbH) }, 0)
      .fromTo(seedTip, { y: -J.tipLen }, { y: () => heroRec.vbH }, 0);
    return tl;
  };
  const pct = J.tipLine * 100;

  /** Десктоп, герой помещается: пин + копия уезжает/гаснет; нога Б — от входа Works снизу до линии кончика. */
  const buildPinned = () => {
    const tl = dive({
      trigger: hero, start: "top top", end: () => "+=" + Math.round(window.innerHeight * J.pinVh),
      pin: true, pinSpacer: heroWrap, pinType: "fixed", anticipatePin: 1, // дефолтный pinSpacing: ST пишет paddingBottom+height на НАШУ обёртку, без репарентинга
      scrub: J.scrub.hero, invalidateOnRefresh: true, refreshPriority: 1, // спейсер раскладывается раньше, чем меряются остальные триггеры
      onToggle: (s) => hero.classList.toggle("is-diving", s.isActive),
    });
    tl.to(copy, {
      y: () => -J.copyRiseVh * window.innerHeight, ease: motion.ease.scene,
      duration: J.copyOut[1] - J.copyOut[0], stagger: J.copyStagger,
    }, J.copyOut[0]);
    tl.to(copy, { autoAlpha: 0, duration: J.copyFade[1] - J.copyFade[0] }, J.copyFade[0]); // visibility:hidden в конце → CTA нефокусируемы
    // позиция Works уже включает спейсер; старт — ровно конец пина (Works top на heroH от верха вьюпорта:
    // = "top bottom", когда герой равен vh, и точен, когда герой выше vh на свой нижний отступ)
    legB({ trigger: recs[0].container, start: () => `top ${heroRec.heroH}px`, end: () => `top+=${J.tipLen} ${pct}%` });
  };

  /** Мобайл / высокий герой: без пина и твинов копии; дайв скрабом за diveEnd; нога Б от героя. */
  const buildFlow = () => {
    dive({
      trigger: hero, start: "top top", end: () => "+=" + Math.round(heroRec.diveEnd),
      scrub: J.scrub.hero, invalidateOnRefresh: true,
    });
    // стартует ровно при scroll = diveEnd (там кончик сида vA = линия кончика). Создаётся всегда:
    // при vbH = 0 слой нулевой высоты невидим, а геометрия перечитывается на refresh (без одноразовых ворот)
    legB({ trigger: hero, start: () => `top+=${heroRec.tipY} ${pct}%`, end: () => `bottom+=${J.tipLen} ${pct}%` });
  };

  // ---------- нити секций ----------
  const sectionThread = (rec: Rec) => {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: rec.container, start: `top ${pct}%`, end: rec.last ? "max" : `bottom+=${J.tipLen} ${pct}%`,
        scrub: J.scrub.thread, invalidateOnRefresh: true,
      },
    });
    tl.eventCallback("onUpdate", () => stitch(rec, rec.len * tl.progress())); // onUpdate таймлайна = скрабленное значение (у ST был бы сырой)
    rec.tl = tl;
    if (!rec.last) {
      // хребет перебирает масштаб на tipLen (режет overflow-clip), кончик уходит до H — целиком из клипа
      tl.fromTo(rec.spine, { scaleY: 0 }, { scaleY: () => overshoot(rec.H) }, 0)
        .fromTo(rec.tip, { y: -J.tipLen }, { y: () => rec.H }, 0);
    } else {
      // вертикаль до пульс-точки, затем горизонталь в неё. Доли считаются при сборке (GSAP не пересчитывает
      // function-based duration в invalidate) → при смене пропорции таймлайн пересобирается на refresh.
      const v = rec.pulseY / rec.len, h = rec.legW / rec.len;
      tl.fromTo(rec.spine, { scaleY: 0 }, { scaleY: 1, duration: v }, 0)
        .fromTo(rec.tip, { y: -J.tipLen }, { y: () => rec.pulseY - J.tipLen, duration: v }, 0)
        .set(rec.tip, { autoAlpha: 0 }, v);
      if (rec.endLeg) tl.fromTo(rec.endLeg, { scaleX: 0 }, { scaleX: 1, duration: h }, v);
    }
    return tl;
  };
  // Внутри refresh (и до первого refresh) ST ставит прогресс скрабленного таймлайна напрямую и с
  // подавлением событий (update: animation.totalProgress(clipped, true)) → onUpdate/stitch не зовётся.
  // Глубокая ссылка (/#contact: прыжок, следом refresh по fonts.ready) или refresh посреди скраба
  // оставляли бы пройденные узлы незажжёнными → досшиваем по фактическому прогрессу после каждого refresh.
  const restitch = () => { for (const rec of recs) if (rec.tl) stitch(rec, rec.len * rec.tl.progress()); };
  const lastSplit = (rec: Rec) => (rec.len > 0 ? rec.pulseY / rec.len : 1);

  /** reduced: статичная нить, сид у ядра в покое, кончики скрыты; узлы/линии показывает CSS. */
  const staticThread = () => {
    gsap.set("[data-thread-spine], [data-seed-h], [data-seed-va], [data-seed-vb]", { scale: 1 });
    gsap.set("[data-thread-tip], [data-seed-tip]", { display: "none" });
    gsap.set("[data-thread-end-leg]", { scaleX: 1 });
  };

  // ---------- ветки ----------
  const mm = gsap.matchMedia();
  let heroCtx: gsap.Context | null = null;
  let lastCore: { x: number; y: number } | null = null;
  const coreMoved = () => {
    const c = journey.core ? (mode === "rest" ? journey.core.rest : journey.core.end) : null;
    const moved = !!c && (!lastCore || Math.abs(c.x - lastCore.x) > 1 || Math.abs(c.y - lastCore.y) > 1);
    lastCore = c;
    return moved;
  };

  mm.add(MEDIA, (ctx) => {
    const { fine, reduced } = ctx.conditions as Record<keyof typeof MEDIA, boolean>;
    // «помещается»: контент героя (без нижнего отступа Container'а) ≤ vh + fitSlack
    const fits = () => hero.offsetHeight - heroRec.padB <= window.innerHeight + J.fitSlack;
    // контекст собирается с нуля (вход / смена яруса / reduced): таймлайны узлов ревертнуты (scale 0 из CSS),
    // поэтому и флаги «зажжён» сбрасываем — иначе первый stitch() не зажёг бы уже пройденные узлы
    for (const rec of recs) for (const n of rec.nodes) { n.lit = false; n.tl = null; }
    mode = reduced ? "rest" : "end";
    measure(mode, false); // первый замер: нужен padB для fits(); пин ещё не создан
    if (!measured) return;
    pinnedNow = !reduced && fine && fits();
    if (pinnedNow) measure(mode, true); // линия кончика в герое зависит от ветки
    root.classList.add("journey");
    coreMoved();
    // ядро пришло (чанк смонтирован) или сдвинулось > 1 px → перемерить сид
    const offLayout = journey.onLayout(() => { if (coreMoved()) ScrollTrigger.refresh(); });

    if (reduced) {
      staticThread();
      return () => { offLayout(); root.classList.remove("journey"); };
    }

    const buildHero = () => {
      heroCtx?.revert();
      hero.classList.remove("is-diving"); // revert убивает пин без onToggle(false) → снять will-change с копии
      pinnedNow = fine && fits();
      heroCtx = gsap.context(() => (pinnedNow ? buildPinned() : buildFlow()));
    };
    let lastCtx: gsap.Context | null = null;
    let lastRatio = 0;
    const buildLast = (rec: Rec) => {
      lastCtx?.revert();
      lastRatio = lastSplit(rec);
      lastCtx = gsap.context(() => { sectionThread(rec); });
    };
    buildHero();
    for (const rec of recs) {
      for (const n of rec.nodes) n.tl = arrive(n);
      if (rec.last) buildLast(rec); else sectionThread(rec);
    }
    const last = recs.find((r) => r.last);

    const onRefresh = () => {
      let rebuilt = false;
      if ((fine && fits()) !== pinnedNow) { buildHero(); rebuilt = true; } // вьюпорт стал ниже героя → снимаем пин, и обратно
      if (last && Math.abs(lastSplit(last) - lastRatio) > 0.005) { buildLast(last); rebuilt = true; }
      if (rebuilt) ScrollTrigger.refresh(); // остальные триггеры должны перемериться с новым спейсером/таймлайном
      else restitch();
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);

    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      offLayout();
      heroCtx?.revert(); heroCtx = null;
      lastCtx?.revert(); lastCtx = null;
      for (const rec of recs) rec.tl = null;
      hero.classList.remove("is-diving");
      root.classList.remove("journey");
    };
  });
  ScrollTrigger.addEventListener("refreshInit", onRefreshInit);

  return () => {
    ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
    mm.revert(); // убивает пин: ST возвращает inline-состояние обёртки и секции, DOM не двигался → React-размонтирование безопасно
    root.classList.remove("journey");
  };
}

export default function ScrollJourney() {
  useEffect(() => setup(), []);
  return null;
}
