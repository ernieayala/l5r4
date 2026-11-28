/**
 * @module services/dice/rolls/skill-roll
 * @description A Skill Roll or a weapon attack with its Skill, through the roll pipeline
 * (module/services/dice/check/roll-check.js): (Skill + Trait)k(Trait), an Unskilled Roll at rank 0, an Emphasis
 * offered from the Skill's trained Emphases. The pipeline gathers every modifier once, so callers pass only what the
 * sheet does not hold.
 * game-rules/29_types_of_rolls.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/58_skills_overview.md, p.133
 */

import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getSkillItem, toSkillKey } from "../../../utils/selectors.js";
import { rollCheck } from "../check/roll-check.js";
import { getRollActor } from "../resources/void-points.js";

/**
 * The localized name of a Skill: its translation when the system has one, else the item's name.
 * @param {string} skillName
 * @returns {string}
 */
export function formatSkillLabel(skillName) {
  const key = `l5r4.character.skills.names.${String(skillName).toLowerCase()}`;
  return game.i18n.has(key) ? T(key) : String(skillName);
}

/**
 * Executes a Skill Roll or a Skill attack.
 *
 * @param {object} options
 * @param {number|null} [options.traitRank=null] - The Trait's effective rank (kept dice)
 * @param {number|null} [options.skillRank=null] - Skill rank (rolled dice); 0 is an Unskilled Roll
 * @param {string|null} [options.skillName=null] - Skill name, for its item, Emphases, and rules
 * @param {string|null} [options.skillTrait=null] - Trait key ("void" for the Void Ring)
 * @param {boolean} [options.askForOptions=true] - Show the roll dialog (Shift-click skips it)
 * @param {number} [options.rollBonus=0] - Extra rolled dice from the caller, listed as a modifier
 * @param {number} [options.keepBonus=0] - Extra kept dice from the caller
 * @param {number} [options.totalBonus=0] - Extra flat bonus from the caller
 * @param {L5R4Actor|null} [options.actor=null] - The roller
 * @param {string|null} [options.rollType=null] - "attack" for a weapon attack
 * @param {string|null} [options.weaponId=null] - The attacking weapon's item id
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function rollSkill({
  askForOptions = true,
  actor = null,
  rollType = null,
  weaponId = null,
  ...skill
} = {}) {
  const roller = getRollActor(actor);
  const weapon = weaponId ? roller.items.get(weaponId) : null;
  return rollCheck({
    actor: roller,
    kind: rollType === "attack" ? "attack" : "skill",
    ...buildSkillTerms(roller, skill),
    weapon,
    ranged: Boolean(weapon?.system.isBow),
    askForOptions
  });
}

/**
 * What a Skill Roll rolls: (Skill + Trait)k(Trait), an Unskilled Roll at rank 0, the Skill's trained Emphases, and
 * the caller's extra dice as a modifier.
 * game-rules/29_types_of_rolls.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {L5R4Actor} roller - The roller
 * @param {object} skill - rollSkill's Skill options
 * @param {number|null} [skill.traitRank=null] - The Trait's effective rank (kept dice)
 * @param {number|null} [skill.skillRank=null] - Skill rank (rolled dice); 0 is an Unskilled Roll
 * @param {string|null} [skill.skillName=null] - Skill name, for its item, Emphases, and rules
 * @param {string|null} [skill.skillTrait=null] - Trait key ("void" for the Void Ring)
 * @param {number} [skill.rollBonus=0] - Extra rolled dice from the caller, listed as a modifier
 * @param {number} [skill.keepBonus=0] - Extra kept dice from the caller
 * @param {number} [skill.totalBonus=0] - Extra flat bonus from the caller
 * @returns {object} The check request's label, pool, Skill, Trait, Emphases, and modifiers
 */
function buildSkillTerms(
  roller,
  {
    traitRank = null,
    skillRank = null,
    skillName = null,
    skillTrait = null,
    rollBonus = 0,
    keepBonus = 0,
    totalBonus = 0
  }
) {
  const trait = toInt(traitRank);
  const rank = toInt(skillRank);
  const skillKey = toSkillKey(skillName);
  const skillItem = getSkillItem(roller.items, skillKey);
  return {
    label: formatSkillRollLabel(skillName, skillTrait),
    base: { roll: trait + rank, keep: trait },
    skill: skillKey,
    trait: skillTrait,
    unskilled: rank === 0,
    emphases: skillItem?.system.trainedEmphases ?? [],
    modifiers: buildCallerModifiers({ rollBonus, keepBonus, totalBonus })
  };
}

/**
 * A Skill Roll's label: the Skill's localized name and its Trait's, or the Void Ring's.
 * @param {string|null} skillName - The Skill's name
 * @param {string|null} skillTrait - The Trait key, or "void"
 * @returns {string}
 */
function formatSkillRollLabel(skillName, skillTrait) {
  const traitLabel = T(
    skillTrait === "void"
      ? "l5r4.ui.mechanics.rings.void"
      : `l5r4.ui.mechanics.traits.${skillTrait}`
  );
  return F("l5r4.ui.mechanics.rolls.skillRollLabel", {
    skillName: formatSkillLabel(skillName),
    traitName: traitLabel
  });
}

/**
 * The caller's extra dice and bonus as one modifier, when there are any.
 * @param {{rollBonus: number, keepBonus: number, totalBonus: number}} bonuses - Rolled, kept, and flat extras
 * @returns {object[]}
 */
function buildCallerModifiers({ rollBonus, keepBonus, totalBonus }) {
  if (!(rollBonus || keepBonus || totalBonus)) {
    return [];
  }
  return [
    {
      label: T("l5r4.ui.check.caller"),
      roll: toInt(rollBonus),
      keep: toInt(keepBonus),
      total: toInt(totalBonus)
    }
  ];
}
