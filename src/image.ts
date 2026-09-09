export interface SourceImage {
  name: string;
  url: string;
  pixels: Uint8Array;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  bytes: number;
}

export async function decodePng(file: File): Promise<SourceImage> {
  if (file.size > 25 * 1024 * 1024) throw new Error('This file is too large. Choose a PNG smaller than 25 MB.');
  const header = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (header.length < 24 || !signature.every((byte, index) => header[index] === byte)) throw new Error('Please choose a PNG image. Other file formats are not supported yet.');
  const view = new DataView(header.buffer);
  const originalWidth = view.getUint32(16);
  const originalHeight = view.getUint32(20);
  if (!originalWidth || !originalHeight || originalWidth * originalHeight > 24_000_000 || Math.max(originalWidth, originalHeight) > 16384) throw new Error('Choose an image up to 24 megapixels and 16,384 pixels per side.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This PNG could not be decoded. Try exporting it again from your image editor.'); }
  try {
    const scale = Math.min(1, 1536 / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Your browser could not create an image canvas.');
    context.drawImage(bitmap, 0, 0, width, height);
    return { name: file.name, url: URL.createObjectURL(file), pixels: new Uint8Array(context.getImageData(0, 0, width, height).data), width, height, originalWidth, originalHeight, bytes: file.size };
  } finally { bitmap.close(); }
}

export function normalizeSvg(svg: string, source: SourceImage) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') throw new Error('The engine returned an invalid SVG. Try a different preset.');
  const root = document.documentElement;
  const allowed = new Set(['svg', 'g', 'path', 'defs', 'clipPath', 'rect', 'title', 'desc']);
  for (const element of [root, ...root.querySelectorAll('*')]) {
    if (!allowed.has(element.localName)) throw new Error('Unexpected element in vector output.');
    for (const attribute of element.attributes) {
      if (/^on/i.test(attribute.name) || /href/i.test(attribute.name) || /url\((?!#)/i.test(attribute.value)) throw new Error('Unexpected external reference in vector output.');
    }
  }
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  root.setAttribute('viewBox', `0 0 ${source.width} ${source.height}`);
  root.setAttribute('width', String(source.originalWidth));
  root.setAttribute('height', String(source.originalHeight));
  return { svg: new XMLSerializer().serializeToString(root), paths: root.querySelectorAll('path').length,
    palette: [...new Set(Array.from(root.querySelectorAll('[fill]')).map((element) => element.getAttribute('fill')!).filter((fill) => fill !== 'none'))] };
}

export function downloadFile(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
