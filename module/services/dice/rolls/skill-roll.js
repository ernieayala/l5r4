/**
 * Skill Roll Service
 *
 * A Skill Roll (p.79) or a weapon attack with its Skill, through the roll pipeline
 * (module/services/dice/check/roll-check.js): (Skill + Trait)k(Trait), an Unskilled Roll at rank 0 (p.80), an
 * Emphasis offered from the Skill's trained Emphases (p.133). The pipeline gathers every modifier once, so callers
 * pass only what the sheet does not hold.
 *
 * @module services/dice/rolls/skill-roll
 */

import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { rollCheck } from "../check/roll-check.js";
import { resolveActor } from "../resources/void-manager.js";

/**
 * The localized name of a Skill: its translation when the system has one, else the item's name.
 * @param {string} skillName
 * @returns {string}
 */
function skillLabel(skillName) {
  const key = `l5r4.character.skills.names.${String(skillName).toLowerCase()}`;
  return game.i18n.has(key) ? T(key) : String(skillName);
}

/**
 * Executes a Skill Roll or a Skill attack.
 *
 * @async
 * @param {Object} options
 * @param {number|null} [options.actorTrait=null] - The Trait's effective rank (kept dice)
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
export async function SkillRoll({
  actorTrait = null,
  skillRank = null,
  skillName = null,
  skillTrait = null,
  askForOptions = true,
  rollBonus = 0,
  keepBonus = 0,
  totalBonus = 0,
  actor = null,
  rollType = null,
  weaponId = null
} = {}) {
  const roller = resolveActor(actor);
  const trait = toInt(actorTrait);
  const rank = toInt(skillRank);
  const skillKey = String(skillName ?? "").toLowerCase();
  const skillItem = roller.items.find(i => i.type === "skill" && i.name.toLowerCase() === skillKey);
  const traitLabel = T(
    skillTrait === "void"
      ? "l5r4.ui.mechanics.rings.void"
      : `l5r4.ui.mechanics.traits.${skillTrait}`
  );
  const weapon = weaponId ? roller.items.get(weaponId) : null;

  const modifiers = [];
  if (rollBonus || keepBonus || totalBonus) {
    modifiers.push({
      label: T("l5r4.ui.check.caller"),
      roll: toInt(rollBonus),
      keep: toInt(keepBonus),
      total: toInt(totalBonus)
    });
  }

  return rollCheck({
    actor: roller,
    kind: rollType === "attack" ? "attack" : "skill",
    label: `${T("l5r4.ui.mechanics.rolls.skillRoll")}: ${skillLabel(skillName)} / ${traitLabel}`,
    base: { roll: trait + rank, keep: trait },
    skill: skillKey,
    trait: skillTrait,
    unskilled: rank === 0,
    emphases: skillItem?.system.trainedEmphases ?? [],
    weapon,
    ranged: Boolean(weapon?.system.isBow),
    modifiers,
    askForOptions
  });
}
