/**
 * @module documents/actor/calculations/item-enrichment-system
 * @description Adds roll formulas to an actor's owned items during actor data preparation, from the actor's Traits,
 * Rings, School Rank, and rules: a Skill's roll, a spell's casting roll and TN, a weapon's attack and damage. The
 * values are written onto the prepared items as display strings ("7k4") and recomputed on every preparation.
 */

import { toInt } from "../../../utils/type-coercion.js";
import { logError } from "../../../utils/error-logging.js";
import { T } from "../../../utils/localization.js";
import {
  castingSchoolRank,
  displayRollBonus,
  getAffinityDeficiencyModifier,
  getEffectiveTrait,
  resolveWeaponSkillTrait,
  ringRank
} from "../../../utils/mechanics.js";
import { selectorBonus } from "../../../utils/rule-engine.js";
import { prepareWeaponDamage } from "../../item/preparation/derived-data.js";

/**
 * Add roll formulas to every Skill, spell, and weapon the actor owns. A failure leaves the items without formulas
 * and is logged, so the sheet still renders.
 * @param {Actor} actor - The actor whose items to enrich
 */
export function enrichActorItems(actor) {
  if (!actor?.items) {
    return;
  }

  try {
    for (const item of actor.items) {
      if (!item?.type) {
        continue;
      }

      switch (item.type) {
        case "skill":
          enrichSkillFormulas(actor, item);
          break;
        case "spell":
          enrichSpellFormulas(actor, item);
          break;
        case "weapon":
        case "bow":
          enrichWeaponFormulas(actor, item);
          break;
        default:
          break;
      }
    }
  } catch (err) {
    logError("Failed to enrich actor items", err, {
      actorId: actor?.id,
      actorName: actor?.name
    });
    // Items remain unenriched - formulas won't display but won't break functionality
  }
}

/**
 * Set a Skill's `rollDice`, `rollKeep`, and `rollFormula`: Trait + rank + roll bonuses, keep Trait + keep bonuses,
 * each at least 0. The bonuses are the Skill's and the Trait's from Active Effects and rules.
 * @param {Actor} actor - The actor who owns the skill
 * @param {Item} skill - The skill item to enrich
 */
function enrichSkillFormulas(actor, skill) {
  const traitKey = String(skill.system?.trait ?? "").toLowerCase();
  const traitEff = getEffectiveTrait(actor, traitKey);
  const rank = toInt(skill.system?.rank);

  // Skill and Trait bonuses from Active Effects and rules, as the roll pipeline starts from
  const { roll: rollBonus, keep: keepBonus } = displayRollBonus(actor, {
    skill: String(skill.name).toLowerCase(),
    trait: traitKey
  });

  // Calculate final roll/keep values (minimum 0)
  skill.system.rollDice = Math.max(0, traitEff + rank + rollBonus);
  skill.system.rollKeep = Math.max(0, traitEff + keepBonus);
  skill.system.rollFormula = `${skill.system.rollDice}k${skill.system.rollKeep}`;
}

/**
 * Set a spell's `castTN`, `castRoll`, `castKeep`, and `castFormula`: Ring + School Rank, keep Ring, the School Rank
 * moved by the caster's Affinity or Deficiency for the spell's element.
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/66_magic_and_spell_casting.md, p.163-164
 * game-rules/67_universal_spells.md, p.164-165
 * @param {Actor} actor - The actor who owns the spell
 * @param {Item} spell - The spell item to enrich
 */
function enrichSpellFormulas(actor, spell) {
  const masteryLevel = Math.max(1, toInt(spell.system.mastery));
  // Casting TN: 5 + 5 x Mastery Level
  // game-rules/66_magic_and_spell_casting.md, p.163
  spell.system.castTN = 5 + masteryLevel * 5;

  // A universal spell's element is chosen when it is cast
  // game-rules/67_universal_spells.md, p.164-165
  const ringKey = String(spell.system.ring).toLowerCase();
  if (ringKey === "all") {
    spell.system.castRoll = 0;
    spell.system.castKeep = 0;
    spell.system.castFormula = T("l5r4.magic.spells.anyElement");
    return;
  }

  // The same pool the Spell Casting Roll rolls (module/services/dice/rolls/spell-cast-roll.js): Ring + School Rank,
  // keep Ring, the School Rank moved by Affinity or Deficiency
  // game-rules/29_types_of_rolls.md, p.80
  // game-rules/66_magic_and_spell_casting.md, p.163-164
  const ringValue = ringRank(actor, ringKey);
  const schoolRank = castingSchoolRank(actor) + getAffinityDeficiencyModifier(actor, ringKey);
  spell.system.castRoll = Math.max(0, ringValue + schoolRank);
  spell.system.castKeep = Math.max(0, ringValue);
  spell.system.castFormula = `${spell.system.castRoll}k${spell.system.castKeep}`;
}

/**
 * Set a weapon's `attackFormula` and `damageFormula`. The attack is the weapon Skill and Trait
 * (resolveWeaponSkillTrait) plus the RollModifier rules on every attack, such as the Full Attack Stance's +2k1;
 * optional and range-limited rules wait for the roll dialog. The damage is the weapon's prepared damage.
 * game-rules/36_stances.md, p.84
 * @param {Actor} actor - The actor who owns the weapon
 * @param {Item} weapon - The weapon or bow item to enrich
 */
function enrichWeaponFormulas(actor, weapon) {
  const weaponSkill = resolveWeaponSkillTrait(actor, weapon);
  const attack = selectorBonus(actor.ruleBag, ["any", "attack"], actor.rollOptions, weapon.id);
  weapon.attackFormula = `${weaponSkill.rollBonus + attack.roll}k${weaponSkill.keepBonus + attack.keep}`;

  // Recompute damage now that the owner's Active Effects apply: item preparation ran before them (issue #29)
  prepareWeaponDamage(weapon);

  // Get damage values (prefer derived values if available)
  const damageRoll = toInt(weapon.system?.derivedDamageRoll ?? weapon.system?.damageRoll) || 0;
  const damageKeep = toInt(weapon.system?.derivedDamageKeep ?? weapon.system?.damageKeep) || 0;
  weapon.damageFormula = `${damageRoll}k${damageKeep}`;
}
