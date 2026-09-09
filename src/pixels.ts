export function removeBorderBackground(pixels: Uint8Array, width: number, height: number, tolerance: number) {
  const corners = [0, width - 1, width * (height - 1), width * height - 1];
  const background = corners.map((pixel) => Array.from(pixels.slice(pixel * 4, pixel * 4 + 4)));
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let tail = 0;
  let head = 0;
  const add = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * 4;
    const matches = pixels[offset + 3] === 0 || background.some((color) => color[3] > 0 && Math.max(
      Math.abs(pixels[offset] - color[0]), Math.abs(pixels[offset + 1] - color[1]), Math.abs(pixels[offset + 2] - color[2]),
    ) <= tolerance);
    if (matches) queue[tail++] = pixel;
  };
  for (let column = 0; column < width; column++) { add(column); add((height - 1) * width + column); }
  for (let row = 0; row < height; row++) { add(row * width); add(row * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++];
    pixels[pixel * 4 + 3] = 0;
    if (pixel % width > 0) add(pixel - 1);
    if (pixel % width < width - 1) add(pixel + 1);
    if (pixel >= width) add(pixel - width);
    if (pixel < width * (height - 1)) add(pixel + width);
  }
  return pixels;
}

export function denoisePixels(pixels: Uint8Array, width: number, height: number, radius: number) {
  if (!radius) return pixels;
  const result = pixels.slice();
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      const offset = (row * width + column) * 4;
      if (pixels[offset + 3] === 0) continue;
      let total = 0;
      const sum = [0, 0, 0];
      for (let deltaRow = -radius; deltaRow <= radius; deltaRow++) {
        for (let deltaColumn = -radius; deltaColumn <= radius; deltaColumn++) {
          const neighborRow = row + deltaRow;
          const neighborColumn = column + deltaColumn;
          if (neighborRow < 0 || neighborRow >= height || neighborColumn < 0 || neighborColumn >= width) continue;
          const neighbor = (neighborRow * width + neighborColumn) * 4;
          const difference = Math.abs(pixels[offset] - pixels[neighbor]) + Math.abs(pixels[offset + 1] - pixels[neighbor + 1]) + Math.abs(pixels[offset + 2] - pixels[neighbor + 2]);
          if (pixels[neighbor + 3] === 0 || difference > 100) continue;
          const weight = pixels[neighbor + 3] / 255;
          for (let channel = 0; channel < 3; channel++) sum[channel] += pixels[neighbor + channel] * weight;
          total += weight;
        }
      }
      for (let channel = 0; channel < 3; channel++) result[offset + channel] = Math.round(sum[channel] / total);
    }
  }
  return result;
}
