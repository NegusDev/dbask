// Renders diagram.html to docs/public/dbask-architecture.gif.
// Needs Playwright (with Chromium) and ffmpeg; neither is a project dependency.
//   node scripts/architecture-diagram/render.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const FPS = 12;
const output = resolve(__dirname, '../../docs/public/dbask-architecture.gif');

(async () => {
  const frames = mkdtempSync(join(tmpdir(), 'dbask-arch-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 680 } });
  await page.goto('file://' + resolve(__dirname, 'diagram.html'));
  await page.waitForTimeout(400);
  const total = await page.evaluate(() => window.TOTAL);
  const count = Math.round(total * FPS);
  for (let i = 0; i < count; i += 1) {
    await page.evaluate((t) => window.draw(t), i / FPS);
    await page.screenshot({ path: join(frames, `f${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, 'f%04d.png'),
    '-vf', 'split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none',
    '-loop', '0', output,
  ]);
  rmSync(frames, { recursive: true, force: true });
  console.log(`Wrote ${output} (${count} frames)`);
})();
