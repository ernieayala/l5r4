/**
 * @module config/design-gallery/sheet-blocks
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the character blocks
 * (Rings and Traits, ranks, Void Points, Wounds, Initiative, Armor TN, Fear, spell slots), one run of pages in
 * docs/design-system/components/README.md, in its order. components.js joins the runs.
 */

import { ROWS, T, WOUND_LEVELS } from "./fixtures.js";

/**
 * The character blocks (Rings and Traits, ranks, Void Points, Wounds, Initiative, Armor TN, Fear, spell slots), one
 * entry per component page.
 */
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
        partial: `${T}/actor/_partials/_traits-rings.hbs`,
        scope: "pc",
        context: "pc",
        with: { showVoidPoints: true }
      },
      {
        partial: `${T}/actor/_partials/_ring.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        context: "pc",
        with: { ring: "earth", rank: 1 }
      },
      {
        partial: `${T}/actor/_partials/_trait.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
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
        partial: `${T}/actor/_partials/_rank-control.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings", "l5r4-trait -earth -stamina"],
        context: "pc",
        with: { variant: "trait", trait: "sta", value: 1 }
      },
      {
        partial: `${T}/actor/_partials/_rank-control.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        context: "pc",
        with: { variant: "void", value: 2 }
      },
      {
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
        partial: `${T}/actor/_partials/_void-points.hbs`,
        scope: "pc",
        within: ["l5r4-traits-rings"],
        context: "pc",
        with: { value: 1 }
      }
    ],
    seeAlso: ["ring-trait-block"],
    notes: ["l5r4.apps.designGallery.notes.voidDots"]
  },
  {
    page: "wound-track",
    partials: [`${T}/actor/_partials/_wounds.hbs`, `${T}/actor/_partials/_wound-track.hbs`],
    scss: ["scss/features/_wound-track.scss"],
    samples: [
      {
        partial: `${T}/actor/_partials/_wound-track.hbs`,
        scope: "pc",
        within: ["l5r4-grid"],
        context: "pc",
        with: { levels: WOUND_LEVELS }
      },
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
    partials: [`${T}/actor/_partials/_spell-section.hbs`, `${T}/actor/_partials/_spell-slot.hbs`],
    scss: ["scss/components/_section.scss"],
    samples: [
      {
        partial: `${T}/actor/_partials/_spell-slot.hbs`,
        scope: "pc",
        within: ["l5r4-section-title", "flexrow -gap-sm l5r4-spell-slots"],
        context: "pc",
        with: { ring: "water", count: 0 }
      },
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
  }
]);
