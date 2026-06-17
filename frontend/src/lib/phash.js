/*
 * Perceptual hash + simple Hamming distance helpers.
 *
 * We use the classic 8x8 average-hash (aHash):
 *   1) downsample the source canvas to 8x8 grayscale
 *   2) compute the mean luminance
 *   3) each pixel becomes 1 if above mean, else 0  -> 64-bit fingerprint
 *
 * It is *not* invariant to rotation or extreme cropping, but it is plenty
 * stable for "the same object held in front of the same camera" — which
 * is exactly the workload of the correct-me loop.
 */
export function ahash(srcCanvas) {
  if (!srcCanvas) return null;
  const tmp = document.createElement("canvas");
  tmp.width = 8; tmp.height = 8;
  const ctx = tmp.getContext("2d");
  ctx.drawImage(srcCanvas, 0, 0, 8, 8);
  const { data } = ctx.getImageData(0, 0, 8, 8);
  const gray = new Array(64);
  let sum = 0;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[j] = g;
    sum += g;
  }
  const mean = sum / 64;
  let hash = "";
  for (let i = 0; i < 64; i++) hash += gray[i] >= mean ? "1" : "0";
  return hash;
}

export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
