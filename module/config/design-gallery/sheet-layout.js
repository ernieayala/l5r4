/**
 * @module config/design-gallery/sheet-layout
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): grids, sections,
 * expand controls, and item rows, one run of pages in docs/design-system/components/README.md, in its order.
 * components.js joins the runs.
 */

import { DESCRIPTION, ROWS, T } from "./fixtures.js";

/** Grids, sections, expand controls, and item rows, one entry per component page. */
export const GALLERY_SHEET_LAYOUT = Object.freeze([
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
      `${T}/actor/_partials/_section-title.hbs`,
      `${T}/actor/_partials/_skill-section.hbs`,
      `${T}/actor/_partials/_item-section.hbs`,
      `${T}/actor/_partials/_bio.hbs`,
      `${T}/actor/_partials/_note-section.hbs`
    ],
    scss: ["scss/components/_section.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.sectionTitle",
        partial: `${T}/actor/_partials/_section-title.hbs`,
        scope: "pc",
        context: "pc",
        with: { scope: "skills", label: "l5r4.ui.sheets.skills", create: true, expand: true }
      },
      {
        label: "l5r4.apps.designGallery.samples.notesSection",
        partial: `${T}/actor/_partials/_note-section.hbs`,
        scope: "pc",
        context: "pc"
      },
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
          bioSchools: [
            { item: { id: "gallerySchool", name: "Kakita Bushi", system: {} }, waitingFor: [] },
            {
              item: { id: "gallerySecondSchool", name: "Doji Courtier", system: {} },
              waitingFor: ["Courtier", "Calligraphy"]
            }
          ]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.bioEmpty",
        partial: `${T}/actor/_partials/_bio.hbs`,
        scope: "pc",
        context: "pc"
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
    seeAlso: ["section", "item-row"]
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
      `${T}/actor/_partials/_disadvantage-section.hbs`,
      `${T}/cards/_partials/_details.hbs`,
      `${T}/cards/_partials/_detail-text.hbs`,
      `${T}/cards/_partials/_bio-row.hbs`
    ],
    scss: ["scss/components/_item-row.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.rowDetails",
        partial: `${T}/cards/_partials/_details.hbs`,
        scope: "pc",
        context: "plain",
        with: { rules: DESCRIPTION, description: DESCRIPTION }
      },
      {
        label: "l5r4.apps.designGallery.samples.rowDetailText",
        partial: `${T}/cards/_partials/_detail-text.hbs`,
        scope: "pc",
        context: "plain",
        with: { description: DESCRIPTION }
      },
      {
        label: "l5r4.apps.designGallery.samples.bioRow",
        partial: `${T}/cards/_partials/_bio-row.hbs`,
        scope: "pc",
        within: ["l5r4-item-row-list -bio"],
        context: "plain",
        with: {
          name: "Crane",
          docId: "galleryClan",
          inSheet: true,
          system: { description: DESCRIPTION }
        }
      },
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
    notes: ["l5r4.apps.designGallery.notes.reveal"]
  }
]);
