import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

export async function downloadSvg(page: Page) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download SVG/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('SVG download did not produce a local file.');
  const content = await readFile(path, 'utf8');
  const dismiss = page.getByRole('button', { name: 'Dismiss message' });
  if (await dismiss.isVisible()) await dismiss.click();
  return content;
}
