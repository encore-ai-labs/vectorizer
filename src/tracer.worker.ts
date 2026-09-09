import { initialize, vectorize_rgba } from './generated/vtracer';
import { traceOptions, type Settings } from './settings';
import { denoisePixels, removeBorderBackground } from './pixels';

interface TraceRequest {
  pixels: Uint8Array;
  width: number;
  height: number;
  settings: Settings;
}

self.onmessage = async ({ data }: MessageEvent<TraceRequest>) => {
  try {
    const start = performance.now();
    await initialize();
    let pixels = data.pixels;
    if (data.settings.removeBackground) removeBorderBackground(pixels, data.width, data.height, data.settings.backgroundTolerance);
    pixels = denoisePixels(pixels, data.width, data.height, data.settings.denoise);
    let hasVisiblePixels = false;
    for (let offset = 3; offset < pixels.length; offset += 4) {
      if (pixels[offset] > 0) { hasVisiblePixels = true; break; }
    }
    if (!hasVisiblePixels) {
      self.postMessage({ svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${data.width} ${data.height}"></svg>`, duration: Math.round(performance.now() - start) });
      return;
    }
    const svg = vectorize_rgba(pixels, data.width, data.height, traceOptions(data.settings));
    self.postMessage({ svg, duration: Math.round(performance.now() - start) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
