import type { Options } from '@visioncortex/vtracer';

export interface Settings {
  colors: number;
  smoothing: number;
  speckle: number;
  simplify: number;
  denoise: number;
  mode: 'spline' | 'polygon' | 'pixel';
  removeBackground: boolean;
  backgroundTolerance: number;
}

export const presets: Record<string, { name: string; description: string; settings: Settings }> = {
  clean: { name: 'Clean icon', description: 'Crisp, simple shapes', settings: { colors: 8, smoothing: 25, speckle: 1, simplify: 0.2, denoise: 0, mode: 'spline', removeBackground: false, backgroundTolerance: 18 } },
  artwork: { name: 'Pop art', description: 'Bold color, soft curves', settings: { colors: 16, smoothing: 75, speckle: 5, simplify: 0.8, denoise: 1, mode: 'spline', removeBackground: false, backgroundTolerance: 18 } },
  detail: { name: 'Fine detail', description: 'Keep the little things', settings: { colors: 32, smoothing: 25, speckle: 0, simplify: 0, denoise: 0, mode: 'spline', removeBackground: false, backgroundTolerance: 18 } },
  pixel: { name: 'Pixel art', description: 'Every edge intact', settings: { colors: 16, smoothing: 0, speckle: 0, simplify: 0, denoise: 0, mode: 'pixel', removeBackground: false, backgroundTolerance: 18 } },
};

export function traceOptions(settings: Settings): Options {
  return {
    clustering: 'color-cluster',
    hierarchical: 'stacked',
    mode: settings.mode,
    maxColors: settings.colors,
    colorPrecision: 8,
    layerDifference: 16,
    filterSpeckle: settings.speckle,
    cornerThreshold: Math.round(20 + settings.smoothing * 1.3),
    lengthThreshold: 3.5 + settings.smoothing * 0.035,
    spliceThreshold: Math.round(20 + settings.smoothing * 0.65),
    maxIterations: 10,
    simplify: settings.mode === 'pixel' ? 0 : settings.simplify,
    pathPrecision: 2,
    optimize: 2,
  };
}

export function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}
