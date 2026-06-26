// GLSL для узлов сети: круглый мягкий диск + зелёное гало по «жару» (vHeat).
// uBase/uSignal — цвета из config; uDpr — devicePixelRatio для размера точки.

export const NODE_VERT = /* glsl */ `
  attribute float aHeat;
  attribute float aSize;
  varying float vHeat;
  uniform float uDpr;
  void main() {
    vHeat = aHeat;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + vHeat * 2.4) * uDpr * (10.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const NODE_FRAG = /* glsl */ `
  precision mediump float;
  varying float vHeat;
  uniform vec3 uBase;
  uniform vec3 uSignal;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = smoothstep(0.5, 0.12, d);
    vec3 col = mix(uBase, uSignal, vHeat);
    col += uSignal * glow * vHeat * 0.8;
    float a = mix(0.45, 1.0, vHeat) * core;
    gl_FragColor = vec4(col, a);
  }
`;
