/**
 * @module config/design-gallery/patterns
 * @description The Patterns section of the design gallery (module/apps/design-gallery.js): one sample of each page
 * in docs/design-system/patterns/.
 */

import { CHECK, DIALOG, T } from "./fixtures.js";

/** One sample of each pattern (docs/design-system/patterns/): a sheet section, a chat card, a dialog, a panel row. */
export const GALLERY_PATTERNS = Object.freeze([
  {
    page: "sheets",
    label: "l5r4.apps.designGallery.patterns.sheetSection",
    samples: [
      {
        partial: `${T}/actor/_partials/_ranks.hbs`,
        scope: "pc",
        context: "pc",
        with: { editable: true }
      },
      { partial: `${T}/actor/_partials/_combat.hbs`, scope: "pc", context: "pc" },
      { partial: `${T}/actor/_partials/_limited.hbs`, scope: "pc", context: "pc" },
      { partial: `${T}/actor/_partials/_armor.hbs`, scope: "pc", context: "pc" },
      { partial: `${T}/actor/_partials/_wounds.hbs`, scope: "pc", context: "pc" }
    ]
  },
  {
    page: "chat-cards",
    label: "l5r4.apps.designGallery.patterns.chatCard",
    samples: [
      {
        partial: `${T}/chat/check.hbs`,
        scope: "chat",
        context: "plain",
        roll: "skilled",
        with: {
          ...CHECK,
          kind: "attack",
          target: { name: { i18n: "l5r4.apps.designGallery.sample.npcName" } },
          damageButton: "Katana"
        }
      },
      {
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
      }
    ]
  },
  {
    page: "dialogs",
    label: "l5r4.apps.designGallery.patterns.dialog",
    dialog: { partial: `${T}/dialogs/check-dialog.hbs`, with: DIALOG },
    samples: []
  },
  {
    page: "panels-and-browsers",
    label: "l5r4.apps.designGallery.patterns.panelRow",
    samples: [
      {
        partial: `${T}/apps/effect-panel.hbs`,
        scope: "effect-panel",
        context: "plain",
        with: {
          effects: [
            {
              uuid: "Actor.gallery.ActiveEffect.one",
              sourceUuid: "Actor.gallery.Item.one",
              name: "Dazed",
              img: "icons/svg/daze.svg",
              source: "Striking as Air",
              lasts: { i18n: "l5r4.apps.effectPanel.noEnd" },
              canRemove: true
            }
          ]
        }
      }
    ]
  }
]);
