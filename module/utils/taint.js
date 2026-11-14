/**
 * @module taint
 * @description What a character's Shadowlands Taint Rank does on its own (Core Rulebook pp.277-279; roadmap/STAGE-11
 * decision 5). Exposure and growth rolls stay the GM's.
 */

/** Traits whose rolls a Tainted character may enhance by Embracing the Taint (p.279). */
export const PHYSICAL_TRAITS = Object.freeze(["str", "agi", "ref", "sta"]);

/**
 * @typedef {object} TaintEffects
 * @property {number} level             Level of infection: 0 below one full Rank, up to 4 (pp.277-278)
 * @property {number} socialPenalty     Rolled dice taken from social Skill rolls: 1 at Level 3, 2 from Level 4
 * @property {number} voidPointsLost    Maximum Void Points lost: 1 from Level 4 (p.278); a Lost character has none
 *   (p.279), which voidPointsMax applies
 * @property {{roll: number, keep: number}} honorRollPenalty  Dice taken from the optional Honor Roll: 2k2 from
 *   Level 4
 */

/**
 * The effects of a Taint Rank. Level 4's social penalty replaces Level 3's (STAGE-11 decision 5).
 * @param {number} rank  Taint Rank (the stored rank; points are the fraction, decision 10)
 * @returns {TaintEffects}
 *
 * @example
 * taintEffects(3).socialPenalty; // 1
 * taintEffects(6).voidPointsLost; // 1
 */
export function taintEffects(rank) {
  const level = Math.max(0, Math.min(4, rank));
  const deadly = level >= 4;
  return {
    level,
    socialPenalty: deadly ? 2 : level >= 3 ? 1 : 0,
    voidPointsLost: deadly ? 1 : 0,
    honorRollPenalty: deadly ? { roll: 2, keep: 2 } : { roll: 0, keep: 0 }
  };
}

/**
 * Whether a Taint Rank makes a character Lost (p.278): Rank 5, or Rank 7 for one with a Ring at 6 or higher.
 * @param {number} rank
 * @param {number} highestRing
 * @returns {boolean}
 */
export function isLost(rank, highestRing) {
  return rank >= (highestRing >= 6 ? 7 : 5);
}

/**
 * The highest of a character's Rings, the Void Ring included: a Ring at 6 or higher delays being Lost (p.278).
 * @param {{air: number, earth: number, fire: number, water: number, void: {rank: number}}} rings  Prepared Rings
 * @returns {number}
 */
export function highestRing(rings) {
  return Math.max(rings.air, rings.earth, rings.fire, rings.water, rings.void.rank);
}

/**
 * The most Void Points a Tainted character holds: the Void Ring, less 1 from Level 4 (p.278); none once Lost, who
 * keeps the Void Ring itself (p.279).
 * @param {number} voidRing
 * @param {number} rank       Taint Rank
 * @param {number} highestRing
 * @returns {number}
 */
export function voidPointsMax(voidRing, rank, highestRing) {
  return isLost(rank, highestRing) ? 0 : Math.max(0, voidRing - taintEffects(rank).voidPointsLost);
}

/**
 * Whether a roll can be enhanced by Embracing the Taint (p.279): a roll using a physical Trait, not damage, by a
 * character at Level 1 or higher who is not Lost.
 * @param {object} spec
 * @param {number} spec.rank
 * @param {number} spec.highestRing
 * @param {string} spec.kind   The roll's kind
 * @param {string} [spec.trait] The Trait in the roll
 * @returns {boolean}
 */
export function canEmbraceTaint({ rank, highestRing, kind, trait }) {
  return physicalRoll(kind, trait) && rank >= 1 && !isLost(rank, highestRing);
}

/**
 * What the Taint adds to the total of a Lost character's roll (p.279): the Taint Rank, on every roll using a
 * physical Trait. Not on damage, as with Embracing the Taint (Ernie's ruling, 2026-11-14).
 * @param {object} spec  As canEmbraceTaint
 * @returns {number}
 *
 * @example
 * lostBonus({ rank: 5, highestRing: 4, kind: "skill", trait: "agi" }); // 5
 * lostBonus({ rank: 5, highestRing: 6, kind: "skill", trait: "agi" }); // 0, not Lost until Rank 7
 */
export function lostBonus({ rank, highestRing, kind, trait }) {
  return physicalRoll(kind, trait) && isLost(rank, highestRing) ? rank : 0;
}

/**
 * Whether a roll uses a physical Trait and is not a damage roll (p.279).
 * @param {string} kind
 * @param {string} [trait]
 * @returns {boolean}
 */
function physicalRoll(kind, trait) {
  return kind !== "damage" && PHYSICAL_TRAITS.includes(trait);
}
