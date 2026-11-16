/**
 * @module services/dice/rolls/ring-roll
 * @description A Ring Roll through the roll pipeline (module/services/dice/check/roll-check.js): roll and keep the
 * Ring. The dialog can turn it into a Spell Casting Roll without a spell item: the School Rank, plus 1 with an
 * Affinity or minus 1 with a Deficiency, joins the rolled dice, and a spell slot is spent once the roll is made.
 * game-rules/29_types_of_rolls.md, p.80
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  getCastingSchoolRank,
  getAffinityDeficiencyModifier
} from "../../../utils/spell-casting.js";
import { rollCheck } from "../check/roll-check.js";
import { getSlotToSpend, getSlotDialogData, spendSlot } from "../check/spell-slots.js";
import { getRollActor } from "../resources/void-points.js";

/**
 * Executes a Ring Roll, or a Spell Casting Roll when the dialog asks for one.
 *
 * @param {object} options
 * @param {number} [options.ringRank=null] - The Ring's rank
 * @param {string} [options.ringName=null] - Display name of the Ring
 * @param {string} [options.ringKey=null] - Ring key ("fire", "void", ...)
 * @param {boolean} [options.askForOptions=true] - Show the roll dialog (Shift-click skips it)
 * @param {L5R4Actor} [options.actor=null] - The roller
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled or casting is blocked
 */
export async function rollRing({
  ringRank = null,
  ringName = null,
  ringKey = null,
  askForOptions = true,
  actor = null
} = {}) {
  const roller = getRollActor(actor);
  const ring = String(ringKey ?? "void").toLowerCase();
  const rank = toInt(ringRank);
  const affinity = getAffinityDeficiencyModifier(roller, ring);

  return rollCheck({
    actor: roller,
    kind: "ring",
    label: `${T("l5r4.ui.mechanics.rolls.ringRoll")}: ${ringName}`,
    base: { roll: rank, keep: rank },
    ring,
    askForOptions,
    extras: {
      template: DIALOG_TEMPLATES.checkRing,
      data: { ...getSlotDialogData(roller, ring), affinity: affinity > 0, deficiency: affinity < 0 }
    },
    ...buildCastingHooks(roller, { ring, ringName })
  });
}

/**
 * The Ring Roll's hooks for a Spell Casting Roll the dialog asks for: before the roll, the School Rank and the slot
 * are checked and the School Rank joins the rolled dice; once the roll is made, the slot is spent.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {L5R4Actor} roller - The roller
 * @param {{ring: string, ringName: string}} ringData - The Ring's key and display name
 * @returns {{prepare: Function, after: Function}} rollCheck's `prepare` and `after`
 */
function buildCastingHooks(roller, { ring, ringName }) {
  let slotPath = null;
  return {
    prepare: async choices => {
      if (!choices.spellCasting) {
        return {};
      }
      const ranks = validateCastingRank(roller, choices, { ringName });
      if (!ranks) {
        return null;
      }
      const slot = getSlotToSpend(roller, ring, choices.slot);
      if (!slot) {
        return null;
      }
      slotPath = slot.path;
      return buildCastingTerms(ranks, slot);
    },
    after: () => spendSlot(roller, slotPath)
  };
}

/**
 * The School Rank a Spell Casting Roll adds, shifted by the Affinity or Deficiency the dialog marks; a rank of 0 or
 * less blocks the cast with a warning.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {L5R4Actor} roller - The roller
 * @param {object} choices - The roll dialog's choices
 * @param {{ringName: string}} ringData - The Ring's display name
 * @returns {{schoolRank: number, shift: number}|null} null when the cast is blocked
 */
function validateCastingRank(roller, choices, { ringName }) {
  const schoolRank = getCastingSchoolRank(roller);
  const shift = (choices.affinity ? 1 : 0) - (choices.deficiency ? 1 : 0);
  if (schoolRank + shift <= 0) {
    ui.notifications?.warn(
      shift < 0
        ? F("l5r4.ui.notifications.deficiencyBlocksCasting", { ring: ringName })
        : T("l5r4.ui.notifications.schoolRankZero")
    );
    return null;
  }
  return { schoolRank, shift };
}

/**
 * What a Spell Casting Roll adds to the Ring Roll: the shifted School Rank as rolled dice, and a label naming the
 * cast, its Affinity or Deficiency, and its slot.
 * @param {{schoolRank: number, shift: number}} ranks - The School Rank and its shift
 * @param {{label: string}} slot - The slot to spend
 * @returns {{modifiers: object[], labelSuffix: string}} rollCheck's `prepare` result
 */
function buildCastingTerms({ schoolRank, shift }, slot) {
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
}
