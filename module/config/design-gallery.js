/**
 * @module config/design-gallery
 * @description Fixture data for the design gallery (module/apps/design-gallery.js, roadmap/STAGE-17 Deliverable 2):
 * the tokens docs/design-system/foundations/ names, and for every component page the real templates that draw it
 * with the context each sample renders from. Plain data only.
 *
 * A value `{ i18n, data }` is a phrase: the gallery localizes it with `data` before rendering, as the code that
 * builds the real context does. A sample's `context` names a base context below; its `with` is merged over it.
 */

const freeze = Object.freeze;

/** The system's template root, as the samples name it. */
const T = "systems/l5r4-enhanced/templates";

/** Sample document text: a sentence long enough to wrap. */
const DESCRIPTION = freeze({ i18n: "l5r4.apps.designGallery.sample.description" });

/**
 * The reference surface each theme's contrast is measured on (docs/design-system/foundations/color.md, Contrast):
 * core paints the surface, so the token is never declared and these values stand in for it.
 */
export const GALLERY_SURFACE = freeze({
  token: "--l5r4-color-surface",
  light: "#d5d3c6",
  dark: "#23222b"
});

/**
 * Color tokens by tier, as foundations/color.md lists them. `against` is the token a ratio is measured against
 * (its pairing in color.md, else the surface); `over` is what a translucent value composites over; `minimum` is the
 * pairing's ratio; `image` marks a token that holds an image, not a color.
 */
