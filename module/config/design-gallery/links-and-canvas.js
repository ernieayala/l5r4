/**
 * @module config/design-gallery/links-and-canvas
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): text links and the
 * floating numbers drawn on the canvas, one run of pages in docs/design-system/components/README.md, in its order.
 * components.js joins the runs.
 */

import { T } from "./fixtures.js";

/** Text links and the floating numbers drawn on the canvas, one entry per component page. */
export const GALLERY_LINKS_AND_CANVAS = Object.freeze([
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
        label: "l5r4.apps.designGallery.samples.checkLinkGm",
        partial: `${T}/links/inline-link.hbs`,
        scope: "plain",
        context: "plain",
        with: {
          ok: true,
          type: "Check",
          params: "skill=Kenjutsu|tn=20",
          label: "",
          icon: "fa-solid fa-dice-d10",
          text: { i18n: "l5r4.ui.links.checkTn", data: { what: "Kenjutsu", tn: 20 } },
          canRequest: true
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
    notes: []
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
