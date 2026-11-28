/**
 * @module services/dice/rolls/ring-roll
 * @description A Ring Roll through the roll pipeline (module/services/dice/check/roll-check.js): roll and keep the
 * Ring. The dialog can turn it into a Spell Casting Roll without a spell item: the School Rank, plus 1 with an
 * Affinity or minus 1 with a Deficiency, joins the rolled dice, and a spell slot is spent before the roll.
 * game-rules/29_types_of_rolls.md, p.80
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  getCastingSchoolRank,
  getAffinityDeficiencyModifier
} from "../../../utils/spell-casting.js";
import { formatLabelWithSuffix, formatShiftedLabel } from "../check/message-data.js";
import { rollCheck } from "../check/roll-check.js";
import { getSlotDialogData, spendChosenSlot, updateReturnedSlot } from "../check/spell-slots.js";
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
    label: F("l5r4.ui.mechanics.rolls.ringRollLabel", { element: ringName }),
    base: { roll: rank, keep: rank },
    ring,
    askForOptions,
    extras: {
      template: DIALOG_TEMPLATES.checkRing,
      data: {
        ...getSlotDialogData(roller, ring),
        affinity: affinity > 0,
        deficiency: affinity < 0
      },
      bind: form => bindCastingRank(form, roller, { ringName })
    },
    ...buildCastingHooks(roller, { ring, ringName })
  });
}

/**
 * The Ring Roll's hooks for a Spell Casting Roll the dialog asks for: before the roll, the School Rank is checked,
 * the slot is spent (Ernie's ruling), and the School Rank joins the rolled dice; a cast that stops before it rolls
 * gives the slot back.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {L5R4Actor} roller - The roller
 * @param {{ring: string, ringName: string}} ringData - The Ring's key and display name
 * @returns {{prepare: Function, cancel: Function}} rollCheck's `prepare` and `cancel`
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
      const slot = await spendChosenSlot(roller, ring, choices.slot);
      if (!slot) {
        return null;
      }
      slotPath = slot.path;
      return buildCastingTerms(ranks, slot);
    },
    cancel: () => updateReturnedSlot(roller, slotPath)
  };
}

/**
 * Keep the dialog's cast possible while it is open (#141): while "Cast a spell" is ticked and the School Rank, with
 * the Affinity or Deficiency ticked, is 0 or less, the reason shows and Roll is disabled until either changes.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {HTMLFormElement} form - The roll dialog's form
 * @param {L5R4Actor} roller - The roller
 * @param {{ringName: string}} ringData - The Ring's display name
 */
function bindCastingRank(form, roller, { ringName }) {
  const schoolRank = getCastingSchoolRank(roller);
  const warning = form.querySelector("[data-casting-blocked]");
  const roll = form.querySelector("[data-action='ok']");
  const update = () => {
    const { spellCasting, affinity, deficiency } = form.elements;
    const shift = getCastingShift({ affinity: affinity.checked, deficiency: deficiency.checked });
    const reason = spellCasting.checked ? getCastingRankRefusal(schoolRank, shift, ringName) : "";
    warning.hidden = !reason;
    warning.querySelector("[data-casting-blocked-text]").textContent = reason;
    roll.disabled = Boolean(reason);
  };
  form.addEventListener("change", update);
  update();
}

/**
 * The School Rank a Spell Casting Roll adds, shifted by the Affinity or Deficiency the dialog marks; a rank of 0 or
 * less blocks the cast with a warning. The dialog keeps Roll disabled for such a cast (bindCastingRank), so this
 * guards the form's values as they arrive.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {L5R4Actor} roller - The roller
 * @param {object} choices - The roll dialog's choices
 * @param {{ringName: string}} ringData - The Ring's display name
 * @returns {{schoolRank: number, shift: number}|null} null when the cast is blocked
 */
function validateCastingRank(roller, choices, { ringName }) {
  const schoolRank = getCastingSchoolRank(roller);
  const shift = getCastingShift(choices);
  const refusal = getCastingRankRefusal(schoolRank, shift, ringName);
  if (refusal) {
    ui.notifications?.warn(refusal);
    return null;
  }
  return { schoolRank, shift };
}

/**
 * The School Rank shift the dialog's Affinity and Deficiency make: +1, -1, or 0 with both or neither.
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {{affinity?: boolean, deficiency?: boolean}} choices
 * @returns {number}
 */
function getCastingShift({ affinity, deficiency }) {
  return (affinity ? 1 : 0) - (deficiency ? 1 : 0);
}

/**
 * Why a Spell Casting Roll cannot be made at this School Rank and shift: the rank is 0 or less. Empty when it can.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {number} schoolRank - The caster's School Rank
 * @param {number} shift - The Affinity or Deficiency shift
 * @param {string} ringName - The Ring's display name
 * @returns {string}
 */
function getCastingRankRefusal(schoolRank, shift, ringName) {
  if (schoolRank + shift > 0) {
    return "";
  }
  return shift < 0
    ? F("l5r4.ui.notifications.deficiencyBlocksCasting", { ring: ringName })
    : T("l5r4.ui.notifications.schoolRankZero");
}

/**
 * What a Spell Casting Roll adds to the Ring Roll: the shifted School Rank as rolled dice, and a label naming the
 * cast, its Affinity or Deficiency, and its slot.
 * @param {{schoolRank: number, shift: number}} ranks - The School Rank and its shift
 * @param {{label: string}} slot - The slot to spend
 * @returns {{modifiers: object[], labelSuffix: string}} rollCheck's `prepare` result
 */
function buildCastingTerms({ schoolRank, shift }, slot) {
  const casting = formatShiftedLabel(T("l5r4.ui.mechanics.rolls.castingSuffix"), shift);
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
    labelSuffix: formatLabelWithSuffix(casting, slot.label)
  };
}
