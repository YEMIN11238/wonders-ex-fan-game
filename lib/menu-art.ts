export function createMenuArt(sheet: HTMLImageElement) {
  const crops = {
    play: [6, 14, 472, 204],
    pause: [6, 218, 472, 200],
    options: [6, 418, 472, 200],
  } as const;
  return Object.fromEntries(
    Object.entries(crops).map(([name, [x, y, w, h]]) => {
      const image = document.createElement('canvas');
      image.width = w;
      image.height = h;
      const ctx = image.getContext('2d')!;
      ctx.drawImage(sheet, x, y, w, h, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h),
        d = pixels.data,
        seen = new Uint8Array(w * h),
        queue: number[] = [];
      const add = (i: number) => {
        const p = i * 4;
        if (seen[i] || Math.min(d[p], d[p + 1], d[p + 2]) < 110) return;
        seen[i] = 1;
        queue.push(i);
      };
      for (let xx = 0; xx < w; xx++) {
        add(xx);
        add((h - 1) * w + xx);
      }
      for (let yy = 0; yy < h; yy++) {
        add(yy * w);
        add(yy * w + w - 1);
      }
      for (let head = 0; head < queue.length; head++) {
        const i = queue[head],
          xx = i % w,
          yy = Math.floor(i / w);
        if (xx > 0) add(i - 1);
        if (xx < w - 1) add(i + 1);
        if (yy > 0) add(i - w);
        if (yy < h - 1) add(i + w);
      }
      for (const i of queue) {
        const p = i * 4,
          m = Math.min(d[p], d[p + 1], d[p + 2]);
        if (m >= 249) {
          d[p + 3] = 0;
          continue;
        }
        const alpha = 255 - m;
        for (let k = 0; k < 3; k++)
          d[p + k] = Math.min(64, Math.round(((d[p + k] - m) * 255) / alpha));
        d[p + 3] = alpha;
      }
      ctx.putImageData(pixels, 0, 0);
      const result = document.createElement('canvas');
      result.width = 472;
      result.height = 204;
      result.getContext('2d')!.drawImage(image, 0, (204 - h) / 2);
      return [name, result.toDataURL('image/png')];
    }),
  ) as { play: string; pause: string; options: string };
}
