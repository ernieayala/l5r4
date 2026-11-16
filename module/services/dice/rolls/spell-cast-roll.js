/**
 * @module services/dice/rolls/spell-cast-roll
 * @description A Spell Casting Roll for a spell item through the roll pipeline
 * (module/services/dice/check/roll-check.js): (Ring + School Rank)k(Ring), the School Rank plus 1 for the school's
 * Affinity or minus 1 for its Deficiency, TN 5 + 5 × Mastery Level, and a spell slot spent once the roll is made. A
 * universal spell is cast in the element the caster picks; a spell above the caster's School Rank in its element
 * cannot be cast, though a GM may allow it. A successful cast of a Concentration spell starts a Concentration.
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * game-rules/67_universal_spells.md, p.164-166
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { ringRankOf } from "../../../utils/mechanics.js";
import {
  getCastingSchoolRank,
  getAffinityDeficiencyModifier
} from "../../../utils/spell-casting.js";
import { formatShiftedLabel } from "../check/message-data.js";
import { rollCheck } from "../check/roll-check.js";
import { getSlotToSpend, getSlotDialogData, spendSlot } from "../check/spell-slots.js";
import { applyEffect, effectsOf } from "../../effects/apply.js";
import { askGmAllow } from "../../gm-allow.js";

/**
 * The elements a universal spell is cast in.
 * game-rules/67_universal_spells.md, p.164-165
 */
const UNIVERSAL_ELEMENTS = Object.freeze(["air", "earth", "fire", "water"]);

/**
 * Casts a spell.
 *
 * @param {object} options
 * @param {L5R4Actor} options.actor - The caster
 * @param {Item} options.spell - The spell item
 * @param {boolean} [options.showDialog=true] - Show the roll dialog
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled or casting is blocked
 */
export async function rollSpellCast({ actor, spell, showDialog = true } = {}) {
  const spellRing = String(spell.system.ring).toLowerCase();
  const ring = spellRing === "all" ? await askElement(spell) : spellRing;
  if (!ring) {
    return null;
  }
  const ranks = await validateCastingRanks(actor, spell, ring);
  if (!ranks) {
    return null;
  }
  const { rank, shift, schoolRank, mastery } = ranks;
  const slots = getSlotDialogData(actor, ring);

  return rollCheck({
    actor,
    kind: "spell",
    label: formatCastingLabel(spell, shift),
    base: { roll: rank + schoolRank, keep: rank },
    ring,
    tn: 5 + 5 * mastery,
    askForOptions: showDialog,
    extras: { template: DIALOG_TEMPLATES.checkSpell, data: slots },
    ...buildSlotHooks(actor, spell, { ring, slots })
  });
}

/**
 * The ranks a cast rolls with, after checking the caster may cast it: the Ring, the School Rank shifted by the
 * school's Affinity or Deficiency, which must be above 0, and the Mastery Level, which above that School Rank needs
 * a GM's leave.
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * @param {Actor} actor - The caster
 * @param {Item} spell - The spell
 * @param {string} ring - The element it is cast in
 * @returns {Promise<{rank: number, shift: number, schoolRank: number, mastery: number}|null>} null when the cast is
 *   blocked
 */
async function validateCastingRanks(actor, spell, ring) {
  const rank = ringRankOf(actor, ring);
  const shift = getAffinityDeficiencyModifier(actor, ring);
  const schoolRank = getCastingSchoolRank(actor) + shift;
  if (schoolRank <= 0) {
    ui.notifications?.warn(
      shift < 0
        ? F("l5r4.ui.notifications.deficiencyBlocksCasting", {
            ring: T(`l5r4.ui.mechanics.rings.${ring}`)
          })
        : T("l5r4.ui.notifications.schoolRankZero")
    );
    return null;
  }
  const mastery = Math.max(1, toInt(spell.system.mastery));
  if (
    mastery > schoolRank &&
    !(await canCastAboveRank(actor, spell, { mastery, limit: schoolRank }))
  ) {
    return null;
  }
  return { rank, shift, schoolRank, mastery };
}

