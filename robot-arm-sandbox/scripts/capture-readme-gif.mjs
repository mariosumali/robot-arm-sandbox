/**
 * Builds the app, runs vite preview, captures the WebGL canvas as PNG frames,
 * and writes ../docs/demo-6dof-path.gif next to the GitHub README (requires ffmpeg on PATH).
 *
 * Usage: npm run capture:readme-gif
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(root, '..');
const outGif = path.join(repoRoot, 'docs', 'demo-6dof-path.gif');
const port = 4173;
const url = `http://127.0.0.1:${port}/?demo=readme`;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForHttp(maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error(`Server did not respond at ${url}`);
}

async function main() {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });

  await mkdir(path.dirname(outGif), { recursive: true });

  const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const preview = spawn(process.execPath, [
    viteCli,
    'preview',
    '--port',
    String(port),
    '--strictPort',
    '--host',
    '127.0.0.1',
  ], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  preview.stderr.on('data', d => process.stderr.write(d));
  preview.stdout.on('data', d => process.stdout.write(d));

  let previewExited = false;
  preview.on('exit', code => {
    previewExited = true;
    if (code && code !== 0) console.error('preview exited', code);
  });

  try {
    await waitForHttp();
    await sleep(800);

    const puppeteer = (await import('puppeteer')).default;
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 880, height: 520, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('.viewport-canvas-area canvas', { timeout: 60000 });
    await page.evaluate(() => {
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.margin = '0';
      const root = document.getElementById('root');
      if (root) root.style.height = '100%';
    });
    await sleep(2800);

    const framesDir = await mkdtemp(path.join(tmpdir(), 'readme-gif-'));
    const n = 45;
    const stepMs = 110;

    for (let i = 0; i < n; i++) {
      const area = await page.$('.viewport-canvas-area');
      if (!area) throw new Error('No .viewport-canvas-area');
      const fp = path.join(framesDir, `${String(i).padStart(3, '0')}.png`);
      await area.screenshot({ path: fp });
      await sleep(stepMs);
    }

    await browser.close();

    const vf =
      'fps=10,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3';
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        '10',
        '-i',
        path.join(framesDir, '%03d.png'),
        '-vf',
        vf,
        outGif,
      ],
      { stdio: 'inherit' },
    );

    await rm(framesDir, { recursive: true, force: true });
    console.log('Wrote', outGif);
  } finally {
    if (!previewExited) {
      preview.kill('SIGTERM');
      await sleep(400);
      if (!previewExited) preview.kill('SIGKILL');
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
