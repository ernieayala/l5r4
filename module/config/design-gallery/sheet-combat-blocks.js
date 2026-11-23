/**
 * @module config/design-gallery/sheet-combat-blocks
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the Wound track, the
 * Initiative, Armor TN, and Fear blocks, and spell slots, one run of pages in docs/design-system/components/README.md,
 * in its order. components.js joins the runs.
 */

import { ROWS, T, WOUND_LEVELS } from "./fixtures.js";

/** The Wound track, the Initiative, Armor TN, and Fear blocks, and spell slots, one entry per component page. */
export const GALLERY_SHEET_COMBAT_BLOCKS = Object.freeze([
  {
    page: "wound-track",
    partials: [`${T}/actor/_partials/_wounds.hbs`, `${T}/actor/_partials/_wound-track.hbs`],
    scss: ["scss/features/_wound-track.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.woundTrack",
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
          initiativeFormula: "5k3+10",
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
        label: "l5r4.apps.designGallery.samples.oneSlot",
        partial: `${T}/actor/_partials/_spell-slot.hbs`,
        scope: "pc",
        within: ["l5r4-section-title", "flexrow -gap-sm l5r4-spell-slots"],
        fit: true,
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