/**
 * The cast's label: the spell's name, and the school's Affinity or Deficiency when it shifts the School Rank.
 * @param {Item} spell - The spell
 * @param {number} shift - The Affinity or Deficiency shift to the School Rank
 * @returns {string}
 */
function formatCastingLabel(spell, shift) {
  return formatShiftedLabel(
    F("l5r4.ui.mechanics.rolls.spellCastingLabel", { spell: spell.name }),
    shift
  );
}

/**
 * The cast's roll hooks: before the roll, the slot the dialog picks is checked and named on the card; once the roll
 * is made, that slot is spent whatever the result, and a successful Concentration spell starts its Concentration.
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {Actor} actor - The caster
 * @param {Item} spell - The spell
 * @param {{ring: string, slots: object}} slotData - The element and the slot dialog's data
 * @returns {{prepare: Function, after: Function}} rollCheck's `prepare` and `after`
 */
function buildSlotHooks(actor, spell, { ring, slots }) {
  let slotPath = null;
  return {
    prepare: async choices => {
      const slot = getSlotToSpend(actor, ring, choices.slot ?? slots.slot);
      if (!slot) {
        return null;
      }
      slotPath = slot.path;
      return { labelSuffix: slot.label };
    },
    after: async message => {
      await spendSlot(actor, slotPath);
      if (message.system.outcome.success && isConcentration(spell)) {
        await startConcentration(actor, spell);
      }
    }
  };
}

/**
 * Ask which element to cast a universal spell in.
 * @param {Item} spell
 * @returns {Promise<string|null>} The element, or null when the caster cancels
 */
async function askElement(spell) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: spell.name },
    content: await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.choice, {
      label: F("l5r4.magic.spells.chooseElement", { spell: spell.name }),
      name: "element",
      options: UNIVERSAL_ELEMENTS.map(value => ({
        value,
        label: T(`l5r4.ui.mechanics.rings.${value}`)
      }))
    }),
    ok: {
      label: T("l5r4.magic.spells.castInElement"),
      callback: (_event, button) => button.form.elements.element.value || null
    },
    rejectClose: false,
    modal: true
  });
}

/**
 * Whether a spell above the caster's School Rank in its element goes ahead: the book forbids the cast; a player is
 * told so, and a GM is asked whether to cast it anyway (Ernie's ruling).
 * game-rules/66_magic_and_spell_casting.md, p.164
 * @param {Actor} actor - The caster
 * @param {Item} spell - The spell
 * @param {object} ranks
 * @param {number} ranks.mastery - The spell's Mastery Level
 * @param {number} ranks.limit - The caster's School Rank in the spell's element
 * @returns {Promise<boolean>} Whether the cast goes ahead
 */
function canCastAboveRank(actor, spell, { mastery, limit }) {
  return askGmAllow({
    title: spell.name,
    reason: F("l5r4.magic.spells.aboveSchoolRank", {
      spell: spell.name,
      mastery,
      name: actor.name,
      limit
    }),
    ask: T("l5r4.magic.spells.aboveSchoolRankGM")
  });
}

/**
 * Whether a spell's Duration is Concentration, read from its duration text.
 * game-rules/67_universal_spells.md, p.166
 * @param {Item} spell
 * @returns {boolean}
 */
function isConcentration(spell) {
  return /concentrat/i.test(String(spell.system.duration ?? ""));
}

/**
 * Start a Concentration on the caster for the cast spell: a "concentration" effect whose level is the spell's
 * Mastery Level, for the Willpower check when damaged. Effects that last while it lasts take it as origin. A new
 * Concentration on the same spell replaces the old one.
 * game-rules/67_universal_spells.md, p.166
 * @param {Actor} actor
 * @param {Item} spell
 * @returns {Promise<void>}
 */
async function startConcentration(actor, spell) {
  const old = effectsOf(actor, "concentration").filter(e => e.origin === spell.uuid);
  for (const effect of old) {
    await effect.delete();
  }
  await applyEffect(actor, "concentration", {
    name: F("l5r4.magic.spells.concentrationName", { spell: spell.name }),
    level: Math.max(1, toInt(spell.system.mastery)),
    origin: spell.uuid
  });
}
