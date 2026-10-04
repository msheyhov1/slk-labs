// GLSL «Ядра». Узлы и пыль — один Points-draw (kind в aMeta.y). Ядро — тёмное тело с зелёным
// френелем и шумом вершин. Гало — аддитивный диск. Хабы — инъекция в MeshStandardMaterial
// (зелёный только как emissive от жара). Цвета приходят linear (THREE.Color из hex).
// В конце фрагментов — <colorspace_fragment>: при рендере в HalfFloat-буфер композера это no-op,
// при прямом рендере на экран (мобайл, без композера) даёт тот же sRGB-трансфер, что OutputPass.

export const NODE_VERT = /* glsl */ `
  attribute float aHeat; attribute float aGrow; attribute float aShade; attribute vec4 aMeta;
  uniform float uDpr, uRefZ, uCenterZ, uDepthRange, uFadeMin, uMaxSize, uTime, uFront, uHeatSize, uDustSize;
  varying float vHeat, vFade, vAlphaMul, vKind;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = -mv.z;
    vFade = mix(1.0, uFadeMin, smoothstep(uCenterZ - uDepthRange, uCenterZ + uDepthRange, depth));
    vKind = aMeta.y;
    float att = uRefZ / max(depth, 0.1);
    if (aMeta.y < 0.5) {
      vHeat = aHeat; vAlphaMul = aGrow * aShade;
      gl_PointSize = min(aMeta.x * (1.0 + aHeat * uHeatSize) * aGrow * uDpr * att, uMaxSize * uDpr);
    } else {
      vHeat = 0.0;
      // пыль: «вечная» дышит, остальная гаснет, когда фронт роста проходит её радиус
      float vis = aMeta.z > 1.5 ? 0.6 * (0.5 + 0.5 * sin(uTime * 0.6 + aMeta.w))
                                : 1.0 - smoothstep(aMeta.z - 0.06, aMeta.z + 0.06, uFront);
      vAlphaMul = vis;
      gl_PointSize = uDustSize * uDpr * att;
    }
    gl_Position = projectionMatrix * mv;
  }
`;

export const NODE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uBase, uSignal; uniform float uGlowGain, uIntensity, uDustAlpha, uBaseMul; uniform vec2 uAlpha;
  varying float vHeat, vFade, vAlphaMul, vKind;
  void main() {
    vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
    float disc = smoothstep(0.5, 0.08, d);
    vec4 outc;
    if (vKind > 0.5) {
      outc = vec4(uBase, uDustAlpha * disc * vFade * vAlphaMul * uIntensity);
    } else {
      float glow = smoothstep(0.5, 0.15, d);
      vec3 col = mix(uBase * uBaseMul, uSignal, vHeat) + uSignal * glow * vHeat * vHeat * uGlowGain; // HDR > 1 → bloom
      float a = mix(uAlpha.x, uAlpha.y, vHeat) * disc * vFade * vAlphaMul * uIntensity;
      outc = vec4(col, a);
    }
    gl_FragColor = outc;
    #include <colorspace_fragment>
  }
`;

export const CORE_VERT = /* glsl */ `
  uniform float uTime, uNoiseAmp, uNoiseFreq, uNoiseSpeed; varying vec3 vN, vV;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
  void main(){
    float n = vnoise(position * uNoiseFreq + uTime * uNoiseSpeed) * 2.0 - 1.0;
    vec4 mv = modelViewMatrix * vec4(position + normal * n * uNoiseAmp, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const CORE_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uBody, uBase, uSignal; uniform float uRimPow, uRimGain, uPulse; varying vec3 vN, vV;
  void main(){
    float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uRimPow);
    gl_FragColor = vec4(uBody + uSignal * (rim * uRimGain + uPulse * 0.12) + uBase * rim * 0.15, 1.0);
    #include <colorspace_fragment>
  }
`;

export const HALO_VERT = /* glsl */ `
  varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export const HALO_FRAG = /* glsl */ `
  precision mediump float; uniform vec3 uSignal; uniform float uHalo; varying vec2 vUv;
  void main(){
    float r = min(length(vUv - 0.5) * 2.0, 1.0);
    gl_FragColor = vec4(uSignal, pow(1.0 - r, 3.0) * uHalo);
    #include <colorspace_fragment>
  }
`;

// Инъекции в MeshStandardMaterial хабов (onBeforeCompile). Точки: vertex <common> → DECL,
// <begin_vertex> → BODY; fragment <common> → DECL, <emissivemap_fragment> → BODY (three 0.185).
export const HUB_VERT_DECL = "attribute float aHeat;\nvarying float vHeat;";
export const HUB_VERT_BODY = "vHeat = aHeat;";
export const HUB_FRAG_DECL = "uniform vec3 uSignal;\nuniform float uHubEmissive;\nvarying float vHeat;";
// квадрат по жару: тёплый пульс (0.2–0.45) почти не зеленит бусину, пакет/наведение (≥0.8) — зажигает
export const HUB_FRAG_BODY = "totalEmissiveRadiance += uSignal * vHeat * vHeat * uHubEmissive;";
