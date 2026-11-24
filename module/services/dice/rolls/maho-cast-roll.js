/**
 * @module services/dice/rolls/maho-cast-roll
 * @description Blood magic through the roll pipeline (module/services/dice/check/roll-check.js):
 * - Casting Roll: (Insight Rank + Ring)k(Ring) against TN 5 + 5 × Mastery Level
 * - Blood cost: 2 × Mastery Level Wounds, paid before the roll whatever its result; given back when the check stops
 *   before rolling
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
  // The Wounds the blood cost took, given back when the check stops before the roll
  const paid = { wounds: 0 };

  return rollCheck({
    actor,
    kind: "maho",
    label: F("l5r4.magic.maho.castingLabel", { spell: spell.name }),
    base: { roll: rank + actor.system.insightRank, keep: rank },
    ring,
    tn: 5 + 5 * mastery,
    askForOptions: showDialog,
    extras: {
      template: DIALOG_TEMPLATES.checkMaho,
      data: { bloodCost }
    },
    prepare: choices => spendBloodCost(actor, choices, { bloodCost, paid }),
    cancel: () => applyBloodRefund(actor, paid),
    beforePost: ({ success }) => applyMahoTaint(actor, { success, mastery, masterOfBlood })
  });
}

/**
 * Pay the blood cost before the roll: the cost and any additional blood the dialog adds, taken as Wounds unless the
 * blood comes from someone else. Each additional full cost gives one Free Raise, which the caster may spend on the
 * TN instead.
 * game-rules/28_raises.md, p.79
 * game-rules/88_maho.md, p.267-268
 * @param {L5R4Actor} actor - The caster
 * @param {object} choices - The roll dialog's choices
 * @param {{bloodCost: number, paid: {wounds: number}}} cost - The spell's blood cost in Wounds, and where the Wounds
 *   taken are recorded for a refund
 * @returns {Promise<{freeRaises: number, freeRaisesToTn: number, labelSuffix: string}>} rollCheck's `prepare` result
 */
async function spendBloodCost(actor, choices, { bloodCost, paid }) {
  // Dialog input: whole numbers, never negative, and no more Free Raises on the TN than the blood buys
  const additional = Math.max(0, toInt(choices.additionalBlood));
  const total = bloodCost + additional;
  const freeRaises = Math.floor(additional / bloodCost);
  const freeRaisesToTn = Math.min(Math.max(0, toInt(choices.bloodRaisesToTn)), freeRaises);
  if (choices.bloodSource !== "other") {
    // The stored value, not the prepared one, so an Active Effect on Wounds is never written into storage (B6)
    const before = actor._source.system.suffered;
    const suffered = Math.min(before + total, toInt(actor.system.wounds.max));
    await actor.update({ "system.suffered": suffered });
    paid.wounds = suffered - before;
  }
  return {
    freeRaises,
    freeRaisesToTn,
    labelSuffix: F("l5r4.magic.maho.bloodSuffix", { total })
  };
}

/**
 * Give back the Wounds the blood cost took when the cast stops before its roll (a Void Point could not be spent).
 * @param {L5R4Actor} actor - The caster
 * @param {{wounds: number}} paid - The Wounds the blood cost took
 * @returns {Promise<void>}
 */
async function applyBloodRefund(actor, paid) {
  if (!paid.wounds) {
    return;
  }
  const suffered = Math.max(0, actor._source.system.suffered - paid.wounds);
  paid.wounds = 0;
  await actor.update({ "system.suffered": suffered });
}

/**
 * Gain the Taint of a successful cast: Mastery Level - 1, at least 1; Master of Blood takes the Earth Ring from it,
 * at least 1.
 * game-rules/89_shadowlands_taint.md, p.280
 * @param {L5R4Actor} actor - The caster
 * @param {{success: boolean, mastery: number, masterOfBlood: boolean}} cast - Whether the cast succeeded, the
 *   spell's Mastery Level, and whether the caster has Master of Blood
 * @returns {Promise<object>} rollCheck's `beforePost` result: the Taint on the label, or nothing on a failure
 */
async function applyMahoTaint(actor, { success, mastery, masterOfBlood }) {
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
  return { labelSuffix: F("l5r4.magic.maho.taintSuffix", { taint }) };
}
