import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { downloadSvg as svgFromPage } from './helpers';

async function ready(page: Page) {
  await expect(page.getByRole('button', { name: /Download SVG/ })).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
}

test('Wasm traces every sample into standalone, editable SVG paths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Download SVG/ })).toBeHidden();
  await expect(page.getByRole('complementary', { name: 'Tracing settings' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Choose an image' })).toBeVisible();
  await expect(page.getByText('Ctrl+V', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/empty-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/empty-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.setViewportSize({ width: 1440, height: 1100 });
  for (const name of ['Sun bloom', 'Camera', 'Electric pop', 'Pixel heart', 'Speckle test']) {
    await page.getByRole('button', { name: `Try ${name} sample` }).click();
    await ready(page);
    const svg = await svgFromPage(page);
    expect(svg).toContain('<path');
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).not.toMatch(/<image|<script|data:image|NaN|Infinity/);
  }
  expect(errors).toEqual([]);
});

test('color, smoothing, cleanup, presets, and export operate on actual output', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Sun bloom sample' }).click();
  await ready(page);
  const initial = await svgFromPage(page);
  await page.getByLabel('Color limit').fill('2');
  await ready(page);
  const reduced = await svgFromPage(page);
  expect(reduced).not.toEqual(initial);
  const colors = await page.evaluate((svg) => [...new Set(Array.from(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('[fill]')).map((element) => element.getAttribute('fill')))], reduced);
  expect(colors.length).toBeLessThanOrEqual(2);
  await page.getByLabel('Corner smoothing').fill('100');
  await ready(page);
  expect(await svgFromPage(page)).not.toEqual(reduced);
  await page.getByRole('button', { name: /Pixel art Every edge/ }).click();
  await ready(page);
  const pixelPaths = await page.evaluate((svg) => Array.from(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelectorAll('path')).map((path) => path.getAttribute('d')).join(''), await svgFromPage(page));
  expect(pixelPaths).not.toMatch(/[CQcq]/);
  await page.getByRole('button', { name: 'Reset settings' }).click();
  await ready(page);
  expect(await svgFromPage(page)).toEqual(initial);
  await page.screenshot({ path: 'test-results/bloom-desktop.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download SVG/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('bloom-vector.svg');
  expect(await readFile((await download.path())!, 'utf8')).toEqual(initial);
  await page.getByRole('button', { name: 'Try Speckle test sample' }).click();
  await page.getByLabel('Noise cleanup').fill('0');
  await ready(page);
  const noisy = await svgFromPage(page);
  await page.getByLabel('Noise cleanup').fill('20');
  await ready(page);
  const clean = await svgFromPage(page);
  expect((clean.match(/<path/g) || []).length).toBeLessThan((noisy.match(/<path/g) || []).length);
});

test('native clipboard screenshot paste and copy SVG work', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 120;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff7100';
    context.fillRect(20, 20, 160, 80);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
  await page.locator('h1').click();
  await page.keyboard.press('ControlOrMeta+V');
  await ready(page);
  await expect(page.locator('.file-label')).toContainText('Screenshot-');
  expect(await svgFromPage(page)).toContain('width="200"');
  await page.getByRole('button', { name: 'Copy SVG markup' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('<svg');
});

test('drop, upload errors, mobile layout, and rapid changes recover', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Upload PNG').setInputFiles({ name: 'not-an-image.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG') });
  await expect(page.getByRole('alert')).toContainText('Please choose a PNG');
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#653bd8'; context.fillRect(30, 30, 196, 196);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'dropped.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true }));
  });
  await ready(page);
  await expect(page.locator('.file-label')).toContainText('dropped.png');
  for (const value of ['4', '20', '2', '16']) await page.getByLabel('Color limit').fill(value);
  await ready(page);
  await expect(page.getByLabel('Color limit')).toHaveValue('16');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  const settingsBounds = await page.getByRole('complementary', { name: 'Tracing settings' }).boundingBox();
  const samplesBounds = await page.locator('.samples').boundingBox();
  expect(settingsBounds!.y).toBeLessThan(samplesBounds!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Try Camera sample' }).click();
  await ready(page);
  await page.getByText('Fine-tune details', { exact: true }).click();
  await page.getByLabel('Remove border background').check();
  await ready(page);
});
