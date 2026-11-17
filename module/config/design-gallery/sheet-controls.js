/**
 * @module config/design-gallery/sheet-controls
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): buttons, icon
 * buttons, inline controls, and form fields, one run of pages in docs/design-system/components/README.md, in its
 * order. components.js joins the runs.
 */

import { ROWS, T } from "./fixtures.js";

/** Buttons, icon buttons, inline controls, and form fields, one entry per component page. */
export const GALLERY_SHEET_CONTROLS = Object.freeze([
  {
    page: "button",
    partials: [
      `${T}/actor/_partials/_fear.hbs`,
      `${T}/cards/_partials/_roll-button.hbs`,
      `${T}/actor/_partials/_skill-section.hbs`,
      `${T}/cards/skill.hbs`
    ],
    scss: ["scss/components/_button.scss", "scss/features/_traits-rings.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.rollFace",
        partial: `${T}/cards/_partials/_roll-button.hbs`,
        scope: "pc",
        context: "plain",
        with: {
          action: "roll-skill",
          pool: "7k4",
          tooltip: { i18n: "l5r4.ui.mechanics.rolls.skillRoll" }
        }
      },
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
    partials: [
      `${T}/item/_partials/_tab-details.hbs`,
      `${T}/item/_partials/_tab-modifiers.hbs`,
      `${T}/item/_partials/_advantage-details.hbs`,
      `${T}/item/_partials/_mastery-details.hbs`,
      `${T}/apps/_partials/_wealth-change.hbs`
    ],
    scss: ["scss/components/_form-field.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.advantageFields",
        partial: `${T}/item/_partials/_advantage-details.hbs`,
        scope: "item",
        context: "item",
        with: { system: { type: "physical", cost: 2 } }
      },
      {
        label: "l5r4.apps.designGallery.samples.masteryFields",
        partial: `${T}/item/_partials/_mastery-details.hbs`,
        scope: "item",
        context: "item",
        with: { system: { ring: "fire", mastery: 2 } }
      },
      {
        label: "l5r4.apps.designGallery.samples.wealthChange",
        partial: `${T}/apps/_partials/_wealth-change.hbs`,
        context: "plain",
        with: { field: "add" }
      },
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
  }
]);
