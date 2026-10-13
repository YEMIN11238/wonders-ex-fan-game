// Decode the supplied GIFs once so animation advances on the game's clock.
// Unlike an animated <img>, these frames correctly freeze with pause/hit-stop.
export type GifFrame = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  ms: number;
};

function lzw(data: Uint8Array, minimum: number, count: number) {
  const clear = 1 << minimum,
    end = clear + 1;
  let size = minimum + 1,
    next = end + 1,
    bit = 0,
    previous = -1,
    first = 0,
    out = 0;
  const prefix = new Uint16Array(4096),
    suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097),
    result = new Uint8Array(count);
  for (let i = 0; i < clear; i++) suffix[i] = i;
  while (out < count && bit + size <= data.length * 8) {
    let code = 0;
    for (let n = 0; n < size; n++, bit++)
      code |= ((data[bit >> 3] >> (bit & 7)) & 1) << n;
    if (code === clear) {
      size = minimum + 1;
      next = end + 1;
      previous = -1;
      continue;
    }
    if (code === end) break;
    if (code > next || code >= 4096) throw new Error('Invalid GIF code');
    const incoming = code;
    let top = 0;
    if (code === next) {
      if (previous < 0) throw new Error('Invalid first GIF code');
      stack[top++] = first;
      code = previous;
    }
    while (code >= clear) {
      if (top >= 4096) throw new Error('Invalid GIF dictionary');
      stack[top++] = suffix[code];
      code = prefix[code];
    }
    first = suffix[code];
    stack[top++] = first;
    while (top) {
      const value = stack[--top];
      if (out < count) result[out++] = value;
    }
    if (previous >= 0 && next < 4096) {
      prefix[next] = previous;
      suffix[next] = first;
      next++;
      if (next === 1 << size && size < 12) size++;
    }
    previous = incoming;
  }
  if (out !== count) throw new Error('Incomplete GIF frame');
  return result;
}

export function decodeGif(buffer: ArrayBuffer): GifFrame[] {
  const bytes = new Uint8Array(buffer);
  if (String.fromCharCode(...bytes.slice(0, 3)) !== 'GIF')
    throw new Error('Invalid GIF');
  let pos = 6;
  const byte = () => {
    if (pos >= bytes.length) throw new Error('Truncated GIF');
    return bytes[pos++];
  };
  const word = () => byte() | (byte() << 8);
  const palette = (length: number) => {
    const p = bytes.slice(pos, pos + length * 3);
    pos += length * 3;
    return p;
  };
  const blocks = () => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (let n = byte(); n; n = byte()) {
      chunks.push(bytes.slice(pos, pos + n));
      length += n;
      pos += n;
    }
    const joined = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.length;
    }
    return joined;
  };
  const width = word(),
    height = word(),
    flags = byte(),
    background = byte();
  byte();
  if (!width || !height || width * height > 4_000_000)
    throw new Error('Unsupported GIF dimensions');
  const globalPalette =
    flags & 128 ? palette(1 << ((flags & 7) + 1)) : new Uint8Array();
  let canvas: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4);
  const fill = (x: number, y: number, w: number, h: number) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        const p = (yy * width + xx) * 4;
        canvas[p] = globalPalette[background * 3] ?? 0;
        canvas[p + 1] = globalPalette[background * 3 + 1] ?? 0;
        canvas[p + 2] = globalPalette[background * 3 + 2] ?? 0;
        canvas[p + 3] = globalPalette.length ? 255 : 0;
      }
  };
  fill(0, 0, width, height);
  let delay = 100,
    disposal = 0,
    transparent = -1;
  let previous:
    | {
        disposal: number;
        x: number;
        y: number;
        w: number;
        h: number;
        backup?: Uint8ClampedArray;
      }
    | undefined;
  const frames: GifFrame[] = [];
  while (pos < bytes.length) {
    const block = byte();
    if (block === 0x3b) break;
    if (block === 0x21) {
      if (byte() === 0xf9) {
        if (byte() !== 4) throw new Error('Invalid GIF control block');
        const packed = byte();
        disposal = (packed >> 2) & 7;
        delay = Math.max(10, word() * 10);
        const index = byte();
        transparent = packed & 1 ? index : -1;
        byte();
      } else blocks();
      continue;
    }
    if (block !== 0x2c) throw new Error('Unexpected GIF block');
    if (previous?.disposal === 2)
      fill(previous.x, previous.y, previous.w, previous.h);
    if (previous?.disposal === 3 && previous.backup) canvas = previous.backup;
    const x = word(),
      y = word(),
      w = word(),
      h = word(),
      packed = byte();
    if (x + w > width || y + h > height)
      throw new Error('Invalid GIF frame bounds');
    const colors =
      packed & 128 ? palette(1 << ((packed & 7) + 1)) : globalPalette;
    const minimum = byte();
    const indices = lzw(blocks(), minimum, w * h);
    previous = {
      disposal,
      x,
      y,
      w,
      h,
      backup: disposal === 3 ? canvas.slice() : undefined,
    };
    const rows: number[] = [];
    if (packed & 64) {
      for (const [start, step] of [
        [0, 8],
        [4, 8],
        [2, 4],
        [1, 2],
      ])
        for (let row = start; row < h; row += step) rows.push(row);
    } else for (let row = 0; row < h; row++) rows.push(row);
    for (let row = 0; row < h; row++)
      for (let col = 0; col < w; col++) {
        const index = indices[row * w + col];
        if (index === transparent) continue;
        const p = ((y + rows[row]) * width + x + col) * 4;
        canvas[p] = colors[index * 3];
        canvas[p + 1] = colors[index * 3 + 1];
        canvas[p + 2] = colors[index * 3 + 2];
        canvas[p + 3] = 255;
      }
    frames.push({ width, height, data: canvas.slice(), ms: delay });
    delay = 100;
    disposal = 0;
    transparent = -1;
  }
  return frames;
}
