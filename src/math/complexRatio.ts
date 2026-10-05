import { Complex } from '../complex/Complex.js';

/** Finite complex quotient without squaring the denominator or overflowing its sum. */
export function complexRatio(nr: number, ni: number, dr: number, di: number): Complex | undefined {
  const scale = Math.max(Math.abs(nr), Math.abs(ni), Math.abs(dr), Math.abs(di));
  if (!Number.isFinite(scale) || (dr === 0 && di === 0)) {
    return;
  }
  nr /= scale;
  ni /= scale;
  dr /= scale;
  di /= scale;
  let re: number;
  let im: number;
  if (Math.abs(dr) >= Math.abs(di)) {
    const ratio = di / dr;
    const denominator = dr + di * ratio;
    re = (nr + ni * ratio) / denominator;
    im = (ni - nr * ratio) / denominator;
  } else {
    const ratio = dr / di;
    const denominator = di + dr * ratio;
    re = (nr * ratio + ni) / denominator;
    im = (ni * ratio - nr) / denominator;
  }
  if (!Number.isFinite(re) || !Number.isFinite(im)) {
    return;
  }
  return Complex.from(re, im);
}
