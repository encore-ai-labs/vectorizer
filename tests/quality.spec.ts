import { expect, test, type Page } from '@playwright/test';
import { denoisePixels, removeBorderBackground } from '../src/pixels';
import { presets, traceOptions } from '../src/settings';
import { downloadSvg } from './helpers';

async function ready(page: Page) {
  await expect(page.getByRole('button', { name: /Download SVG/ })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('sample vectors preserve raster appearance and transparent boundaries', async ({ page }) => {
  await page.goto('/');
  const reports = [];
  for (const name of ['Sun bloom', 'Camera', 'Electric pop', 'Pixel heart']) {
    await page.getByRole('button', { name: `Try ${name} sample` }).click();
    await ready(page);
    const metrics = await page.evaluate(async () => {
      const rasterize = async (image: HTMLImageElement) => {
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(image, 0, 0, 512, 512);
        return context.getImageData(0, 0, 512, 512).data;
      };
      const original = await rasterize(document.querySelector('img[alt="Original raster image"]')!);
      const vector = await rasterize(document.querySelector('img[alt="Vectorized SVG preview"]')!);
      let error = 0;
      let alphaMismatch = 0;
      for (let offset = 0; offset < original.length; offset += 4) {
        if ((original[offset + 3] > 127) !== (vector[offset + 3] > 127)) alphaMismatch++;
        for (let channel = 0; channel < 3; channel++) {
          const reference = original[offset + channel] * original[offset + 3] / 255 + 255 - original[offset + 3];
          const output = vector[offset + channel] * vector[offset + 3] / 255 + 255 - vector[offset + 3];
          error += Math.abs(reference - output);
        }
      }
      return { normalizedColorError: error / (512 * 512 * 3 * 255), silhouetteMismatch: alphaMismatch / (512 * 512) };
    });
    reports.push({ name, ...metrics });
    expect(metrics.normalizedColorError, `${name}: mean error after white compositing`).toBeLessThan(0.025);
    expect(metrics.silhouetteMismatch, `${name}: transparent boundary mismatch`).toBeLessThan(0.015);
  }
  await test.info().attach('raster-fidelity.json', { body: JSON.stringify(reports, null, 2), contentType: 'application/json' });
  console.log('Raster fidelity:', JSON.stringify(reports));
});

test('blank transparency, PNG validation, and original dimensions are handled', async ({ page }) => {
  await page.goto('/');
  const png = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload PNG').setInputFiles({ name: 'transparent.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await ready(page);
  await expect(page.locator('.status')).toContainText('No visible paths');
  await page.getByLabel('Upload PNG').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toContainText('Please choose a PNG');
  await expect(page.locator('.file-label')).toContainText('transparent.png');
  await page.getByRole('button', { name: 'Dismiss error' }).click();
  const largePng = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000; canvas.height = 1000;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#643bcc'; context.fillRect(100, 100, 1800, 800);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Upload PNG').setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.from(largePng, 'base64') });
  await ready(page);
  await expect(page.locator('.resolution-note')).toContainText('1536 × 768');
  const svg = await downloadSvg(page);
  expect(svg).toContain('width="2000"');
  expect(svg).toContain('height="1000"');
  expect(svg).toContain('viewBox="0 0 1536 768"');
  const maliciousHeader = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(maliciousHeader);
  maliciousHeader.writeUInt32BE(50000, 16); maliciousHeader.writeUInt32BE(50000, 20);
  await page.getByLabel('Upload PNG').setInputFiles({ name: 'oversized.png', mimeType: 'image/png', buffer: maliciousHeader });
  await expect(page.getByRole('alert')).toContainText('24 megapixels');
});

test('pixel preprocessing preserves enclosed holes and alpha', () => {
  const pixels = new Uint8Array(7 * 7 * 4).fill(255);
  for (let row = 1; row <= 5; row++) for (let column = 1; column <= 5; column++) {
    if (row === 1 || row === 5 || column === 1 || column === 5) {
      const offset = (row * 7 + column) * 4;
      pixels[offset] = 20; pixels[offset + 1] = 20; pixels[offset + 2] = 20;
    }
  }
  const original = pixels.slice();
  const cleaned = removeBorderBackground(pixels, 7, 7, 10);
  expect(cleaned[3]).toBe(0);
  expect(cleaned[(3 * 7 + 3) * 4 + 3]).toBe(255);
  expect(cleaned[(1 * 7 + 1) * 4 + 3]).toBe(255);
  const denoised = denoisePixels(original, 7, 7, 2);
  expect(denoised).toEqual(original);
  expect(denoisePixels(original, 7, 7, 0)).toEqual(original);
  for (const preset of Object.values(presets)) {
    const options = traceOptions(preset.settings);
    expect(Number.isInteger(options.cornerThreshold)).toBe(true);
    expect(Number.isInteger(options.spliceThreshold)).toBe(true);
  }
});

test('conversions never send image data to another origin', async ({ page }) => {
  const unexpected: string[] = [];
  const allowedOrigin = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:5173').origin;
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== allowedOrigin) unexpected.push(request.url());
    if (request.method() !== 'GET') unexpected.push(`${request.method()} ${request.url()}`);
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Electric pop sample' }).click();
  await ready(page);
  expect(unexpected).toEqual([]);
});
