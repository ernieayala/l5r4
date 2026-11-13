/**
 * Spell Cast Roll Service
 *
 * A Spell Casting Roll for a spell item (p.80) through the roll pipeline
 * (module/services/dice/check/roll-check.js): (Ring + School Rank)k(Ring), the School Rank plus 1 for the
 * school's Affinity or minus 1 for its Deficiency, TN 5 + 5 × Mastery Level, and a spell slot spent once the roll
 * is made. A successful cast of a Concentration spell starts a Concentration (p.166).
 *
 * @module services/dice/rolls/spell-cast-roll
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getAffinityDeficiencyModifier } from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { planSlot, slotDialogData, spendSlot } from "../check/spell-slots.js";
import { applyEffect, effectsOf } from "../../effects/apply.js";

/**
 * Casts a spell.
 *
 * @param {Object} options
 * @param {L5R4Actor} options.actor - The caster
 * @param {Item} options.spell - The spell item
 * @param {boolean} [options.showDialog=true] - Show the roll dialog
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled or casting is blocked
 */
export async function SpellCastRoll({ actor, spell, showDialog = true } = {}) {
  const ring = String(spell.system.ring).toLowerCase();
  const ringValue = toInt(actor.system.rings[ring]);
  const shift = getAffinityDeficiencyModifier(actor, ring);
  const schoolRank = toInt(actor.system.insight.rank) + shift;
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
  const slots = slotDialogData(actor, ring);
  let slotPath = null;
  let label = `${T("l5r4.ui.mechanics.rolls.spellCasting")}: ${spell.name}`;
  if (shift) {
    label += ` [${T(`l5r4.magic.spells.${shift > 0 ? "affinity" : "deficiency"}`)}]`;
  }

  return rollCheck({
    actor,
    kind: "spell",
    label,
    base: { roll: ringValue + schoolRank, keep: ringValue },
    ring,
    tn: 5 + 5 * Math.max(1, toInt(spell.system.mastery)),
    askForOptions: showDialog,
    extras: { template: DIALOG_TEMPLATES.checkSpell, data: slots },
    prepare: async choices => {
      const slot = planSlot(actor, ring, choices.slot ?? slots.slot);
      if (!slot) {
        return null;
      }
      slotPath = slot.path;
      return { labelSuffix: slot.label };
    },
    after: async message => {
      await spendSlot(actor, slotPath);
      if (message.system.outcome.success && isConcentration(spell)) {
        await beginConcentration(actor, spell);
      }
    }
  });
}

/**
 * Whether a spell's Duration is Concentration (p.166), read from its duration text.
 * @param {Item} spell
 * @returns {boolean}
 */
function isConcentration(spell) {
  return /concentrat/i.test(String(spell.system.duration ?? ""));
}

/**
 * Start a Concentration on the caster for the cast spell: a "concentration" effect whose level is the spell's
 * Mastery Level, for the Willpower check when damaged (p.166). Effects that last while it lasts take it as origin.
 * A new Concentration on the same spell replaces the old one.
 * @param {Actor} actor
 * @param {Item} spell
 * @returns {Promise<void>}
 */
async function beginConcentration(actor, spell) {
  const old = effectsOf(actor, "concentration").filter(e => e.origin === spell.uuid);
  for (const effect of old) {
    await effect.delete();
  }
  await applyEffect(actor, "concentration", {
    name: `${T("EFFECT.concentration")}: ${spell.name}`,
    level: Math.max(1, toInt(spell.system.mastery)),
    origin: spell.uuid
  });
}
