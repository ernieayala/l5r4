/**
 * @module utils/insight
 * @description Insight beyond the Rings and Skill ranks: the Insight that Skills' Mastery Abilities add.
 * game-rules/49_improving_your_character.md, p.104
 * game-rules/59_high_skills.md, p.135-136
 */

import { MASTERY_INSIGHT } from "../config/game-mechanics.js";

/**
 * The Insight the Skills' Mastery Abilities add: Courtier 3 gives 3, Courtier 7 gives 10, and Courtier 3 with
 * Etiquette 7 gives 13.
 * game-rules/59_high_skills.md, p.135-136
 * @param {Array<{name: string, rank: number}>} skills - Each Skill's name and rank
 * @returns {number}
 */
export function getMasteryInsight(skills) {
  let total = 0;
  for (const { name, rank } of skills) {
    for (const step of MASTERY_INSIGHT[name.toLowerCase().trim()] ?? []) {
      total += rank >= step.rank ? step.insight : 0;
    }
  }
  return total;
}
