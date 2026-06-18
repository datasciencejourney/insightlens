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
