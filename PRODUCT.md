# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Designers turning screenshot artwork and PNG icons into editable SVG paths for use in Figma.

## Product Purpose

Contour converts raster graphics into useful vector assets. Success is a fast paste → adjust → export workflow that preserves recognizable artwork while giving users control over colors, curves, and unwanted detail.

## Operating Context

- Paste screenshots with ⌘V or Ctrl+V, drop a PNG, choose a file, or try an included sample.
- Adjust tracing settings and compare the original with the vector preview before exporting.
- Download an SVG and drag it into Figma. Copying SVG markup is also available, but destination applications may handle it differently.
- The interface runs in a browser, including mobile web; it is not a native application.

## Capabilities and Constraints

- Processing stays in the browser. No image upload service, accounts, backend, API keys, or persistent image storage are required.
- Preserve screenshot paste as a first-class input, not merely a permission-dependent clipboard button.
- The existing React/Vite implementation uses Rust VTracer compiled to WebAssembly in a cancellable Web Worker. WebGPU is optional future work, contingent on representative benchmarks; it is not a current requirement or capability.
- Controls include color limits, corner smoothing, speckle removal, simplification, denoising, and edge-connected background removal. Presets support clean icons, pop art, fine detail, and pixel art.
- Exports contain vector paths, not embedded raster images. Text becomes outlines rather than editable text.
- Current input support is PNG, up to 25 MB, 24 megapixels, and 16,384 pixels per side. Tracing downsamples images longer than 1,536 pixels while preserving original export dimensions.
- Flat-color graphics are the intended material. Photographs, gradients, shadows, partial transparency, and tiny text have fidelity limitations. Aggressive cleanup can erase thin strokes.
- Prepare for Cloudflare Workers Static Assets deployment. Deployment is a separate action; readiness must not be described as a live deployment.
- Do not use OpenAI Sites.

## Evidence on Hand

- `public/samples/` contains five PNG examples; `src/samples.ts` contains their vector references.
- `tests/` contains browser workflow and raster-fidelity regression coverage.
- `docs/VALIDATION.md` records measured results and hands-on Safari testing. Do not extend those claims to untested browsers or actual Figma import verification.
- `README.md` documents implementation, limits, local commands, and deployment preparation.

## Product Principles

- Make getting a screenshot into the tool immediate.
- Keep image processing local and avoid unnecessary services.
- Let users compare and tune quality rather than hide destructive tradeoffs.
- Export usable vector geometry and communicate fidelity limits honestly.
- Keep tracing responsive and cancel obsolete work.

## Brand Commitments

The user approved a classic HTML utility direction: a white page, compact left-aligned layout, plain text links, near-square controls, and modern responsiveness. Avoid oversized upload panels and purple app styling. Minimal appearance must preserve a highly functional workflow.

## Open Decisions

- Contour is the current implementation name; permanent naming and broader brand commitments are not established.
- Pricing, additional audiences, additional input formats, and a product-specific accessibility conformance target are not established.
