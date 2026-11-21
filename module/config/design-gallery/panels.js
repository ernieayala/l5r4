/**
 * @module config/design-gallery/panels
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the effect panel and
 * the compendium browser, one run of pages in docs/design-system/components/README.md, in its order. components.js
 * joins the runs.
 */

import { T } from "./fixtures.js";

/** The effect panel and the compendium browser, one entry per component page. */
export const GALLERY_PANELS = Object.freeze([
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
  }
]);
