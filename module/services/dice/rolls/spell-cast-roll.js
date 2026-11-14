/**
 * Spell Cast Roll Service
 *
 * A Spell Casting Roll for a spell item (pp.80, 163-164, `game-rules/66_magic_and_spell_casting.md`) through the
 * roll pipeline (module/services/dice/check/roll-check.js): (Ring + School Rank)k(Ring), the School Rank plus 1
 * for the school's Affinity or minus 1 for its Deficiency, TN 5 + 5 × Mastery Level, and a spell slot spent once
 * the roll is made. A universal spell is cast in the element the caster picks (pp.164-165); a spell above the
 * caster's School Rank in its element cannot be cast, though a GM may allow it (p.164). A successful cast of a
 * Concentration spell starts a Concentration (p.166).
 *
 * @module services/dice/rolls/spell-cast-roll
 */

import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import {
  castingSchoolRank,
  getAffinityDeficiencyModifier,
  ringRank
} from "../../../utils/mechanics.js";
import { rollCheck } from "../check/roll-check.js";
import { planSlot, slotDialogData, spendSlot } from "../check/spell-slots.js";
import { applyEffect, effectsOf } from "../../effects/apply.js";
import { gmMayAllow } from "../../gm-allow.js";

/** The elements a universal spell is cast in (pp.164-165). */
const UNIVERSAL_ELEMENTS = Object.freeze(["air", "earth", "fire", "water"]);

/**
 * Ask which element to cast a universal spell in.
 * @param {Item} spell
 * @returns {Promise<string|null>} The element, or null when the caster cancels
 */
async function chooseElement(spell) {
  const select = foundry.applications.fields.createSelectInput({
    name: "element",
    options: UNIVERSAL_ELEMENTS.map(value => ({
      value,
      label: T(`l5r4.ui.mechanics.rings.${value}`)
    }))
  });
  return foundry.applications.api.DialogV2.prompt({
    window: { title: spell.name },
    content: `<div class="form-group"><label>${foundry.utils.escapeHTML(
      F("l5r4.magic.spells.chooseElement", { spell: spell.name })
    )}</label>${select.outerHTML}</div>`,
    ok: { callback: (_event, button) => button.form.elements.element.value || null },
    rejectClose: false,
    modal: true
  });
}

/**
 * A spell above the caster's School Rank in its element cannot be cast (p.164). A player is told so; a GM is asked
 * whether to cast it anyway (Ernie's ruling, 2026-11-14).
 * @returns {Promise<boolean>} Whether the cast goes ahead
 */
function castAboveRank(actor, spell, mastery, limit) {
  return gmMayAllow({
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
 * Casts a spell.
 *
 * @param {Object} options
 * @param {L5R4Actor} options.actor - The caster
 * @param {Item} options.spell - The spell item
 * @param {boolean} [options.showDialog=true] - Show the roll dialog
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled or casting is blocked
 */
export async function SpellCastRoll({ actor, spell, showDialog = true } = {}) {
  const spellRing = String(spell.system.ring).toLowerCase();
  const ring = spellRing === "all" ? await chooseElement(spell) : spellRing;
  if (!ring) {
    return null;
  }
  const ringValue = ringRank(actor, ring);
  const shift = getAffinityDeficiencyModifier(actor, ring);
  const schoolRank = castingSchoolRank(actor) + shift;
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
  if (mastery > schoolRank && !(await castAboveRank(actor, spell, mastery, schoolRank))) {
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
    tn: 5 + 5 * mastery,
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
