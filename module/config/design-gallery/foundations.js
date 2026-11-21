/**
 * @module config/design-gallery/foundations
 * @description The Foundations section's type, space, size, frame, motion, layer, state, and icon entries
 * (docs/design-system/foundations/) for the design gallery (module/apps/design-gallery.js); the color tokens are
 * colors.js.
 */

/** The faces and the type scale (foundations/typography.md); `core` is the core variable each is built on. */
export const GALLERY_TYPE = Object.freeze({
  faces: [
    { token: "--l5r4-font-body", core: "--font-body" },
    { token: "--l5r4-font-display", core: "--font-h1" },
    { token: "--l5r4-font-label", core: "--font-h4" },
    { token: "--l5r4-font-number", core: "--font-h3" },
    { token: "--l5r4-font-code", core: "--font-monospace" }
  ],
  steps: [
    { step: "meta", token: "--l5r4-font-size-meta", core: "--font-size-12" },
    { step: "body", token: "--l5r4-font-size-body", core: "--font-size-14" },
    { step: "label", token: "--l5r4-font-size-label", core: "--font-size-16" },
    { step: "title", token: "--l5r4-font-size-title", core: "--font-size-18" },
    { step: "rank", token: "--l5r4-font-size-rank" },
    { step: "medallion", token: "--l5r4-font-size-medallion", core: "--font-size-28" }
  ]
});

/**
 * The space scale, semantic spacing, and size scale (foundations/space-and-size.md, iconography.md). `bar` names the
 * modifier the gallery stylesheet draws the token's bar with.
 */
export const GALLERY_SPACE = Object.freeze({
  steps: [
    { token: "--l5r4-space-4", bar: "space-4", core: "--spacer-4" },
    { token: "--l5r4-space-8", bar: "space-8", core: "--spacer-8" },
    { token: "--l5r4-space-12", bar: "space-12", core: "--spacer-12" },
    { token: "--l5r4-space-16", bar: "space-16", core: "--spacer-16" },
    { token: "--l5r4-space-24", bar: "space-24" }
  ],
  semantic: [
    { token: "--l5r4-space-gap-tight", bar: "space-gap-tight" },
    { token: "--l5r4-space-gap", bar: "space-gap" },
    { token: "--l5r4-space-control-block", bar: "space-control-block" },
    { token: "--l5r4-space-control-inline", bar: "space-control-inline" },
    { token: "--l5r4-space-card", bar: "space-card" },
    { token: "--l5r4-space-section", bar: "space-section" },
    { token: "--l5r4-space-indent", bar: "space-indent" }
  ],
  sizes: [
    { token: "--l5r4-size-portrait" },
    { token: "--l5r4-size-medallion" },
    { token: "--l5r4-size-ring-rank" },
    { token: "--l5r4-size-trait-rank" },
    { token: "--l5r4-size-item-icon" },
    { token: "--l5r4-size-rank-block" },
    { token: "--l5r4-size-void-point" },
    { token: "--l5r4-size-stepper" },
    { token: "--l5r4-size-target" },
    { token: "--l5r4-size-column-60" },
    { token: "--l5r4-size-column-80" },
    { token: "--l5r4-size-column-100" },
    { token: "--l5r4-size-column-120" },
    { token: "--l5r4-size-column-150" },
    { token: "--l5r4-size-column-controls" },
    { token: "--l5r4-size-icon-sm" }
  ]
});

/**
 * Frames, motion, layers, and states (foundations/frames.md, motion.md, layers.md, states.md). `frame` names the
 * modifier the gallery stylesheet draws a frame sample with.
 */
export const GALLERY_FRAMES = Object.freeze({
  frames: [
    { token: "--l5r4-border-width-thin", frame: "border-width-thin" },
    { token: "--l5r4-border-width-thick", frame: "border-width-thick" },
    { token: "--l5r4-border-width-band", frame: "border-width-band" },
    { token: "--l5r4-radius-sm", frame: "radius-sm" },
    { token: "--l5r4-radius-round", frame: "radius-round" },
    { token: "--l5r4-shadow-raised", frame: "shadow-raised" },
    { token: "--l5r4-shadow-drop", frame: "shadow-drop" },
    { token: "--l5r4-shadow-text-halo", frame: "shadow-text-halo" }
  ],
  others: [
    { token: "--l5r4-duration-fast" },
    { token: "--l5r4-duration-sprite" },
    { token: "--l5r4-easing-standard" },
    { token: "--l5r4-layer-behind" },
    { token: "--l5r4-layer-raised" },
    { token: "--l5r4-layer-medallion" },
    { token: "--l5r4-layer-control" },
    { token: "--l5r4-state-hover-filter" },
    { token: "--l5r4-state-pressed-filter" },
    { token: "--l5r4-state-pressed-transform" },
    { token: "--l5r4-state-focus-color" },
    { token: "--l5r4-state-focus-outline" },
    { token: "--l5r4-state-focus-shadow" },
    { token: "--l5r4-state-selected-outline" },
    { token: "--l5r4-state-disabled-opacity" }
  ]
});

