/** Value-noise + fbm (та же конструкция, что в GLSL ядра). Чистые функции без зависимостей. */
const fract = (x: number) => x - Math.floor(x);
const hash = (ix: number, iy: number, iz: number) =>
  fract(Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7) * 43758.5453);
const sm = (f: number) => f * f * (3 - 2 * f);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const c00 = mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx);
  const c10 = mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx);
  const c01 = mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx);
  const c11 = mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx);
  return mix(mix(c00, c10, fy), mix(c01, c11, fy), fz);
}
/** [-1, 1] */
export function fbm3(x: number, y: number, z: number): number {
  const n = (vnoise(x, y, z) + 0.5 * vnoise(2 * x, 2 * y, 2 * z) + 0.25 * vnoise(4 * x, 4 * y, 4 * z)) / 1.75;
  return n * 2 - 1;
}
