import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const documents = ['README.md', 'ASSET_CREDITS.md', 'docs/PLAYTEST.md', 'docs/media/README.md'];
const prose = (text) => text.replace(/```[^\n]*\n[\s\S]*?```/g, '');
const slug = (heading) => heading.toLowerCase().replace(/[`*_]/g, '').replace(/[^\p{L}\p{N}\p{M}\s-]/gu, '').trim().replace(/\s/g, '-');
let links = 0;
for (const document of documents) {
  const path = resolve(root, document);
  const content = await readFile(path, 'utf8');
  if (document === 'README.md') {
    assert(content.startsWith('# WONDERS EX Fan Game · 可玩的四关横版动作原型\n'));
    assert(content.includes('docs/media/gameplay-bamboo.png'));
    assert(content.includes('docs/media/combat-ruins.gif'));
  }
  for (const match of prose(content).matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = match[1];
    if (/^[a-z][a-z\d+.-]*:/i.test(href)) continue;
    const [relative, fragment] = href.split('#');
    const target = relative ? resolve(dirname(path), decodeURIComponent(relative)) : path;
    assert((await stat(target)).isFile(), `${document}: missing file ${href}`);
    if (fragment && target.endsWith('.md')) {
      const targetText = prose(await readFile(target, 'utf8'));
      const headings = [...targetText.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => slug(h[1]));
      assert(headings.includes(decodeURIComponent(fragment)), `${document}: missing heading ${href}`);
    }
    links++;
  }
}
const png = await readFile(resolve(root, 'docs/media/gameplay-bamboo.png'));
const gif = await readFile(resolve(root, 'docs/media/combat-ruins.gif'));
assert.equal(png.subarray(1, 4).toString(), 'PNG');
assert.equal(png.readUInt32BE(16), 1100);
assert.equal(png.readUInt32BE(20), 640);
assert.match(gif.subarray(0, 6).toString(), /^GIF8[79]a$/);
assert(gif.includes(Buffer.from('NETSCAPE2.0')), 'GIF must contain its animation loop extension');
assert(gif.length < 5 * 1024 * 1024, 'Keep the README animation below 5 MiB');
console.log(`Showcase OK: ${links} local links/anchors; PNG ${png.length} bytes; GIF ${gif.length} bytes. External URLs are checked separately.`);
