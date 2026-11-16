/**
 * @module services/dice/rolls/maho-cast-roll
 * @description Blood magic through the roll pipeline (module/services/dice/check/roll-check.js):
 * - Casting Roll: (Insight Rank + Ring)k(Ring) against TN 5 + 5 × Mastery Level
 * - Blood cost: 2 × Mastery Level Wounds, paid before the roll whatever its result
 * - One Free Raise per additional full blood cost paid
 * - Taint on a successful cast: Mastery Level - 1, at least 1
 * - Master of Blood (its RollOption): 1 Wound less, Taint reduced by the Earth Ring, at least 1
 * - No spell slot
 * game-rules/88_maho.md, p.267-268
 * game-rules/89_shadowlands_taint.md, p.280
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { ringRankOf } from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { applyTrackChange } from "../../ledger.js";

/**
 * Casts a maho spell.
 *
 * @param {object} options
 * @param {L5R4Actor} options.actor - The caster
 * @param {Item} options.spell - The maho spell item
 * @param {boolean} [options.showDialog=true] - Show the roll dialog
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function rollMahoCast({ actor, spell, showDialog = true } = {}) {
  const ring = String(spell.system.ring).toLowerCase();
  const rank = ringRankOf(actor, ring);
  const mastery = Math.max(1, toInt(spell.system.mastery));
  // Master of Blood: the item carries a RollOption rule with this option
  const masterOfBlood = actor.rollOptions.has("master-of-blood");
  const bloodCost = masterOfBlood ? Math.max(mastery * 2 - 1, 1) : mastery * 2;

  return rollCheck({
    actor,
    kind: "maho",
    label: `${T("l5r4.magic.maho.casting")}: ${spell.name}`,
    base: { roll: rank + actor.system.insightRank, keep: rank },
    ring,
    tn: 5 + 5 * mastery,
    askForOptions: showDialog,
    extras: {
      template: DIALOG_TEMPLATES.checkMaho,
      data: { bloodCost }
    },
    prepare: async choices => {
      // Dialog input: a whole number of Wounds, never negative
      const additional = Math.max(0, toInt(choices.additionalBlood));
      const total = bloodCost + additional;
      const freeRaises = Math.floor(additional / bloodCost);
      if (choices.bloodSource !== "other") {
        // The stored value, not the prepared one, so an Active Effect on Wounds is never written into storage (B6)
        const suffered = Math.min(
          actor._source.system.suffered + total,
          toInt(actor.system.wounds.max)
        );
        await actor.update({ "system.suffered": suffered });
      }
      return {
        freeRaises,
        labelSuffix: ` [${T("l5r4.magic.maho.bloodCost")}: ${total}]`
      };
    },
    beforePost: async ({ success }) => {
      if (!success) {
        return {};
      }
      const base = Math.max(mastery - 1, 1);
      const taint = masterOfBlood ? Math.max(base - toInt(actor.system.rings.earth), 1) : base;
      // Through the ledger, so ten points become a Taint Rank and the change is logged
      // game-rules/89_shadowlands_taint.md, p.275
      await applyTrackChange(actor, "taint", {
        points: taint,
        reason: T("l5r4.magic.maho.taintGained")
      });
      ui.notifications?.warn(F("l5r4.magic.maho.taintGainedNotification", { taint }));
      return { labelSuffix: ` [${T("l5r4.magic.maho.taintGained")}: ${taint}]` };
    }
  });
}
