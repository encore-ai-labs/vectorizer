import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
async function writeChanged(path, content) {
  const next = Buffer.from(content);
  try { if ((await readFile(path)).equals(next)) return; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(path, next);
}
const packageRoot = dirname(require.resolve('@visioncortex/vtracer'));
const source = await readFile(join(packageRoot, 'pkg/vtracer_wasm.js'), 'utf8');
const marker = 'const wasmPath =';
if (!source.includes(marker) || !source.includes('exports.vectorize_rgba = vectorize_rgba;')) {
  throw new Error('VTracer glue changed. Review the browser adapter before upgrading.');
}
const body = source.slice(0, source.indexOf(marker))
  .replace('exports.vectorize_bytes = vectorize_bytes;', 'export { vectorize_bytes };')
  .replace('exports.vectorize_rgba = vectorize_rgba;', 'export { vectorize_rgba };');
if (/require\(|\bexports\./.test(body)) throw new Error('Unexpected Node dependency in Wasm glue.');
const initialization = `
let wasm;
let initialization;
export function initialize() {
  initialization ??= (async () => {
    const response = await fetch(new URL('./vtracer.wasm', import.meta.url));
    if (!response.ok) throw new Error('Unable to load the tracing engine. Please reload.');
    const bytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, __wbg_get_imports());
    wasm = result.instance.exports;
    wasm.__wbindgen_start();
  })();
  return initialization;
}
`;
await mkdir('src/generated', { recursive: true });
await writeChanged('src/generated/vtracer.js', body + initialization);
await writeChanged('src/generated/vtracer.wasm', await readFile(join(packageRoot, 'pkg/vtracer_wasm_bg.wasm')));
await writeChanged('src/generated/vtracer.d.ts', `import type { Options } from '@visioncortex/vtracer';
export function initialize(): Promise<void>;
export function vectorize_rgba(data: Uint8Array, width: number, height: number, options: Options): string;
export function vectorize_bytes(data: Uint8Array, options: Options): string;
`);
await mkdir('public/licenses', { recursive: true });
for (const name of ['react', 'react-dom', 'lucide-react']) {
  const packagePath = dirname(require.resolve(`${name}/package.json`));
  await writeChanged(`public/licenses/${name}.txt`, await readFile(join(packagePath, 'LICENSE')));
}
