import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { samples } from '../src/samples.ts';

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  const page = await browser.newPage();
  await mkdir('public/samples', { recursive: true });
  for (const sample of samples) {
    const bytes = await page.evaluate(async (svg) => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, sample.svg);
    await writeFile(`public/samples/${sample.id}.png`, new Uint8Array(bytes));
  }
} finally { await browser.close(); }
