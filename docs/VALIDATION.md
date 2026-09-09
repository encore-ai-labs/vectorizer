# Validation

Validated on September 8, 2026, using headless Google Chrome on macOS and Cloudflare Wrangler 4.130.0 local static-asset serving.

## Verified

- All 8 Playwright tests pass against the production build at the local Cloudflare URL, not just Vite’s development server.
- Native screenshot clipboard write → keyboard paste → PNG decode → Wasm trace → SVG download and markup copy.
- Five real bundled PNGs: a multicolor flower, camera icon, pop-art composition, pixel heart, and noisy ring.
- Actual downloaded SVG files contain standalone editable paths, original dimensions, and a viewBox, without embedded raster data, scripts, NaN, or Infinity.
- Color limits affect output; smoothing changes geometry; pixel mode has no curve commands; higher speckle filtering reduces path count; reset reproduces the original result.
- Empty transparency, invalid files, oversized PNG headers, large-image resampling, mobile overflow, and rapid control changes.
- Border removal preserves enclosed matching-color regions; denoising preserves alpha and hard color boundaries.
- The tested conversion flow makes no off-origin requests or non-GET requests.
- Cloudflare serves `.wasm` as `application/wasm`, honors the security headers, and applies immutable caching to hashed assets.
- `npm run deploy:check` succeeds without deployment. The dependency audit reports zero known vulnerabilities after the Sharp patch override.

## Raster fidelity

The quality test rasterizes both the PNG and resulting SVG at 512 × 512. Mean absolute RGB error is measured after compositing onto white and normalized to 0–1. Silhouette mismatch is the fraction of pixels whose alpha crosses 50% in one image but not the other. These measurements compare the actual artwork, not only file validity.

| Sample, Clean icon preset | Mean RGB error | Silhouette mismatch |
| --- | ---: | ---: |
| Sun bloom | 0.00400 | 0.00628 |
| Camera | 0.00261 | 0.00211 |
| Electric pop | 0.00458 | 0.00014 |
| Pixel heart | 0.00620 | 0.01246 |

The fixed regression gates are mean RGB error below 0.025 and silhouette mismatch below 0.015. Pixel art with the Clean icon preset intentionally smooths corners; the Pixel art preset is separately checked for straight-only paths.

## Not claimed

- No deployment to a Cloudflare account has been performed.
- Figma’s UI has not been automated; exports are standard path-only SVGs intended for file import. Clipboard markup acceptance is application-dependent.
- No GPU speedup is claimed or required. GPU preprocessing remains a benchmark-driven extension, not a dependency.
- These fixtures do not establish fidelity for all photos, gradients, text, or extremely detailed art. See the limits in the README.
