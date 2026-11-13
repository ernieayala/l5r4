/**
 * Ring Roll Service
 *
 * A Ring Roll (p.80) through the roll pipeline (module/services/dice/check/roll-check.js): roll and keep the Ring.
 * The dialog can turn it into a Spell Casting Roll without a spell item (p.80): the School Rank, plus 1 with an
 * Affinity or minus 1 with a Deficiency, joins the rolled dice, and a spell slot is spent once the roll is made.
 *
 * @module services/dice/rolls/ring-roll
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getAffinityDeficiencyModifier } from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { planSlot, slotDialogData, spendSlot } from "../check/spell-slots.js";
import { resolveActor } from "../resources/void-manager.js";

/**
 * Executes a Ring Roll, or a Spell Casting Roll when the dialog asks for one.
 *
 * @param {Object} options
 * @param {number} [options.ringRank=null] - The Ring's rank
 * @param {string} [options.ringName=null] - Display name of the Ring
 * @param {string} [options.systemRing=null] - Ring key ("fire", "void", ...)
 * @param {boolean} [options.askForOptions=true] - Show the roll dialog (Shift-click skips it)
 * @param {L5R4Actor} [options.actor=null] - The roller
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled or casting is blocked
 */
export async function RingRoll({
  ringRank = null,
  ringName = null,
  systemRing = null,
  askForOptions = true,
  actor = null
} = {}) {
  const roller = resolveActor(actor);
  const ring = String(systemRing ?? "void").toLowerCase();
  const rank = toInt(ringRank);
  const affinity = getAffinityDeficiencyModifier(roller, ring);
  let slotPath = null;

  return rollCheck({
    actor: roller,
    kind: "ring",
    label: `${T("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`,
    base: { roll: rank, keep: rank },
    ring,
    askForOptions,
    extras: {
      template: DIALOG_TEMPLATES.checkRing,
      data: { ...slotDialogData(roller, ring), affinity: affinity > 0, deficiency: affinity < 0 }
    },
    prepare: async choices => {
      if (!choices.spellCasting) {
        return {};
      }
      const schoolRank = toInt(roller.system.insight.rank);
      const shift = (choices.affinity ? 1 : 0) - (choices.deficiency ? 1 : 0);
      if (schoolRank + shift <= 0) {
        ui.notifications?.warn(
          shift < 0
            ? T("l5r4.ui.notifications.deficiencyBlocksCasting", { ring: ringName })
            : T("l5r4.ui.notifications.schoolRankZero")
        );
        return null;
      }
      const slot = planSlot(roller, ring, choices.slot);
      if (!slot) {
        return null;
      }
      slotPath = slot.path;
      const kindLabel = shift > 0 ? "affinity" : shift < 0 ? "deficiency" : null;
      return {
        modifiers: [
          {
            label: T("l5r4.ui.check.schoolRank"),
            roll: schoolRank + shift,
            keep: 0,
            total: 0,
            enabled: true
          }
        ],
        labelSuffix:
          ` (${T("l5r4.ui.mechanics.rolls.spellCasting")})` +
          (kindLabel ? ` [${T(`l5r4.magic.spells.${kindLabel}`)}]` : "") +
          slot.label
      };
    },
    after: () => spendSlot(roller, slotPath)
  });
}
