# Contour

A local-first PNG → SVG studio built with React, Vite, and the Rust VTracer engine compiled to WebAssembly. No OpenAI Sites, backend, upload service, accounts, or API keys. Images never leave the browser.

## Run locally

Use Node 24 (see `.nvmrc`) and npm:

```sh
nvm use
npm ci
npm run dev
```

Open the URL printed by Vite. Paste a screenshot with **⌘V / Ctrl+V**, drop a PNG anywhere, use the file picker, or try one of the five included sample PNGs. The clipboard button is an optional permission-based alternative; native paste does not depend on granting Clipboard API read access.

## Workflow

- Start with Clean icon, Pop art, Fine detail, or Pixel art.
- Limit colors, smooth corners, remove small speckles, and simplify paths with live previews.
- Advanced controls include edge-aware denoising, curve/polygon/pixel modes, and edge-connected background removal. Background removal samples the four corner colors; it may remove artwork that touches the image border. It does not remove enclosed matching regions.
- Compare original and vector side-by-side, change the preview background, and zoom up to 400%. Preview background colors do not modify the exported SVG.
- Download standalone SVGs containing editable paths (not embedded PNGs), or copy SVG markup. To import reliably into Figma, drag the downloaded SVG into the canvas. Clipboard markup behavior depends on the destination application.

## Architecture

The browser decodes PNGs to RGBA. A dedicated, cancellable Web Worker performs optional preprocessing and VTracer tracing. Every settings change invalidates the previous export, debounces by 180 ms, and terminates obsolete work. A 45-second deadline prevents runaway traces. The source pixels are retained and never cumulatively altered by adjustments.

`scripts/prepare-wasm.mjs` adapts the **pinned** official `@visioncortex/vtracer@1.0.0-alpha.4` generated Node glue to browser ESM by replacing its filesystem loader with `fetch` + `WebAssembly.instantiate`. It leaves the actual Rust/Wasm engine unchanged, checks the expected glue shape, and rejects unhandled Node dependencies. Generated glue and Wasm files are recreated before dev/build/test and are not committed. Upgrading the alpha engine requires reviewing the adapter and running the full quality suite.

Vite bundles the Wasm and worker as same-origin static assets. There are no runtime CDNs or third-party network requests. No WebGPU is required: this first version uses the CPU/Wasm path. The preprocessing boundary in `src/pixels.ts` is where an optional GPU implementation can be added after representative benchmarks show a benefit. Current small-icon timings do not establish a need for GPU acceleration.

The npm override pins Miniflare’s development-only Sharp dependency to 0.35.4 to avoid its earlier libheif advisory. It is not part of the browser bundle. Review the override when upgrading Wrangler.

## Limits and tradeoffs

- PNG only, up to 25 MB, 24 megapixels, and 16,384 pixels on either side. Signatures and dimensions are checked before decoding.
- Images larger than 1,536 pixels on their longest side are downsampled for tracing. The UI discloses this; exported SVG dimensions still match the original. This can remove very fine detail in large screenshots.
- This is flat-color vectorization, not semantic reconstruction or AI illustration. Photographs, gradients, shadows, and text may not trace cleanly. Text becomes outlines, not editable text.
- Transparency is traced as geometry; partial alpha is not faithfully reproduced. High cleanup or simplification can remove thin strokes. Fine detail and lower cleanup preserve more detail at the cost of larger SVGs.
- Reset restores all Clean icon settings. Files/results are session-local and are not persisted after refresh.

## Tests

```sh
npm test
npm run build
npm run deploy:check
```

Tests use installed Google Chrome locally. CI uses Playwright Chromium. For Linux/CI, install it with `npx playwright install --with-deps chromium` and run with `CI=1`.

Browser coverage includes native clipboard screenshot paste, file/drop handling, standalone SVG downloads, color limits, smooth and pixel paths, cleanup, reset determinism, rapid setting changes, and mobile layout. Quality checks rasterize actual output and compare it to the input; screenshots are saved under `test-results/`. The included test-art PNGs live in `public/samples/`; their vector references live in `src/samples.ts`. Regenerate PNGs with `node scripts/generate-samples.mjs` on Node 24 with Chrome installed.

To run the same suite against a production preview, set `TEST_BASE_URL` to that server’s URL.

See [validation results](docs/VALIDATION.md) for measured raster fidelity and the verification scope.

## Deploy to Cloudflare

Prepared for **Cloudflare Workers Static Assets**, with no Worker server code, database, secrets, or paid AI/GPU bindings. `wrangler.jsonc` points at Vite’s `dist` output. `public/_headers` configures CSP, anti-framing, MIME protection, and immutable caching for hashed bundles.

```sh
nvm use
npm ci
npm run deploy:check
npx wrangler login
npm run deploy
```

Deployment is intentionally not performed automatically. Select the correct Cloudflare account at login; change `name` in `wrangler.jsonc` if needed. For Workers Git integration, use Node 24, build command `npm run build`, and deploy command `npx wrangler deploy`. The build prepares its own Wasm files; Rust is not needed on Cloudflare.

Cloudflare Pages is also possible: build with `npm run build`, publish `dist`, and keep the root `index.html` for SPA fallback. The checked-in Wrangler config and `deploy` script target Workers, not Pages.

Reference: [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/), [VTracer](https://github.com/visioncortex/vtracer).
