/**
 * @module services/dice/rolls/simple-roll
 * @description A roll from a pool the caller already knows, through the roll pipeline
 * (module/services/dice/check/roll-check.js): NPC attacks and damage from the stat block, an unskilled weapon attack,
 * an NPC Trait or Ring Roll, or a plain XkY roll.
 */

import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { toTraitKey } from "../../../utils/trait-keys.js";
import { rollCheck } from "../check/roll-check.js";
import { getRollActor } from "../resources/void-points.js";

/**
 * Executes a roll from a known pool.
 *
 * Pool source, in order: roll/keep when both are given, else traitRank (a Trait Roll), else ringRank (a
 * Ring Roll). With `unskilled` the roll is an Unskilled Roll.
 * game-rules/30_skill_rolls_expanded.md, p.80
 *
 * @param {object} params
 * @param {string|null} [params.rollName=null] - Name for a plain roll's label
 * @param {number|null} [params.roll=null] - Rolled dice
 * @param {number|null} [params.keep=null] - Kept dice
 * @param {string|null} [params.traitName=null] - Trait of a Trait Roll
 * @param {number|null} [params.traitRank=null] - Its rank
 * @param {string|null} [params.ringName=null] - Ring of a Ring Roll
 * @param {number|null} [params.ringRank=null] - Its rank
 * @param {number} [params.modifier=0] - Flat bonus from the stat block, listed as a modifier
 * @param {string|null} [params.rollType=null] - "attack", "damage", or null
 * @param {L5R4Actor|null} [params.actor=null] - The roller
 * @param {boolean} [params.unskilled=false] - An Unskilled Roll
 * @param {string|null} [params.weaponId=null] - The attacking weapon's item id
 * @param {boolean} [params.isBow=false] - The attack starts as ranged
 * @param {string|null} [params.skillName=null] - Skill the attack would use, for armor penalties and rules
 * @param {string|null} [params.skillTrait=null] - Trait the attack uses
 * @param {boolean} [params.askForOptions=true] - Show the roll dialog
 * @param {{label: string, roll: number, keep: number, bonus?: number}|null} [params.damage=null] - An attack's
 *   damage pool when no weapon gives one (a stat block's damage)
 * @returns {Promise<ChatMessage|null>} The posted message, or null when cancelled
 */
export async function rollPool({
  rollType = null,
  actor = null,
  askForOptions = true,
  ...params
} = {}) {
  const roller = getRollActor(actor);
  const source = buildPoolSource(params, { rollType });
  return rollCheck({
    actor: roller,
    kind: source.kind,
    label: source.label,
    base: source.base,
    ...buildPoolTerms(roller, params, source),
    askForOptions
  });
}

/**
 * Where a known pool comes from, in order: roll/keep when both are given, else traitRank (a Trait Roll), else
 * ringRank (a Ring Roll); with its label and the check's kind, which an attack or damage roll keeps.
 * @param {object} params - rollPool's pool options
 * @param {string|null} [params.rollName=null] - Name for a plain roll's label
 * @param {number|null} [params.roll=null] - Rolled dice
 * @param {number|null} [params.keep=null] - Kept dice
 * @param {string|null} [params.traitName=null] - Trait of a Trait Roll
 * @param {number|null} [params.traitRank=null] - Its rank
 * @param {string|null} [params.ringName=null] - Ring of a Ring Roll
 * @param {number|null} [params.ringRank=null] - Its rank
 * @param {{rollType: string|null}} roll - "attack", "damage", or null
 * @returns {{base: object, label: string, kind: string, traitKey: string|null, ringKey: string|null}}
 */
function buildPoolSource(
  {
    rollName = null,
    roll = null,
    keep = null,
    traitName = null,
    traitRank = null,
    ringName = null,
    ringRank = null
  },
  { rollType }
) {
  const traitKey = traitName ? toTraitKey(traitName) : null;
  const ringKey = ringName ? String(ringName).toLowerCase() : null;
  const kind = rollType === "attack" || rollType === "damage" ? rollType : "roll";
  if (roll !== null && keep !== null) {
    const label = F("l5r4.ui.mechanics.rolls.namedRoll", { roll: String(rollName ?? "") });
    return { base: { roll: toInt(roll), keep: toInt(keep) }, label, kind, traitKey, ringKey };
  }
  if (traitKey) {
    const traitName = T(`l5r4.ui.mechanics.traits.${traitKey}`);
    const label = F("l5r4.ui.mechanics.rolls.traitRollLabel", { traitName });
    const base = { roll: toInt(traitRank), keep: toInt(traitRank) };
    return { base, label, kind: rollType ? kind : "trait", traitKey, ringKey };
  }
  const element = T(`l5r4.ui.mechanics.rings.${ringKey}`);
  const label = F("l5r4.ui.mechanics.rolls.ringRollLabel", { element });
  const base = { roll: toInt(ringRank), keep: toInt(ringRank) };
  return { base, label, kind: rollType ? kind : "ring", traitKey, ringKey };
}

/**
 * The rest of a known pool's check: the Skill and Trait an attack would use, the Ring of a Ring Roll, the weapon and
 * its damage dice, the stat block's flat bonus, and an Unskilled Roll.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {L5R4Actor} roller - The roller
 * @param {object} params - rollPool's other options
 * @param {number} [params.modifier=0] - Flat bonus from the stat block, listed as a modifier
 * @param {boolean} [params.unskilled=false] - An Unskilled Roll
 * @param {string|null} [params.weaponId=null] - The attacking weapon's item id
 * @param {boolean} [params.isBow=false] - The attack starts as ranged
 * @param {string|null} [params.skillName=null] - Skill the attack would use, for armor penalties and rules
 * @param {string|null} [params.skillTrait=null] - Trait the attack uses
 * @param {object|null} [params.damage=null] - An attack's damage pool when no weapon gives one
 * @param {{kind: string, traitKey: string|null, ringKey: string|null}} source - The pool's source (buildPoolSource)
 * @returns {object} The check request's terms
 */
function buildPoolTerms(
  roller,
  {
    modifier = 0,
    unskilled = false,
    weaponId = null,
    isBow = false,
    skillName = null,
    skillTrait = null,
    damage = null
  },
  { kind, traitKey, ringKey }
) {
  const weapon = weaponId ? roller.items.get(weaponId) : null;
  return {
    skill: skillName ? String(skillName).toLowerCase() : undefined,
    trait: skillTrait ?? traitKey ?? undefined,
    ring: kind === "ring" ? ringKey : undefined,
    unskilled: Boolean(unskilled),
    weapon,
    explode: kind === "damage" && weapon ? weapon.system.damageExplode : 10,
    ranged: Boolean(isBow),
    modifiers: modifier ? [{ label: T("l5r4.ui.check.statBlock"), total: toInt(modifier) }] : [],
    ...(damage ? { damage } : {})
  };
}
