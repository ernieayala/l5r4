/**
 * @module config/design-gallery/prompt-and-item-cards
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): effect prompts and
 * flow cards, which ask for a step, and the posted item summary, one run of pages in
 * docs/design-system/components/README.md, in its order. components.js joins the runs.
 */

import { DESCRIPTION, ROWS, T } from "./fixtures.js";

/**
 * Effect prompts and flow cards, which ask for a step, and the posted item summary, one entry per component page.
 */
export const GALLERY_PROMPT_AND_ITEM_CARDS = Object.freeze([
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
      `${T}/item/_partials/_tab-description.hbs`,
      `${T}/cards/_partials/_text-section.hbs`
    ],
    scss: ["scss/components/_item-summary-card.scss", "scss/components/_chat-card.scss"],
    samples: [
      {
        partial: `${T}/cards/_partials/_text-section.hbs`,
        scope: "chat",
        context: "plain",
        with: { label: "l5r4.ui.sheets.description", text: DESCRIPTION }
      },
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
  }
]);
