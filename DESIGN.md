---
name: Contour
description: A classic HTML utility with modern browser-local vectorization.
colors:
  primary: "#0000aa"
  page: "#ffffff"
  text: "#222222"
  muted: "#555555"
  rule: "#cccccc"
  button: "#e9e9e9"
typography:
  headline:
    fontFamily: 'Georgia, "Times New Roman", serif'
    fontSize: "28px"
    fontWeight: 700
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "14px"
  label:
    fontSize: "13px"
rounded:
  square: "0px"
  control: "2px"
spacing:
  small: "8px"
  medium: "16px"
  large: "24px"
components:
  button-primary:
    backgroundColor: "{colors.button}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
---

# Design System: Contour

## Overview

Classic HTML utility: compact, plain, fast, and functional. This direction was explicitly approved by the user. Preserve the useful familiarity of older web tools without a decorative retro costume.

## Colors

White pages, dark text, gray rules and controls. Blue identifies link-like actions and focus, not large decorative areas. Artwork supplies the expressive color.

## Typography

Georgia headings and Arial interface text intentionally use familiar local fonts for the approved old-web direction. Headings are 28px on desktop and 25px on mobile. Controls are 13–14px; supporting metadata is 12px. No downloaded font dependency.

## Layout

The page is capped at 1180px with 20px inner padding. Import is a compact left-aligned section, not a large hero or drop card. Once loaded, a flexible preview sits beside a 270px settings column. At 800px and below, settings follow the preview and examples follow settings. At 480px, page padding becomes 12px. Examples are wrapping text actions with small artwork thumbnails.

## Elevation & Depth

Flat: use one-pixel rules, clear spacing, and selected-control fills rather than shadows.

## Shapes

Square containers and near-square, 2px-radius buttons. No rounded card shells. The checkerboard belongs only to the transparency preview.

## Components

- Primary actions: gray bordered buttons with bold labels, not saturated blocks.
- Secondary actions: blue underlined text with clear focus outlines. Keep button semantics for actions.
- Presets: compact named buttons; selected state uses both weight and fill.
- Ranges: visible numeric values and explanatory labels; retain keyboard interaction.
- Empty state: import, screenshot paste shortcuts, file limits, and examples. Reveal tracing controls only after import.
- Feedback: keep error recovery, busy state, disabled export, and screen-reader status announcements.

## Do's and Don'ts

- Keep the artwork and task ahead of branding.
- Preserve paste, comparison, adjustments, and SVG export.
- Do not reintroduce marketing slogans, purple app styling, oversized upload panels, or decorative badges.
- Do not confuse compactness with tiny text or inaccessible controls.