/** One icon per meaning (foundations/iconography.md rule 3), in the table's order. */
export const GALLERY_ICONS = Object.freeze([
  { meaning: "l5r4.apps.designGallery.icons.add", icons: ["fa-plus"] },
  { meaning: "l5r4.apps.designGallery.icons.subtract", icons: ["fa-minus"] },
  { meaning: "l5r4.apps.designGallery.icons.edit", icons: ["fa-pen-to-square"] },
  { meaning: "l5r4.apps.designGallery.icons.delete", icons: ["fa-trash"] },
  { meaning: "l5r4.apps.designGallery.icons.save", icons: ["fa-floppy-disk"] },
  { meaning: "l5r4.apps.designGallery.icons.configure", icons: ["fa-gear"] },
  { meaning: "l5r4.apps.designGallery.icons.expand", icons: ["fa-angle-down", "fa-angle-up"] },
  { meaning: "l5r4.apps.designGallery.icons.step", icons: ["fa-chevron-up", "fa-chevron-down"] },
  { meaning: "l5r4.apps.designGallery.icons.sorted", icons: ["fa-sort-up", "fa-sort-down"] },
  { meaning: "l5r4.apps.designGallery.icons.currentWoundLevel", icons: ["fa-check"] },
  { meaning: "l5r4.apps.designGallery.icons.convertCoin", icons: ["fa-arrow-up", "fa-arrow-down"] },
  { meaning: "l5r4.apps.designGallery.icons.recalculate", icons: ["fa-arrows-rotate"] },
  { meaning: "l5r4.apps.designGallery.icons.openWealthManager", icons: ["fa-calculator"] },
  { meaning: "l5r4.apps.designGallery.icons.openXpManager", icons: ["fa-chart-line"] },
  { meaning: "l5r4.apps.designGallery.icons.openConditionManager", icons: ["fa-heart-pulse"] },
  { meaning: "l5r4.apps.designGallery.icons.applyHealing", icons: ["fa-bed"] },
  { meaning: "l5r4.apps.designGallery.icons.manageEmphases", icons: ["fa-list-check"] },
  { meaning: "l5r4.apps.designGallery.icons.openLedger", icons: ["fa-book-bookmark"] },
  { meaning: "l5r4.apps.designGallery.icons.rules", icons: ["fa-scroll"] },
  {
    meaning: "l5r4.apps.designGallery.icons.toggleEffect",
    icons: ["fa-toggle-on", "fa-toggle-off"]
  },
  {
    meaning: "l5r4.apps.designGallery.icons.activation",
    icons: ["fa-circle-play", "fa-circle-stop"]
  },
  { meaning: "l5r4.apps.designGallery.icons.postToChat", icons: ["fa-comment"] },
  { meaning: "l5r4.apps.designGallery.icons.postRequest", icons: ["fa-comment-dots"] },
  { meaning: "l5r4.apps.designGallery.icons.rollCheck", icons: ["fa-dice-d10"] },
  { meaning: "l5r4.apps.designGallery.icons.reroll", icons: ["fa-dice"] },
  { meaning: "l5r4.apps.designGallery.icons.contested", icons: ["fa-scale-balanced"] },
  { meaning: "l5r4.apps.designGallery.icons.damageLink", icons: ["fa-burst"] },
  { meaning: "l5r4.apps.designGallery.icons.conditionLink", icons: ["fa-person-falling-burst"] },
  { meaning: "l5r4.apps.designGallery.icons.fearLink", icons: ["fa-ghost"] },
  { meaning: "l5r4.apps.designGallery.icons.brokenLink", icons: ["fa-link-slash"] },
  { meaning: "l5r4.apps.designGallery.icons.openSource", icons: ["fa-up-right-from-square"] },
  { meaning: "l5r4.apps.designGallery.icons.importEntry", icons: ["fa-download"] },
  {
    meaning: "l5r4.apps.designGallery.icons.transferFolder",
    icons: ["fa-file-export", "fa-file-import"]
  },
  { meaning: "l5r4.apps.designGallery.icons.openBrowser", icons: ["fa-books"] },
  { meaning: "l5r4.apps.designGallery.icons.openEffectPanel", icons: ["fa-hourglass-half"] },
  { meaning: "l5r4.apps.designGallery.icons.configureAttack", icons: ["fa-swords"] },
  { meaning: "l5r4.apps.designGallery.icons.startDuel", icons: ["fa-khanda"] },
  { meaning: "l5r4.apps.designGallery.icons.guard", icons: ["fa-shield-halved"] },
  { meaning: "l5r4.apps.designGallery.icons.endEncounter", icons: ["fa-flag-checkered"] },
  { meaning: "l5r4.apps.designGallery.icons.newSession", icons: ["fa-calendar-plus"] },
  { meaning: "l5r4.apps.designGallery.icons.warning", icons: ["fa-triangle-exclamation"] },
  { meaning: "l5r4.apps.designGallery.icons.invalid", icons: ["fa-circle-exclamation"] },
  { meaning: "l5r4.apps.designGallery.icons.locked", icons: ["fa-lock"] },
  { meaning: "l5r4.apps.designGallery.icons.loading", icons: ["fa-spinner fa-spin"] }
]);
