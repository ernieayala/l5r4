/**
 * @module config/design-gallery/forms
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the check dialog,
 * the ledger dialog, and the rules editor, one run of pages in docs/design-system/components/README.md, in its
 * order. components.js joins the runs.
 */

import { DIALOG, T } from "./fixtures.js";

/** The check dialog, the ledger dialog, and the rules editor, one entry per component page. */
export const GALLERY_FORMS = Object.freeze([
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
          hasTn: true,
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
  }
]);
