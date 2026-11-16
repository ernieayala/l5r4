/**
 * @module utils/spell-casting
 * @description What a shugenja's Spell Casting Roll reads from the character: the School Rank the shugenja casts
 * with, and the Affinity or Deficiency the shugenja's Techniques give the casting Ring.
 */

import { toString } from "./type-coercion.js";
import { logError } from "./error-logging.js";

/**
 * The School Rank a shugenja casts with: the rank of the School marked as the shugenja School, or the Insight
 * Rank, which is the School Rank of a character with one School.
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/49_improving_your_character.md, p.104
 * game-rules/66_magic_and_spell_casting.md, p.163
 * @param {object} actor
 * @returns {number}
 */
export function getCastingSchoolRank(actor) {
  const school = actor.items.find(item => item.type === "school" && item.system.shugenja);
  return school ? school.system.schoolRank : actor.system.insightRank;
}

/**
 * Gets shugenja affinity/deficiency modifier for spell casting.
 *
 * Shugenja have affinity (+1k0) or deficiency (-1k0) with specific rings.
 * If character has both affinity and deficiency for same ring, they cancel.
 * @param {object} actor - Foundry actor document
 * @param {string} ringKey - Ring element ("fire", "water", "air", "earth", "void")
 * @returns {number} Modifier: 1 (affinity), -1 (deficiency), or 0 (none/cancel)
 */
export function getAffinityDeficiencyModifier(actor, ringKey) {
  if (!actor || !ringKey) {
    return 0;
  }

  const normalizedRing = toString(ringKey).toLowerCase().trim();
  if (!normalizedRing) {
    return 0;
  }

  // Find all shugenja techniques (grant affinity/deficiency)
  let shugenjaItems;
  try {
    const items = actor.items?.contents ?? actor.items ?? [];
    shugenjaItems = Array.from(items).filter(
      i => i.type === "technique" && i.system?.shugenja === true
    );
  } catch (err) {
    logError("Failed to find technique items in getAffinityDeficiencyModifier", err);
    return 0;
  }

  // Collect all modifiers (use Set to track unique values)
  const modifiers = new Set();
  for (const item of shugenjaItems) {
    if (!item?.system) {
      continue;
    }

    const affinity = toString(item.system.affinity).toLowerCase().trim();
    if (affinity === normalizedRing) {
      modifiers.add(1);
    }

    const deficiency = toString(item.system.deficiency).toLowerCase().trim();
    if (deficiency === normalizedRing) {
      modifiers.add(-1);
    }
  }

  // If both affinity and deficiency present, they cancel out
  if (modifiers.size > 1) {
    return 0;
  }

  // Return single modifier if present, otherwise 0
  return modifiers.size === 1 ? modifiers.values().next().value : 0;
}
