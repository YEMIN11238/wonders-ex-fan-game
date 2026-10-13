// Correct white-matted antialiasing only beside an already removed background.
// Interior whites (axe highlights, eyes and slash trails) are deliberately untouched.
export function removeBossWhiteFringe(pixels: ImageData, stone = false) {
  const { width: w, height: h, data: d } = pixels;
  const original = new Uint8ClampedArray(d),
    distance = new Int16Array(w * h).fill(-1),
    queue: number[] = [];
  for (let i = 0; i < w * h; i++)
    if (d[i * 4 + 3] === 0) {
      distance[i] = 0;
      queue.push(i);
    }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    if (distance[i] >= 2) continue;
    const x = i % w,
      y = Math.floor(i / w);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * w + nx;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h || distance[n] >= 0)
          continue;
        distance[n] = distance[i] + 1;
        queue.push(n);
      }
  }
  for (let i = 0; i < w * h; i++) {
    if (distance[i] < 1 || distance[i] > 2) continue;
    const p = i * 4,
      r = original[p],
      g = original[p + 1],
      b = original[p + 2],
      min = Math.min(r, g, b),
      max = Math.max(r, g, b);
    if (
      min < (stone ? 150 : 190) ||
      max - min > (stone ? 32 : 48) ||
      (!stone && min > 235)
    )
      continue;
    const x = i % w,
      y = Math.floor(i / w),
      c = [r, g, b];
    let best = Infinity,
      alpha = 1;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx,
          ny = y + dy,
          n = ny * w + nx,
          q = n * 4;
        if (
          nx < 0 ||
          nx >= w ||
          ny < 0 ||
          ny >= h ||
          original[q + 3] === 0 ||
          (distance[n] >= 0 && distance[n] <= distance[i]) ||
          Math.min(original[q], original[q + 1], original[q + 2]) > 160
        )
          continue;
        const f = [original[q], original[q + 1], original[q + 2]];
        let numerator = 0,
          denominator = 0;
        for (let k = 0; k < 3; k++) {
          numerator += (255 - c[k]) * (255 - f[k]);
          denominator += (255 - f[k]) ** 2;
        }
        const a = Math.max(0, Math.min(1, numerator / denominator));
        const residual = Math.max(
          ...c.map((v, k) => Math.abs(v - (a * f[k] + (1 - a) * 255))),
        );
        const score = residual + Math.hypot(dx, dy) * 0.35;
        if (residual <= 18 && score < best) {
          best = score;
          alpha = a;
        }
      }
    if (best === Infinity || alpha > 0.95) continue;
    if (alpha < 0.12) {
      d[p + 3] = 0;
      continue;
    }
    for (let k = 0; k < 3; k++)
      d[p + k] = Math.max(0, Math.min(255, (c[k] - 255 * (1 - alpha)) / alpha));
    d[p + 3] = Math.round(original[p + 3] * alpha);
  }
}
