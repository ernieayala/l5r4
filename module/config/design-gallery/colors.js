/**
 * @module config/design-gallery/colors
 * @description The Foundations section's color tokens (docs/design-system/foundations/color.md) for the design
 * gallery (module/apps/design-gallery.js), and the reference surface each theme's contrast is measured on.
 */

/**
 * The reference surface each theme's contrast is measured on (docs/design-system/foundations/color.md, Contrast):
 * core paints the surface, so the token is never declared and these values stand in for it.
 */
export const GALLERY_SURFACE = Object.freeze({
  token: "--l5r4-color-surface",
  light: "#d5d3c6",
  dark: "#23222b"
});

/**
 * Color tokens by tier, as foundations/color.md lists them. `against` is the token a ratio is measured against
 * (its pairing in color.md, else the surface); `over` is what a translucent value composites over; `minimum` is the
 * pairing's ratio; `image` marks a token that holds an image, not a color.
 */
export const GALLERY_COLORS = Object.freeze([
  {
    group: "l5r4.apps.designGallery.color.core",
    tokens: [
      { token: "--color-light-1" },
      { token: "--color-light-2" },
      { token: "--color-light-5" },
      { token: "--color-light-6" },
      { token: "--color-dark-1" },
      { token: "--color-dark-2" },
      { token: "--color-dark-3" },
      { token: "--color-dark-4" },
      { token: "--color-dark-5" },
      { token: "--color-dark-6" },
      { token: "--color-cool-4" },
      { token: "--color-cool-5-90" },
      { token: "--color-warm-1" },
      { token: "--color-warm-2" },
      { token: "--color-level-success" },
      { token: "--color-level-info" },
      { token: "--color-level-warning" }
    ]
  },
  {
    group: "l5r4.apps.designGallery.color.palette",
    tokens: [
      { token: "--l5r4-palette-slate-500" },
      { token: "--l5r4-palette-blue-600" },
      { token: "--l5r4-palette-brown-700" },
      { token: "--l5r4-palette-rust-600" },
      { token: "--l5r4-palette-mauve-500" },
      { token: "--l5r4-palette-brick-500" },
      { token: "--l5r4-palette-red-600" },
      { token: "--l5r4-palette-red-400" },
      { token: "--l5r4-palette-amber-500" },
      { token: "--l5r4-palette-gray-500" },
      { token: "--l5r4-palette-gray-400" },
      { token: "--l5r4-palette-black" },
      { token: "--l5r4-palette-white" }
    ]
  },
  {
    group: "l5r4.apps.designGallery.color.role",
    tokens: [
      { token: "--l5r4-color-surface", against: "--l5r4-color-text", minimum: 4.5 },
      {
        token: "--l5r4-color-panel",
        against: "--l5r4-color-text",
        over: "--l5r4-color-surface",
        minimum: 4.5
      },
      {
        token: "--l5r4-color-row-alt",
        against: "--l5r4-color-text",
        over: "--l5r4-color-surface",
        minimum: 4.5
      },
      { token: "--l5r4-color-line" },
      { token: "--l5r4-color-line-muted" },
      { token: "--l5r4-color-divider" },
      { token: "--l5r4-color-text", minimum: 4.5 },
      { token: "--l5r4-color-text-muted", minimum: 4.5 },
      {
        token: "--l5r4-color-header",
        against: "--l5r4-color-text-on-header",
        over: "--l5r4-color-surface",
        minimum: 4.5
      },
      { token: "--l5r4-color-text-on-header", against: "--l5r4-color-header", minimum: 4.5 },
      { token: "--l5r4-color-action", against: "--l5r4-color-action-text", minimum: 4.5 },
      { token: "--l5r4-color-action-text", against: "--l5r4-color-action", minimum: 4.5 },
      { token: "--l5r4-color-accent", minimum: 3 },
      { token: "--l5r4-color-danger", minimum: 4.5 },
      { token: "--l5r4-color-success" },
      { token: "--l5r4-color-info" },
      { token: "--l5r4-color-warning", minimum: 3 },
      { token: "--l5r4-color-shadow" },
      { token: "--l5r4-color-shadow-strong" },
      { token: "--l5r4-color-scrim" }
    ]
  },
  {
    group: "l5r4.apps.designGallery.color.domain",
    tokens: [
      { token: "--l5r4-color-ring-air", against: "--l5r4-color-ring-text", minimum: 4.5 },
      { token: "--l5r4-color-ring-water", against: "--l5r4-color-ring-text", minimum: 4.5 },
      { token: "--l5r4-color-ring-earth", against: "--l5r4-color-ring-text", minimum: 4.5 },
      { token: "--l5r4-color-ring-fire", against: "--l5r4-color-ring-text", minimum: 4.5 },
      { token: "--l5r4-color-ring-void", against: "--l5r4-color-ring-text", minimum: 4.5 },
      {
        token: "--l5r4-color-ring-air-fill",
        against: "--l5r4-color-ring-text",
        over: "--l5r4-color-surface",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-water-fill",
        against: "--l5r4-color-ring-text",
        over: "--l5r4-color-surface",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-earth-fill",
        against: "--l5r4-color-ring-text",
        over: "--l5r4-color-surface",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-fire-fill",
        against: "--l5r4-color-ring-text",
        over: "--l5r4-color-surface",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-air-tint",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-face",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-water-tint",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-face",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-earth-tint",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-face",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-fire-tint",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-face",
        minimum: 3
      },
      {
        token: "--l5r4-color-ring-void-tint",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-face",
        minimum: 3
      },
      { token: "--l5r4-color-ring-text", against: "--l5r4-color-ring-air", minimum: 4.5 },
      {
        token: "--l5r4-color-ring-rank-face",
        against: "--l5r4-color-text",
        over: "--l5r4-color-ring-rank-backdrop"
      },
      {
        token: "--l5r4-color-ring-rank-backdrop",
        against: "--l5r4-color-text",
        over: "--l5r4-color-surface"
      },
      { token: "--l5r4-image-ring-rank-backdrop", image: true },
      { token: "--l5r4-color-void-point", minimum: 3 },
      { token: "--l5r4-color-void-point-hover", minimum: 3 },
      {
        token: "--l5r4-color-float-wounds-up",
        against: "--l5r4-color-float-stroke",
        minimum: 3
      },
      {
        token: "--l5r4-color-float-wounds-down",
        against: "--l5r4-color-float-stroke",
        minimum: 3
      },
      { token: "--l5r4-color-float-void-up", against: "--l5r4-color-float-stroke", minimum: 3 },
      {
        token: "--l5r4-color-float-void-down",
        against: "--l5r4-color-float-stroke",
        minimum: 3
      },
      { token: "--l5r4-color-float-stroke", against: "--l5r4-color-float-wounds-up" }
    ]
  }
]);
