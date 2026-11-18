/**
 * @module config/design-gallery/sheet-headers
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): sort headers, tabs,
 * and the item header, one run of pages in docs/design-system/components/README.md, in its order. components.js
 * joins the runs.
 */

import { SORT_COLUMNS } from "../sort-keys.js";
import { ROWS, T } from "./fixtures.js";

/** Sort headers, tabs, and the item header, one entry per component page. */
export const GALLERY_SHEET_HEADERS = Object.freeze([
  {
    page: "sort-header",
    partials: [`${T}/actor/_partials/_sort-header.hbs`, `${T}/actor/_partials/_spell-section.hbs`],
    scss: ["scss/components/_item-row.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.skillHeader",
        partial: `${T}/actor/_partials/_sort-header.hbs`,
        scope: "pc",
        context: "pc",
        with: {
          scope: "skills",
          type: "skill",
          columns: SORT_COLUMNS.skills,
          sort: { key: "rank", dir: "desc" }
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.plainHeader",
        partial: `${T}/actor/_partials/_sort-header.hbs`,
        scope: "npc",
        context: "npc",
        with: { type: "attacks", columns: SORT_COLUMNS.npcAttacks }
      },
      {
        label: "l5r4.apps.designGallery.samples.sortHeader",
        partial: `${T}/actor/_partials/_spell-section.hbs`,
        scope: "pc",
        context: "pc",
        with: { spells: ROWS.spells }
      }
    ],
    seeAlso: ["item-row"],
    notes: []
  },
  {
    page: "tabs",
    partials: [`${T}/item/_partials/_tabs.hbs`],
    scss: ["scss/components/_tabs.scss", "scss/apps/_compendium-browser.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.twoTabs",
        partial: `${T}/item/_partials/_tabs.hbs`,
        scope: "item",
        context: "item",
        with: {
          tabs: [
            { id: "details", label: { i18n: "l5r4.ui.tabs.details" }, active: true },
            { id: "description", label: { i18n: "l5r4.ui.tabs.description" }, active: false }
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
            { id: "details", label: { i18n: "l5r4.ui.tabs.details" }, active: false },
            { id: "modifiers", label: { i18n: "l5r4.ui.tabs.modifiers" }, active: true },
            { id: "description", label: { i18n: "l5r4.ui.tabs.description" }, active: false },
            { id: "effects", label: { i18n: "l5r4.ui.tabs.effects" }, active: false },
            { id: "rules", label: { i18n: "l5r4.ui.tabs.rules" }, active: false },
            {
              id: "extra",
              label: { i18n: "l5r4.apps.designGallery.sample.longName" },
              active: false
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
  }
]);