export const GALLERY_COLORS = freeze([
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

/** The faces and the type scale (foundations/typography.md); `core` is the core variable each is built on. */
export const GALLERY_TYPE = freeze({
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
export const GALLERY_SPACE = freeze({
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
export const GALLERY_FRAMES = freeze({
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
export const GALLERY_ICONS = freeze([
  { meaning: "l5r4.apps.designGallery.icons.add", icons: ["fa-plus"] },
  { meaning: "l5r4.apps.designGallery.icons.subtract", icons: ["fa-minus"] },
  { meaning: "l5r4.apps.designGallery.icons.edit", icons: ["fa-pen-to-square"] },
  { meaning: "l5r4.apps.designGallery.icons.delete", icons: ["fa-trash"] },
  { meaning: "l5r4.apps.designGallery.icons.save", icons: ["fa-floppy-disk"] },
  { meaning: "l5r4.apps.designGallery.icons.configure", icons: ["fa-gear"] },
  { meaning: "l5r4.apps.designGallery.icons.expand", icons: ["fa-angle-down", "fa-angle-up"] },
  { meaning: "l5r4.apps.designGallery.icons.step", icons: ["fa-chevron-up", "fa-chevron-down"] },
  { meaning: "l5r4.apps.designGallery.icons.sorted", icons: ["fa-sort-up", "fa-sort-down"] },
  { meaning: "l5r4.apps.designGallery.icons.currentWoundRank", icons: ["fa-check"] },
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
  { meaning: "l5r4.apps.designGallery.icons.openBrowser", icons: ["fa-book-atlas"] },
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

/** Wound Ranks at Earth 2, with the current rank set by each sample. */
const WOUND_LEVELS = freeze({
  healthy: { value: 10, penalty: 0, penaltyEff: 0, current: true },
  nicked: { value: 14, penalty: 3, penaltyEff: 3, current: false },
  grazed: { value: 18, penalty: 5, penaltyEff: 5, current: false },
  hurt: { value: 22, penalty: 10, penaltyEff: 10, current: false },
  injured: { value: 26, penalty: 15, penaltyEff: 15, current: false },
  crippled: { value: 30, penalty: 20, penaltyEff: 20, current: false },
  down: { value: 34, penalty: 40, penaltyEff: 40, current: false },
  out: { value: 38, penalty: 40, penaltyEff: 40, current: false }
});

/** One row per Item subtype, in the shape the sheet's sorted lists give the section partials. */
const ROWS = freeze({
  skills: [
    {
      id: "gallerySkill1",
      name: "Kenjutsu",
      type: "skill",
      system: {
        rank: 3,
        trait: "agi",
        school: true,
        rollDice: 7,
        rollKeep: 4,
        trainedEmphases: ["Katana"],
        description: DESCRIPTION
      }
    },
    {
      id: "gallerySkill2",
      name: { i18n: "l5r4.apps.designGallery.sample.longName" },
      type: "skill",
      system: { rank: 1, trait: "awa", rollDice: 4, rollKeep: 3, trainedEmphases: [] }
    }
  ],
  weapons: [
    {
      id: "galleryWeapon1",
      name: "Katana",
      type: "weapon",
      attackFormula: "7k4",
      system: { damageRoll: 3, damageKeep: 2, description: DESCRIPTION }
    },
    {
      id: "galleryWeapon2",
      name: "Yumi",
      type: "weapon",
      attackFormula: "6k3",
      system: { damageRoll: 2, damageKeep: 2, isBow: true, arrow: "willow" }
    }
  ],
  armors: [
    {
      id: "galleryArmor1",
      name: "Light Armor",
      type: "armor",
      system: { bonus: 5, reduction: 3, equipped: true, description: DESCRIPTION }
    }
  ],
  items: [{ id: "galleryItem1", name: "Traveling pack", type: "commonItem", system: {} }],
  spells: [
    {
      id: "gallerySpell1",
      name: "Path to Inner Peace",
      type: "spell",
      system: { ring: "water", mastery: 1, castFormula: "5k3", description: DESCRIPTION }
    }
  ],
  techniques: [
    {
      id: "galleryTechnique1",
      name: "Way of the Crane",
      type: "technique",
      system: { rank: 1, description: DESCRIPTION }
    }
  ],
  kihos: [
    {
      id: "galleryKiho1",
      name: "Cleansing Spirit",
      type: "kiho",
      system: { ring: "water", mastery: 2, type: "internal" }
    }
  ],
  katas: [
    {
      id: "galleryKata1",
      name: "Striking as Air",
      type: "kata",
      system: { ring: "air", mastery: 3, description: DESCRIPTION }
    },
    {
      id: "galleryKata2",
      name: "Striking as Fire",
      type: "kata",
      system: { ring: "fire", mastery: 3 }
    }
  ],
  tattoos: [
    {
      id: "galleryTattoo1",
      name: "Bamboo",
      type: "tattoo",
      system: { effect: { i18n: "l5r4.apps.designGallery.sample.tattooEffect" } }
    }
  ],
  advantages: [
    {
      id: "galleryAdvantage1",
      name: "Quick",
      type: "advantage",
      system: { type: "physical", cost: 6, description: DESCRIPTION }
    }
  ],
  disadvantages: [
    {
      id: "galleryDisadvantage1",
      name: "Proud",
      type: "disadvantage",
      system: { type: "mental", cost: 2 }
    }
  ]
});

/** The base contexts the samples render from, shaped as the sheets' and services' own contexts. */
export const GALLERY_CONTEXTS = freeze({
  pc: {
    actor: {
      name: { i18n: "l5r4.apps.designGallery.sample.pcName" },
      type: "pc",
      img: "icons/svg/mystery-man.svg"
    },
    editable: false,
    isGM: true,
    system: {
      clan: "Crane",
      school: "Kakita Bushi",
      insight: { rank: 2, points: 162, autoCalculate: true },
      _xp: { spent: 34, total: 52 },
      rings: { earth: 1, air: 3, water: 5, fire: 10, void: { rank: 2, value: 1 } },
      traits: { sta: 1, wil: 2, ref: 3, awa: 4, str: 5, per: 6, agi: 10, int: 10 },
      honor: { rank: 6, points: 5 },
      glory: { rank: 1, points: 0 },
      status: { rank: 10, points: 9 },
      shadowTaint: { rank: 0, points: 0 },
      initiative: { roll: 5, keep: 3, totalMod: 0, useVoid: false },
      movement: { showSimple: true, simpleAction: 15, freeAction: 5, maximum: 20 },
      armorTn: { current: 20, reduction: 3 },
      suffered: 0,
      wounds: { healRate: 6, mod: 0, max: 38 },
      woundLevels: WOUND_LEVELS,
      wealth: { koku: 3, bu: 5, zeni: 10 },
      spellSlots: { water: 0, air: 1, fire: 9, earth: 3, void: 0 },
      notes: ""
    },
    traitsEff: { sta: 1, wil: 2, ref: 3, awa: 4, str: 5, per: 6, agi: 10, int: 10 },
    currentStance: "attackStance",
    voidArmor: false,
    collapsedSections: {},
    activeItemIds: [],
    enriched: { notes: "" },
    skills: [],
    weapons: [],
    bows: [],
    armors: [],
    items: [],
    spells: [],
    techniques: [],
    kihos: [],
    katas: [],
    tattoos: [],
    advantages: [],
    disadvantages: []
  },
  npc: {
    actor: {
      name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
      type: "npc",
      img: "icons/svg/mystery-man.svg"
    },
    editable: false,
    showNpcVoidPoints: true,
    summary: {
      citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 300 } }
    },
    system: {
      rings: { earth: 3, air: 2, water: 2, fire: 3, void: { rank: 2, value: 2 } },
      traits: { sta: 3, wil: 3, ref: 2, awa: 2, str: 3, per: 2, agi: 3, int: 3 },
      initiative: { roll: 4, keep: 2, totalMod: 0, useVoid: false },
      movement: { showSimple: false, simpleAction: 10, freeAction: 5, maximum: 15 },
      armor: { armorTn: 25, reduction: 3 },
      suffered: 12,
      woundMode: "formula",
      wounds: { max: 57 },
      visibleWoundLevels: {
        healthy: { value: 15, penaltyEff: 0, current: false },
        nicked: { value: 21, penaltyEff: 3, current: true },
        out: { value: 57, penaltyEff: 40, current: false }
      },
      fear: { rank: 3 },
      notes: ""
    },
    traitsEff: { sta: 3, wil: 3, ref: 2, awa: 2, str: 3, per: 2, agi: 3, int: 3 },
    currentStance: "",
    collapsedSections: {},
    enriched: { notes: "" },
    firstEmptyAttack: "attack3",
    attacks: [
      {
        key: "attack1",
        num: 1,
        attack: { name: "Claws", roll: 6, keep: 3, modifier: 0, type: "Melee", action: "Simple" },
        damage: { roll: 4, keep: 2, modifier: 2 }
      },
      {
        key: "attack2",
        num: 2,
        attack: { name: "", roll: 5, keep: 2, modifier: 0, type: "Melee", action: "Complex" },
        damage: { roll: 3, keep: 2, modifier: 0 }
      }
    ],
    skills: ROWS.skills
  },
  item: {
    item: {
      name: "Katana",
      type: "weapon",
      img: "icons/svg/sword.svg"
    },
    editable: false,
    currentTab: "details",
    summary: {
      citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 200 } }
    },
    system: {
      isBow: false,
      size: "medium",
      minStrength: 0,
      fallbackTrait: "agi",
      keywords: "Samurai",
      nemuranai: false,
      price: { koku: 20, bu: 0, zeni: 0 }
    },
    effects: []
  },
  plain: {}
});

/** Evaluated rolls in core's stored shape, so a dice row renders the same dice every time. */
export const GALLERY_ROLLS = freeze({
  skilled: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "6d10xa10k3 + 0",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 6,
        faces: 10,
        modifiers: ["xa10", "k3"],
        results: [
          { result: 17, active: true, exploded: true },
          { result: 8, active: true },
          { result: 6, active: true },
          { result: 5, active: false, discarded: true },
          { result: 3, active: false, discarded: true },
          { result: 1, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 0 }
    ],
    total: 31,
    evaluated: true
  },
  unskilled: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "4d10k2 + 0",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 4,
        faces: 10,
        modifiers: ["k2"],
        results: [
          { result: 10, active: true },
          { result: 7, active: true },
          { result: 4, active: false, discarded: true },
          { result: 2, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 0 }
    ],
    total: 17,
    evaluated: true
  },
  emphasis: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "5d10r1xa10k3 + 5",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 5,
        faces: 10,
        modifiers: ["r1", "xa10", "k3"],
        results: [
          { result: 1, active: false, rerolled: true },
          { result: 9, active: true },
          { result: 7, active: true },
          { result: 6, active: true },
          { result: 4, active: false, discarded: true },
          { result: 2, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 5 }
    ],
    total: 27,
    evaluated: true
  }
});

/** A check card's context, shared by its variants. */
const CHECK = freeze({
  kind: "skill",
  label: "Kenjutsu",
  target: { name: "" },
  appliedModifiers: [{ label: { i18n: "l5r4.apps.designGallery.sample.modifier" }, text: "+1k0" }],
  tn: { effective: 20, raises: 1, freeRaisesToTN: 0, woundPenalty: 3 },
  outcome: { success: true },
  outcomeText: { i18n: "l5r4.ui.mechanics.rolls.success" },
  notes: [],
  maneuverNotes: [],
  sources: [],
  conditions: []
});

/** The check dialog's context with every part the roll can offer. */
const DIALOG = freeze({
  pool: "7k4",
  modifiers: [
    {
      label: { i18n: "l5r4.apps.designGallery.sample.modifier" },
      text: "+1k0",
      enabled: true,
      range: ""
    },
    {
      label: { i18n: "l5r4.apps.designGallery.sample.modifierOff" },
      text: "+0k1",
      enabled: false,
      range: "melee"
    }
  ],
  substitutes: [
    { label: { i18n: "l5r4.apps.designGallery.sample.substitute" }, text: "Agility → Reflexes" }
  ],
  hasTN: true,
  tn: 20,
  tnModifiers: [{ label: { i18n: "l5r4.apps.designGallery.sample.modifier" }, value: 5 }],
  woundPenalty: 3,
  raisesAllowed: true,
  maxRaises: 2,
  minRaises: 0,
  freeRaises: 1,
  voidAllowed: true,
  voidPoints: 2,
  voidOverLimit: true,
  emphases: ["Katana"],
  isAttack: true,
  ranged: false,
  socialResistance: true,
  honorRank: 6,
  embraceTaint: true
});

/**
 * Every component page in docs/design-system/components/, in the README's order. Each sample renders `partial`
 * with its context in a frame `scope` picks: `pc`, `npc`, and `item` are the sheets' own style scope, `chat` a chat
 * message, `effect-panel` and `compendium-browser` the window's root, `plain` none. `partials` and `scss` name what
 * the page draws with today; `seeAlso` names pages whose samples show this component too; `notes` say what the
 * gallery cannot show and why.
 */
export const GALLERY_COMPONENTS = freeze([
  {
    page: "button",
    partials: [
      `${T}/actor/_partials/_fear.hbs`,
      `${T}/actor/_partials/_skill-section.hbs`,
      `${T}/cards/skill.hbs`
    ],
    scss: [
      "scss/components/_button.scss",
      "scss/components/_animations.scss",
      "scss/features/_traits-rings.scss"
    ],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.coreButton",
        partial: `${T}/actor/_partials/_fear.hbs`,
        scope: "npc",
        context: "npc"
      },
      {
        label: "l5r4.apps.designGallery.samples.rollButton",
        partial: `${T}/actor/_partials/_skill-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { skills: ROWS.skills }
      }
    ],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.pseudoStates", "l5r4.apps.designGallery.notes.readOnly"]
  },
  {
    page: "icon-button",
    partials: [`${T}/actor/_partials/_unified-item-create.hbs`],
    scss: [],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.addItem",
        partial: `${T}/actor/_partials/_unified-item-create.hbs`,
        scope: "pc",
        context: "pc"
      }
    ],
    seeAlso: ["section", "initiative-block", "wound-track"],
    notes: ["l5r4.apps.designGallery.notes.pseudoStates", "l5r4.apps.designGallery.notes.loading"]
  },
  {
    page: "inline-control",
    partials: [
      `${T}/cards/_partials/_controls.hbs`,
      `${T}/cards/_partials/_activate.hbs`,
      `${T}/item/_partials/_tab-effects.hbs`
    ],
    scss: [
      "scss/components/_item-row.scss",
      "scss/components/_form-field.scss",
      "scss/components/_inline-control.scss"
    ],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.rowControls",
        partial: `${T}/cards/_partials/_controls.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.activationOff",
        partial: `${T}/cards/_partials/_activate.hbs`,
        scope: "pc",
        context: "pc",
        with: { active: false }
      },
      {
        label: "l5r4.apps.designGallery.samples.activationOn",
        partial: `${T}/cards/_partials/_activate.hbs`,
        scope: "pc",
        context: "pc",
        with: { active: true }
      },
      {
        label: "l5r4.apps.designGallery.samples.effectsTab",
        partial: `${T}/item/_partials/_tab-effects.hbs`,
        scope: "item",
        context: "item",
        with: {
          currentTab: "effects",
          editable: true,
          effects: [
            {
              id: "galleryEffect1",
              name: { i18n: "l5r4.apps.designGallery.sample.effectName" },
              disabled: false
            },
            {
              id: "galleryEffect2",
              name: { i18n: "l5r4.apps.designGallery.sample.effectName" },
              disabled: true
            }
          ]
        }
      }
    ],
    seeAlso: ["item-row"],
    notes: ["l5r4.apps.designGallery.notes.reveal", "l5r4.apps.designGallery.notes.loading"]
  },
  {
    page: "form-field",
    partials: [`${T}/item/_partials/_tab-details.hbs`, `${T}/item/_partials/_tab-modifiers.hbs`],
    scss: ["scss/components/_form-field.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.coreFields",
        partial: `${T}/item/_partials/_tab-details.hbs`,
        scope: "item",
        context: "item"
      },
      {
        label: "l5r4.apps.designGallery.samples.modifierFields",
        partial: `${T}/item/_partials/_tab-modifiers.hbs`,
        scope: "item",
        context: "item",
        with: { currentTab: "modifiers" }
      }
    ],
    seeAlso: ["ring-trait-block", "item-row", "grid"],
    notes: ["l5r4.apps.designGallery.notes.invalidWarningLocked"]
  },
  {
    page: "grid",
    partials: [`${T}/actor/_partials/_wounds.hbs`],
    scss: ["scss/components/_grid.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.gridWithFullRow",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "pc",
        context: "pc"
      }
    ],
    seeAlso: ["initiative-block", "armor-tn-block", "fear-block"],
    notes: []
  },
  {
    page: "section",
    partials: [
      `${T}/actor/_partials/_skill-section.hbs`,
      `${T}/actor/_partials/_item-section.hbs`,
      `${T}/actor/_partials/_bio.hbs`
    ],
    scss: ["scss/components/_section.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.listOpen",
        partial: `${T}/actor/_partials/_skill-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { skills: ROWS.skills }
      },
      {
        label: "l5r4.apps.designGallery.samples.listCollapsed",
        partial: `${T}/actor/_partials/_skill-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { skills: ROWS.skills, collapsedSections: { skills: true } }
      },
      {
        label: "l5r4.apps.designGallery.samples.titleTools",
        partial: `${T}/actor/_partials/_item-section.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.bio",
        partial: `${T}/actor/_partials/_bio.hbs`,
        scope: "pc",
        context: "pc",
        with: {
          bioClan: { id: "galleryClan", name: "Crane", system: { description: DESCRIPTION } },
          bioFamily: { id: "galleryFamily", name: "Kakita", system: {} },
          bioSchool: { id: "gallerySchool", name: "Kakita Bushi", system: {} }
        }
      }
    ],
    seeAlso: ["initiative-block", "spell-slots", "ring-trait-block"],
    notes: []
  },
  {
    page: "expand-control",
    partials: [`${T}/actor/_partials/_expand.hbs`],
    scss: [],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.expandSection",
        partial: `${T}/actor/_partials/_expand.hbs`,
        scope: "pc",
        context: "pc"
      }
    ],
    seeAlso: ["section", "item-row"],
    notes: ["l5r4.apps.designGallery.notes.expandState"]
  },
  {
    page: "item-row",
    partials: [
      `${T}/actor/_partials/_skill-section.hbs`,
      `${T}/actor/_partials/_weapon-section.hbs`,
      `${T}/actor/_partials/_armor-section.hbs`,
      `${T}/actor/_partials/_item-section.hbs`,
      `${T}/actor/_partials/_spell-section.hbs`,
      `${T}/actor/_partials/_technique-section.hbs`,
      `${T}/actor/_partials/_kiho-section.hbs`,
      `${T}/actor/_partials/_kata-section.hbs`,
      `${T}/actor/_partials/_tattoo-section.hbs`,
      `${T}/actor/_partials/_advantage-section.hbs`,
      `${T}/actor/_partials/_disadvantage-section.hbs`
    ],
    scss: ["scss/components/_item-row.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.skillRows",
        partial: `${T}/actor/_partials/_skill-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { skills: ROWS.skills }
      },
      {
        label: "l5r4.apps.designGallery.samples.weaponRows",
        partial: `${T}/actor/_partials/_weapon-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { weapons: ROWS.weapons }
      },
      {
        label: "l5r4.apps.designGallery.samples.armorRows",
        partial: `${T}/actor/_partials/_armor-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { armors: ROWS.armors }
      },
      {
        label: "l5r4.apps.designGallery.samples.itemRows",
        partial: `${T}/actor/_partials/_item-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { items: ROWS.items }
      },
      {
        label: "l5r4.apps.designGallery.samples.spellRows",
        partial: `${T}/actor/_partials/_spell-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { spells: ROWS.spells }
      },
      {
        label: "l5r4.apps.designGallery.samples.techniqueRows",
        partial: `${T}/actor/_partials/_technique-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { techniques: ROWS.techniques }
      },
      {
        label: "l5r4.apps.designGallery.samples.kihoRows",
        partial: `${T}/actor/_partials/_kiho-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { kihos: ROWS.kihos }
      },
      {
        label: "l5r4.apps.designGallery.samples.kataRows",
        partial: `${T}/actor/_partials/_kata-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { katas: ROWS.katas, activeItemIds: ["galleryKata1"] }
      },
      {
        label: "l5r4.apps.designGallery.samples.tattooRows",
        partial: `${T}/actor/_partials/_tattoo-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { tattoos: ROWS.tattoos }
      },
      {
        label: "l5r4.apps.designGallery.samples.advantageRows",
        partial: `${T}/actor/_partials/_advantage-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { advantages: ROWS.advantages }
      },
      {
        label: "l5r4.apps.designGallery.samples.disadvantageRows",
        partial: `${T}/actor/_partials/_disadvantage-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { disadvantages: ROWS.disadvantages }
      },
      {
        label: "l5r4.apps.designGallery.samples.emptyList",
        partial: `${T}/actor/_partials/_item-section.hbs`,
        scope: "pc",
        context: "pc"
      }
    ],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.reveal", "l5r4.apps.designGallery.notes.expandState"]
  },
  {
    page: "sort-header",
    partials: [`${T}/actor/_partials/_spell-section.hbs`],
    scss: ["scss/components/_item-row.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.sortHeader",
        partial: `${T}/actor/_partials/_spell-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { spells: ROWS.spells }
      }
    ],
    seeAlso: ["item-row"],
    notes: ["l5r4.apps.designGallery.notes.sorted"]
  },
  {
    page: "tabs",
    partials: [`${T}/item/_partials/_tabs.hbs`],
    scss: ["scss/apps/_compendium-browser.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.twoTabs",
        partial: `${T}/item/_partials/_tabs.hbs`,
        scope: "item",
        context: "item",
        with: {
          tabs: [
            { id: "details", label: { i18n: "l5r4.ui.tabs.details" }, cssClass: "active" },
            { id: "description", label: { i18n: "l5r4.ui.tabs.description" }, cssClass: "" }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.sixTabs",
        partial: `${T}/item/_partials/_tabs.hbs`,
        scope: "item",
        context: "item",
        with: {
          tabs: [
            { id: "details", label: { i18n: "l5r4.ui.tabs.details" }, cssClass: "" },
            { id: "modifiers", label: { i18n: "l5r4.ui.tabs.modifiers" }, cssClass: "active" },
            { id: "description", label: { i18n: "l5r4.ui.tabs.description" }, cssClass: "" },
            { id: "effects", label: { i18n: "l5r4.ui.tabs.effects" }, cssClass: "" },
            { id: "rules", label: { i18n: "l5r4.ui.tabs.rules" }, cssClass: "" },
            {
              id: "extra",
              label: { i18n: "l5r4.apps.designGallery.sample.longName" },
              cssClass: ""
            }
          ]
        }
      }
    ],
    seeAlso: ["compendium-browser"],
    notes: []
  },
  {
    page: "item-header",
    partials: [`${T}/item/_partials/_header.hbs`],
    scss: ["scss/layout/_item-layout.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.withCitation",
        partial: `${T}/item/_partials/_header.hbs`,
        scope: "item",
        context: "item"
      },
      {
        label: "l5r4.apps.designGallery.samples.plainLongName",
        partial: `${T}/item/_partials/_header.hbs`,
        scope: "item",
        context: "item",
        with: {
          item: { name: { i18n: "l5r4.apps.designGallery.sample.longName" } },
          summary: { citation: "" }
        }
      }
    ],
    seeAlso: [],
    notes: ["l5r4.apps.designGallery.notes.readOnly"]
  },
  {
    page: "ring-trait-block",
    partials: [`${T}/actor/_partials/_stats.hbs`, `${T}/actor/_partials/_stats-npc.hbs`],
    scss: ["scss/features/_traits-rings.scss", "scss/features/_pc-info.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.pcHeader",
        partial: `${T}/actor/_partials/_stats.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.npcHeader",
        partial: `${T}/actor/_partials/_stats-npc.hbs`,
        scope: "npc",
        context: "npc"
      }
    ],
    seeAlso: ["rank-control", "void-point-dots", "button"],
    notes: ["l5r4.apps.designGallery.notes.pseudoStates", "l5r4.apps.designGallery.notes.editor"]
  },
  {
    page: "rank-control",
    partials: [`${T}/actor/_partials/_ranks.hbs`],
    scss: ["scss/features/_ranks.scss", "scss/components/_animations.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.rankTracks",
        partial: `${T}/actor/_partials/_ranks.hbs`,
        scope: "pc",
        context: "pc",
        with: { editable: true }
      }
    ],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.pseudoStates"]
  },
  {
    page: "void-point-dots",
    partials: [`${T}/actor/_partials/_stats.hbs`],
    scss: ["scss/features/_traits-rings.scss"],
    samples: [],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.voidDots"]
  },
  {
    page: "wound-track",
    partials: [`${T}/actor/_partials/_wounds.hbs`],
    scss: ["scss/features/_wound-track.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.healthy",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.middleRank",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "pc",
        context: "pc",
        with: {
          system: {
            suffered: 20,
            woundLevels: { healthy: { current: false }, hurt: { current: true } }
          }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.lastRank",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "pc",
        context: "pc",
        with: {
          system: {
            suffered: 38,
            woundLevels: { healthy: { current: false }, out: { current: true } }
          }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.npcTrack",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "npc",
        context: "npc"
      },
      {
        label: "l5r4.apps.designGallery.samples.npcManual",
        partial: `${T}/actor/_partials/_wounds.hbs`,
        scope: "npc",
        context: "npc",
        with: { system: { woundMode: "manual" } }
      }
    ],
    seeAlso: ["grid"],
    notes: ["l5r4.apps.designGallery.notes.woundConfig"]
  },
  {
    page: "initiative-block",
    partials: [`${T}/actor/_partials/_combat.hbs`],
    scss: ["scss/components/_section.scss", "scss/components/_grid.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.voidOffSimple",
        partial: `${T}/actor/_partials/_combat.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.voidOnFree",
        partial: `${T}/actor/_partials/_combat.hbs`,
        scope: "pc",
        context: "pc",
        with: {
          currentStance: "fullDefenseStance",
          system: { initiative: { useVoid: true }, movement: { showSimple: false } }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.noVoidRing",
        partial: `${T}/actor/_partials/_combat.hbs`,
        scope: "pc",
        context: "pc",
        with: { currentStance: "", system: { rings: { void: { rank: 0 } } } }
      }
    ],
    seeAlso: ["grid", "section"],
    notes: []
  },
  {
    page: "armor-tn-block",
    partials: [`${T}/actor/_partials/_armor.hbs`],
    scss: ["scss/components/_section.scss", "scss/components/_grid.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.pcVoidOff",
        partial: `${T}/actor/_partials/_armor.hbs`,
        scope: "pc",
        context: "pc"
      },
      {
        label: "l5r4.apps.designGallery.samples.pcVoidOn",
        partial: `${T}/actor/_partials/_armor.hbs`,
        scope: "pc",
        context: "pc",
        with: { voidArmor: true }
      },
      {
        label: "l5r4.apps.designGallery.samples.noVoidRing",
        partial: `${T}/actor/_partials/_armor.hbs`,
        scope: "pc",
        context: "pc",
        with: { system: { rings: { void: { rank: 0 } } } }
      },
      {
        label: "l5r4.apps.designGallery.samples.npcValues",
        partial: `${T}/actor/_partials/_armor.hbs`,
        scope: "npc",
        context: "npc"
      }
    ],
    seeAlso: ["grid"],
    notes: []
  },
  {
    page: "fear-block",
    partials: [`${T}/actor/_partials/_fear.hbs`],
    scss: [],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.rankZero",
        partial: `${T}/actor/_partials/_fear.hbs`,
        scope: "npc",
        context: "npc",
        with: { system: { fear: { rank: 0 } } }
      },
      {
        label: "l5r4.apps.designGallery.samples.rankThree",
        partial: `${T}/actor/_partials/_fear.hbs`,
        scope: "npc",
        context: "npc"
      },
      {
        label: "l5r4.apps.designGallery.samples.rankTen",
        partial: `${T}/actor/_partials/_fear.hbs`,
        scope: "npc",
        context: "npc",
        with: { system: { fear: { rank: 10 } } }
      }
    ],
    seeAlso: ["button", "grid"],
    notes: []
  },
  {
    page: "spell-slots",
    partials: [`${T}/actor/_partials/_spell-section.hbs`],
    scss: ["scss/components/_section.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.slotCounts",
        partial: `${T}/actor/_partials/_spell-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { spells: ROWS.spells }
      }
    ],
    seeAlso: ["section"],
    notes: ["l5r4.apps.designGallery.notes.pseudoStates"]
  },
  {
    page: "chat-card",
    partials: [`${T}/chat/healing.hbs`, `${T}/chat/weapon-chat.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.healingCard",
        partial: `${T}/chat/healing.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          actorName: { i18n: "l5r4.apps.designGallery.sample.pcName" },
          healingText: {
            i18n: "l5r4.ui.mechanics.wounds.healingApplied",
            data: { amount: 6, rate: 6 }
          },
          woundsText: {
            i18n: "l5r4.ui.mechanics.wounds.status",
            data: { current: 38, max: 38, suffered: 0 }
          },
          wasFullyHealed: true,
          spellSlotsRestored: true,
          voidRestored: 2
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.weaponCard",
        partial: `${T}/chat/weapon-chat.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: { description: DESCRIPTION }
      }
    ],
    seeAlso: ["check-card", "request-card", "damage-result", "effect-prompt", "flow-card"],
    notes: ["l5r4.apps.designGallery.notes.chatFrame"]
  },
  {
    page: "dice-row",
    partials: [`${T}/chat/check.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.skilledRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      },
      {
        label: "l5r4.apps.designGallery.samples.unskilledRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "unskilled",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      },
      {
        label: "l5r4.apps.designGallery.samples.emphasisRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "emphasis",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      }
    ],
    seeAlso: ["check-card"],
    notes: ["l5r4.apps.designGallery.notes.expandRoll"]
  },
  {
    page: "check-card",
    partials: [`${T}/chat/check.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.success",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          freeRaisesLeft: 1,
          notes: [{ i18n: "l5r4.apps.designGallery.sample.note" }]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.failureHonorRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "unskilled",
        with: {
          ...CHECK,
          tn: { effective: 30, raises: 0, freeRaisesToTN: 0, woundPenalty: 0 },
          outcome: { success: false },
          outcomeText: { i18n: "l5r4.ui.mechanics.rolls.failure" },
          honorRoll: true
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.attackHit",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          kind: "attack",
          target: { name: { i18n: "l5r4.apps.designGallery.sample.npcName" } },
          maneuverNotes: [{ i18n: "l5r4.apps.designGallery.sample.note" }],
          contest: true,
          grappleButton: true,
          conditions: [{ label: "Dazed" }],
          damageButton: "Katana"
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.damage",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "emphasis",
        with: {
          ...CHECK,
          kind: "damage",
          tn: null,
          sources: ["Katana", { i18n: "l5r4.apps.designGallery.sample.modifier" }],
          applyTarget: { i18n: "l5r4.apps.designGallery.sample.npcName" }
        }
      }
    ],
    seeAlso: ["dice-row", "chat-card"],
    notes: ["l5r4.apps.designGallery.notes.chatFrame"]
  },
  {
    page: "request-card",
    partials: [`${T}/chat/check-request.hbs`],
    scss: ["scss/components/_request-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.request",
        partial: `${T}/chat/check-request.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          text: { i18n: "l5r4.ui.links.checkTn", data: { what: "Kenjutsu / Agility", tn: 20 } }
        }
      }
    ],
    seeAlso: ["inline-link"],
    notes: []
  },
  {
    page: "damage-result",
    partials: [`${T}/chat/damage-result.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.woundsTaken",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 12,
              damage: 15
            }
          },
          notes: [{ i18n: "l5r4.ui.combat.reductionNote", data: { reduction: 3 } }],
          canVoid: true,
          undone: false
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.voidSpentKilled",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 50,
              damage: 63
            }
          },
          notes: [
            { i18n: "l5r4.ui.combat.voidNote", data: { wounds: 10 } },
            { i18n: "l5r4.ui.combat.killedNote" }
          ],
          canVoid: false,
          undone: false
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.undone",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 12,
              damage: 15
            }
          },
          notes: [{ i18n: "l5r4.ui.combat.reductionNote", data: { reduction: 3 } }],
          canVoid: true,
          undone: true
        }
      }
    ],
    seeAlso: ["chat-card"],
    notes: []
  },
  {
    page: "effect-prompt",
    partials: [`${T}/chat/effect-prompt.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.save",
        partial: `${T}/chat/effect-prompt.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: { i18n: "l5r4.ui.effects.saveTitle", data: { effect: "Dazed" } },
          text: { i18n: "l5r4.ui.effects.saveText", data: { roll: "Earth", tn: 15 } },
          button: { i18n: "l5r4.ui.common.roll" }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.fullDefense",
        partial: `${T}/chat/effect-prompt.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: { i18n: "l5r4.ui.mechanics.stances.fullDefense" },
          text: { i18n: "l5r4.ui.mechanics.stances.fullDefenseHint" },
          button: { i18n: "l5r4.ui.common.roll" }
        }
      }
    ],
    seeAlso: ["chat-card"],
    notes: []
  },
  {
    page: "flow-card",
    partials: [`${T}/chat/flow.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.duel",
        partial: `${T}/chat/flow.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: { i18n: "l5r4.ui.combat.duel.title" },
          stage: { i18n: "l5r4.ui.combat.duel.assessment" },
          lines: [],
          buttons: [
            {
              action: "roll",
              data: "a",
              label: {
                i18n: "l5r4.ui.combat.duel.roll",
                data: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } }
              }
            },
            {
              action: "concede",
              data: "a",
              label: {
                i18n: "l5r4.ui.combat.duel.concede",
                data: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } }
              }
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.grapple",
        partial: `${T}/chat/flow.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: { i18n: "l5r4.ui.combat.grapple.title" },
          stage: { i18n: "l5r4.ui.combat.grapple.control" },
          lines: [
            {
              i18n: "l5r4.ui.combat.grapple.inControl",
              data: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } }
            }
          ],
          buttons: [
            { action: "hit", data: "a", label: { i18n: "l5r4.ui.combat.grapple.hit" } },
            { action: "throw", data: "a", label: { i18n: "l5r4.ui.combat.grapple.throw" } },
            { action: "break", data: "b", label: { i18n: "l5r4.ui.combat.grapple.break" } },
            { action: "pass", data: "a", label: { i18n: "l5r4.ui.combat.grapple.pass" } }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.flowOver",
        partial: `${T}/chat/flow.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: { i18n: "l5r4.ui.combat.duel.title" },
          stage: { i18n: "l5r4.ui.combat.duel.done" },
          lines: [
            {
              i18n: "l5r4.ui.combat.duel.conceded",
              data: { name: { i18n: "l5r4.apps.designGallery.sample.npcName" } }
            }
          ],
          buttons: []
        }
      }
    ],
    seeAlso: ["chat-card"],
    notes: []
  },
  {
    page: "item-summary-card",
    partials: [
      `${T}/cards/skill.hbs`,
      `${T}/chat/item-summary.hbs`,
      `${T}/item/_partials/_tab-description.hbs`
    ],
    scss: ["scss/components/_item-summary-card.scss", "scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.postedItem",
        partial: `${T}/cards/skill.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          ...ROWS.skills[0],
          inSheet: false,
          system: { ...ROWS.skills[0].system, type: "bugei" }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.summary",
        partial: `${T}/chat/item-summary.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          lines: [
            {
              i18n: "l5r4.ui.ruleSummary.RollModifier",
              data: { bonus: "+1k0", rolls: "Kenjutsu" }
            }
          ],
          citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 140 } }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.onItemSheet",
        partial: `${T}/item/_partials/_tab-description.hbs`,
        scope: "item",
        context: "item",
        with: {
          currentTab: "description",
          enriched: { description: "" },
          summary: {
            lines: [
              { i18n: "l5r4.ui.ruleSummary.TNModifier", data: { value: "+5", rolls: "Kenjutsu" } }
            ]
          }
        }
      }
    ],
    seeAlso: ["item-header"],
    notes: []
  },
  {
    page: "check-dialog",
    partials: [
      `${T}/dialogs/check-dialog.hbs`,
      `${T}/dialogs/check-extras/ring.hbs`,
      `${T}/dialogs/check-extras/maho.hbs`
    ],
    scss: ["scss/components/_check-dialog.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.everyPart",
        partial: `${T}/dialogs/check-dialog.hbs`,
        scope: "plain",
        context: "plain",
        extras: {
          partial: `${T}/dialogs/check-extras/ring.hbs`,
          with: {
            affinity: true,
            deficiency: false,
            slot: "elemental",
            ringName: "Water",
            elementalSlots: 2,
            voidSlots: 1
          }
        },
        with: DIALOG
      },
      {
        label: "l5r4.apps.designGallery.samples.unskilledMaho",
        partial: `${T}/dialogs/check-dialog.hbs`,
        scope: "plain",
        context: "plain",
        extras: { partial: `${T}/dialogs/check-extras/maho.hbs`, with: { bloodCost: 2 } },
        with: {
          pool: "3k2",
          hasTN: true,
          tn: 15,
          woundPenalty: 0,
          unskilled: true,
          voidAllowed: true,
          voidSkill: true,
          voidPoints: 0
        }
      }
    ],
    seeAlso: [],
    notes: ["l5r4.apps.designGallery.notes.dialogFrame"]
  },
  {
    page: "ledger-dialog",
    partials: [`${T}/dialogs/ledger-dialog.hbs`],
    scss: ["scss/components/_ledger-dialog.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.withEntries",
        partial: `${T}/dialogs/ledger-dialog.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          tracks: {
            honor: { i18n: "l5r4.character.ranks.honorRank" },
            glory: { i18n: "l5r4.character.ranks.gloryRank" }
          },
          entries: [
            {
              track: { i18n: "l5r4.character.ranks.honorRank" },
              points: 2,
              asked: 3,
              changed: true,
              reason: { i18n: "l5r4.apps.designGallery.sample.reason" }
            },
            {
              track: { i18n: "l5r4.character.ranks.gloryRank" },
              points: -1,
              asked: -1,
              changed: false,
              reason: { i18n: "l5r4.apps.designGallery.sample.reason" }
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.noEntries",
        partial: `${T}/dialogs/ledger-dialog.hbs`,
        scope: "plain",
        context: "plain",
        with: { tracks: { shadowTaint: { i18n: "l5r4.character.ranks.taintRank" } }, entries: [] }
      }
    ],
    seeAlso: [],
    notes: ["l5r4.apps.designGallery.notes.dialogFrame"]
  },
  {
    page: "rules-editor",
    partials: [`${T}/item/_partials/_tab-rules.hbs`, `${T}/rules/_partials/_editor.hbs`],
    scss: ["scss/components/_rules-editor.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.formView",
        partial: `${T}/item/_partials/_tab-rules.hbs`,
        scope: "item",
        context: "item",
        with: {
          currentTab: "rules",
          rulesMode: "form",
          rulesEditable: true,
          ruleKeys: { RollModifier: "RollModifier", TNModifier: "TNModifier" },
          rules: [
            {
              index: 0,
              key: "RollModifier",
              error: "",
              fields: [
                {
                  name: "selector",
                  kind: "select",
                  value: "skill",
                  nullable: false,
                  choices: { skill: "skill" }
                },
                { name: "roll", kind: "number", value: 1 },
                { name: "label", kind: "string", value: "Kenjutsu" },
                { name: "optional", kind: "boolean", value: true },
                { name: "predicate", kind: "json", value: "[]" }
              ]
            },
            {
              index: 1,
              key: "TNModifier",
              error: { i18n: "l5r4.apps.designGallery.sample.ruleError" },
              fields: [{ name: "value", kind: "number", value: "" }]
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.jsonView",
        partial: `${T}/rules/_partials/_editor.hbs`,
        scope: "item",
        context: "item",
        with: {
          rulesMode: "json",
          rulesEditable: true,
          rulesJson: '[\n  { "key": "RollModifier", "roll": 1 }\n]'
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.readOnlyEmpty",
        partial: `${T}/rules/_partials/_editor.hbs`,
        scope: "item",
        context: "item",
        with: { rulesMode: "form", rulesEditable: false, rules: [] }
      }
    ],
    seeAlso: [],
    notes: []
  },
  {
    page: "effect-panel",
    partials: [`${T}/apps/effect-panel.hbs`],
    scss: ["scss/apps/_effect-panel.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.effects",
        partial: `${T}/apps/effect-panel.hbs`,
        scope: "effect-panel",
        context: "plain",
        with: {
          actor: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } },
          effects: [
            {
              uuid: "Actor.gallery.ActiveEffect.one",
              sourceUuid: "Actor.gallery.Item.one",
              name: "Dazed",
              img: "icons/svg/daze.svg",
              source: "Striking as Air",
              lasts: { i18n: "l5r4.apps.effectPanel.rounds", data: { count: 2 } },
              canRemove: true
            },
            {
              uuid: "Actor.gallery.ActiveEffect.two",
              sourceUuid: "Actor.gallery.ActiveEffect.two",
              name: { i18n: "l5r4.apps.designGallery.sample.effectName" },
              img: "icons/svg/aura.svg",
              source: "",
              lasts: { i18n: "l5r4.apps.effectPanel.uses", data: { left: 1, max: 3 } },
              canRemove: false
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.noEffects",
        partial: `${T}/apps/effect-panel.hbs`,
        scope: "effect-panel",
        context: "plain",
        with: {
          actor: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } },
          effects: [],
          empty: {
            i18n: "l5r4.apps.effectPanel.none",
            data: { name: { i18n: "l5r4.apps.designGallery.sample.pcName" } }
          }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.noActor",
        partial: `${T}/apps/effect-panel.hbs`,
        scope: "effect-panel",
        context: "plain",
        with: { effects: [], empty: { i18n: "l5r4.apps.effectPanel.noActor" } }
      }
    ],
    seeAlso: [],
    notes: ["l5r4.apps.designGallery.notes.loading"]
  },
  {
    page: "compendium-browser",
    partials: [`${T}/apps/compendium-browser.hbs`, `${T}/apps/compendium-browser-results.hbs`],
    scss: ["scss/apps/_compendium-browser.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.browserControls",
        partial: `${T}/apps/compendium-browser.hbs`,
        scope: "compendium-browser",
        context: "plain",
        with: {
          tabs: [
            {
              id: "skills",
              label: { i18n: "l5r4.apps.compendiumBrowser.tabs.skills" },
              active: true
            },
            {
              id: "spells",
              label: { i18n: "l5r4.apps.compendiumBrowser.tabs.spells" },
              active: false
            },
            {
              id: "creatures",
              label: { i18n: "l5r4.apps.compendiumBrowser.tabs.creatures" },
              active: false
            }
          ],
          search: "",
          filters: [
            {
              id: "type",
              kind: "select",
              label: { i18n: "l5r4.ui.common.type" },
              value: "",
              options: [{ value: "bugei", label: { i18n: "l5r4.character.skillTypes.bugei" } }]
            },
            { id: "school", kind: "bool", label: { i18n: "l5r4.ui.common.school" }, value: "" }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.browserRows",
        partial: `${T}/apps/compendium-browser-results.hbs`,
        scope: "compendium-browser",
        context: "plain",
        with: {
          count: 2,
          canAdd: true,
          canImport: false,
          documentName: "Item",
          rows: [
            {
              uuid: "Compendium.gallery.skills.Item.one",
              id: "one",
              pack: "gallery.skills",
              packTitle: "Skills",
              name: "Kenjutsu",
              img: "icons/svg/sword.svg",
              typeLabel: { i18n: "TYPES.Item.skill" },
              numbers: "Agility",
              folderName: "Bugei",
              citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 140 } }
            },
            {
              uuid: "Compendium.gallery.skills.Item.two",
              id: "two",
              pack: "gallery.skills",
              packTitle: "Skills",
              name: { i18n: "l5r4.apps.designGallery.sample.longName" },
              img: "icons/svg/book.svg",
              typeLabel: { i18n: "TYPES.Item.skill" },
              numbers: "",
              folderName: "",
              citation: ""
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.browserEmpty",
        partial: `${T}/apps/compendium-browser-results.hbs`,
        scope: "compendium-browser",
        context: "plain",
        with: { count: 0, canAdd: true, canImport: false, documentName: "Item", rows: [] }
      }
    ],
    seeAlso: ["tabs"],
    notes: []
  },
  {
    page: "inline-link",
    partials: [`${T}/links/inline-link.hbs`],
    scss: ["scss/components/_inline-link.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.checkLink",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          ok: true,
          type: "Check",
          params: "skill=Kenjutsu|tn=20",
          label: "",
          icon: "fa-solid fa-dice-d10",
          text: { i18n: "l5r4.ui.links.checkTn", data: { what: "Kenjutsu", tn: 20 } }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.damageLink",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          ok: true,
          type: "Damage",
          params: "3k2",
          label: "",
          icon: "fa-solid fa-burst",
          text: "3k2"
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.conditionLink",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          ok: true,
          type: "Condition",
          params: "dazed",
          label: "",
          icon: "fa-solid fa-person-falling-burst",
          text: "Dazed"
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.fearLink",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          ok: true,
          type: "Fear",
          params: "2",
          label: "",
          icon: "fa-solid fa-ghost",
          text: "Fear 2"
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.brokenLink",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: { ok: false, source: "@Fear[11]", reason: { i18n: "l5r4.ui.links.errors.fear" } }
      }
    ],
    seeAlso: ["request-card"],
    notes: ["l5r4.apps.designGallery.notes.linkRequest"]
  },
  {
    page: "floating-number",
    partials: [],
    scss: [],
    samples: [],
    seeAlso: [],
    notes: ["l5r4.apps.designGallery.notes.canvas"]
  }
]);

/** One sample of each pattern (docs/design-system/patterns/): a sheet section, a chat card, a dialog, a panel row. */
export const GALLERY_PATTERNS = freeze([
  {
    page: "sheets",
    label: "l5r4.apps.designGallery.patterns.sheetSection",
    samples: [
      {
        partial: `${T}/actor/_partials/_ranks.hbs`,
        scope: "pc",
        context: "pc",
        with: { editable: true }
      },
      { partial: `${T}/actor/_partials/_combat.hbs`, scope: "pc", context: "pc" },
      { partial: `${T}/actor/_partials/_armor.hbs`, scope: "pc", context: "pc" },
      { partial: `${T}/actor/_partials/_wounds.hbs`, scope: "pc", context: "pc" }
    ]
  },
  {
    page: "chat-cards",
    label: "l5r4.apps.designGallery.patterns.chatCard",
    samples: [
      {
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          kind: "attack",
          target: { name: { i18n: "l5r4.apps.designGallery.sample.npcName" } },
          damageButton: "Katana"
        }
      },
      {
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 12,
              damage: 15
            }
          },
          notes: [{ i18n: "l5r4.ui.combat.reductionNote", data: { reduction: 3 } }],
          canVoid: true,
          undone: false
        }
      }
    ]
  },
  {
    page: "dialogs",
    label: "l5r4.apps.designGallery.patterns.dialog",
    dialog: { partial: `${T}/dialogs/check-dialog.hbs`, with: DIALOG },
    samples: []
  },
  {
    page: "panels-and-browsers",
    label: "l5r4.apps.designGallery.patterns.panelRow",
    samples: [
      {
        partial: `${T}/apps/effect-panel.hbs`,
        scope: "effect-panel",
        context: "plain",
        with: {
          effects: [
            {
              uuid: "Actor.gallery.ActiveEffect.one",
              sourceUuid: "Actor.gallery.Item.one",
              name: "Dazed",
              img: "icons/svg/daze.svg",
              source: "Striking as Air",
              lasts: { i18n: "l5r4.apps.effectPanel.noEnd" },
              canRemove: true
            }
          ]
        }
      }
    ]
  }
]);
