/**
 * @module config/design-gallery/roll-cards
 * @description Part of the design gallery's Components section (module/apps/design-gallery.js): the chat card frame
 * and a roll's cards (dice rows, check cards, roll requests, damage results), one run of pages in
 * docs/design-system/components/README.md, in its order. components.js joins the runs.
 */

import { CHECK, DESCRIPTION, T } from "./fixtures.js";

/**
 * The chat card frame and a roll's cards (dice rows, check cards, roll requests, damage results), one entry per
 * component page.
 */
export const GALLERY_ROLL_CARDS = Object.freeze([
  {
    page: "chat-card",
    partials: [`${T}/chat/healing.hbs`, `${T}/chat/weapon.hbs`],
    scss: ["scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.healingCard",
        partial: `${T}/chat/healing.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          actorName: { i18n: "l5r4.apps.designGallery.sample.pcName" },
          healingText: {
            i18n: "l5r4.ui.mechanics.wounds.healingApplied",
            data: { amount: 6, rate: 6 }
          },
          woundsText: {
            i18n: "l5r4.ui.mechanics.wounds.status",
            data: { current: 38, max: 38, suffered: 0 }
          },
          wasFullyHealed: true,
          spellSlotsRestored: true,
          voidRestored: 2
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.weaponCard",
        partial: `${T}/chat/weapon.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: { description: DESCRIPTION }
      }
    ],
    seeAlso: ["check-card", "request-card", "damage-result", "effect-prompt", "flow-card"],
    notes: ["l5r4.apps.designGallery.notes.chatFrame"]
  },
  {
    page: "dice-row",
    partials: [`${T}/chat/check.hbs`],
    scss: ["scss/components/_check-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.skilledRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      },
      {
        label: "l5r4.apps.designGallery.samples.unskilledRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "unskilled",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      },
      {
        label: "l5r4.apps.designGallery.samples.emphasisRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "emphasis",
        with: { ...CHECK, tn: null, appliedModifiers: [] }
      }
    ],
    seeAlso: ["check-card"],
    notes: ["l5r4.apps.designGallery.notes.expandRoll"]
  },
  {
    page: "check-card",
    partials: [`${T}/chat/check.hbs`],
    scss: ["scss/components/_check-card.scss", "scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.success",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          freeRaisesLeft: 1,
          notes: [{ i18n: "l5r4.apps.designGallery.sample.note" }]
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.failureHonorRoll",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "unskilled",
        with: {
          ...CHECK,
          tn: { effective: 30, raises: 0, freeRaisesToTN: 0, woundPenalty: 0 },
          outcome: { success: false },
          outcomeText: { i18n: "l5r4.ui.mechanics.rolls.failure" },
          honorRoll: true
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.attackHit",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          kind: "attack",
          target: { name: { i18n: "l5r4.apps.designGallery.sample.npcName" } },
          maneuverNotes: [{ i18n: "l5r4.apps.designGallery.sample.note" }],
          contest: true,
          grappleButton: true,
          conditions: [{ label: "Dazed" }],
          damageButton: "Katana"
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.damage",
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "emphasis",
        with: {
          ...CHECK,
          kind: "damage",
          tn: null,
          sources: ["Katana", { i18n: "l5r4.apps.designGallery.sample.modifier" }],
          applyTarget: { i18n: "l5r4.apps.designGallery.sample.npcName" }
        }
      }
    ],
    seeAlso: ["dice-row", "chat-card"],
    notes: ["l5r4.apps.designGallery.notes.chatFrame"]
  },
  {
    page: "request-card",
    partials: [`${T}/chat/check-request.hbs`],
    scss: ["scss/components/_request-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.request",
        partial: `${T}/chat/check-request.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          text: { i18n: "l5r4.ui.links.checkTn", data: { what: "Kenjutsu / Agility", tn: 20 } }
        }
      }
    ],
    seeAlso: ["inline-link"],
    notes: []
  },
  {
    page: "damage-result",
    partials: [`${T}/chat/damage-result.hbs`],
    scss: ["scss/components/_damage-result.scss", "scss/components/_chat-card.scss"],
    samples: [
      {
        label: "l5r4.apps.designGallery.samples.woundsTaken",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 12,
              damage: 15
            }
          },
          notes: [{ i18n: "l5r4.ui.combat.reductionNote", data: { reduction: 3 } }],
          canVoid: true,
          undone: false
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.voidSpentKilled",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 50,
              damage: 63
            }
          },
          notes: [
            { i18n: "l5r4.ui.combat.voidNote", data: { wounds: 10 } },
            { i18n: "l5r4.ui.combat.killedNote" }
          ],
          canVoid: false,
          undone: false
        }
      },
      {
        label: "l5r4.apps.designGallery.samples.undone",
        partial: `${T}/chat/damage-result.hbs`,
        scope: "chat",
        context: "plain",
        with: {
          title: {
            i18n: "l5r4.ui.combat.resultTitle",
            data: {
              name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
              wounds: 12,
              damage: 15
            }
          },
          notes: [{ i18n: "l5r4.ui.combat.reductionNote", data: { reduction: 3 } }],
          canVoid: true,
          undone: true
        }
      }
    ],
    seeAlso: ["chat-card"],
    notes: []
  }
]);
