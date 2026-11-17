/**
 * @module config/design-gallery/sheet-blocks
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the character blocks
 * (Rings and Traits, ranks, Void Points), one run of pages in docs/design-system/components/README.md, in its order.
 * components.js joins the runs.
 */

import { T } from "./fixtures.js";

/** The character blocks (Rings and Traits, ranks, Void Points), one entry per component page. */
export const GALLERY_SHEET_BLOCKS = Object.freeze([
  {
    page: "ring-trait-block",
    partials: [
      `${T}/actor/_partials/_stats.hbs`,
      `${T}/actor/_partials/_stats-npc.hbs`,
      `${T}/actor/_partials/_traits-rings.hbs`,
      `${T}/actor/_partials/_ring.hbs`,
      `${T}/actor/_partials/_trait.hbs`
    ],
    scss: ["scss/features/_traits-rings.scss", "scss/features/_pc-info.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.ringsAndTraits",
        partial: `${T}/actor/_partials/_traits-rings.hbs`,
        scope: "pc",
        context: "pc",
        with: { showVoidPoints: true }
      },
      {
        label: "l5r4.apps.designGallery.samples.oneRing",
        partial: `${T}/actor/_partials/_ring.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        fit: true,
        context: "pc",
        with: { ring: "earth", rank: 1 }
      },
      {
        label: "l5r4.apps.designGallery.samples.oneTrait",
        partial: `${T}/actor/_partials/_trait.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        fit: true,
        context: "pc",
        with: { trait: "sta", name: "stamina", ring: "earth", rank: 1 }
      },
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
    partials: [
      `${T}/actor/_partials/_ranks.hbs`,
      `${T}/actor/_partials/_rank-control.hbs`,
      `${T}/actor/_partials/_rank-track.hbs`
    ],
    scss: ["scss/features/_ranks.scss", "scss/components/_rank-control.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.traitRank",
        partial: `${T}/actor/_partials/_rank-control.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings", "l5r4-trait -earth -stamina"],
        fit: true,
        context: "pc",
        with: { variant: "trait", trait: "sta", value: 1 }
      },
      {
        label: "l5r4.apps.designGallery.samples.voidRank",
        partial: `${T}/actor/_partials/_rank-control.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        fit: true,
        context: "pc",
        with: { variant: "void", value: 2 }
      },
      {
        label: "l5r4.apps.designGallery.samples.honorTrack",
        partial: `${T}/actor/_partials/_rank-track.hbs`,
        scope: "pc",
        context: "pc",
        with: { track: "honor", label: "l5r4.character.ranks.honorRank", rank: 6, points: 5 }
      },
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
    partials: [`${T}/actor/_partials/_void-points.hbs`],
    scss: ["scss/features/_traits-rings.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.voidDots",
        partial: `${T}/actor/_partials/_void-points.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        context: "pc",
        with: { value: 1 }
      }
    ],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.voidDots"]
  }
]);
