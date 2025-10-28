/**
 * XP Data Versioning Service
 *
 * Provides change detection and versioning for character XP-related data to determine
 * when retroactive XP history recalculation is needed. Uses content-based hashing to
 * generate version identifiers from traits, skills, void rank, and purchased items.
 *
 * This supports the L5R4 character advancement system where XP costs are calculated
 * based on trait ranks, skill ranks, void rank, and purchased advantages/disadvantages/
 * kata/kiho. When any of these values change, the XP history must be rebuilt to reflect
 * the new costs.
 *
 * Foundry VTT APIs used:
 * - Actor document flags for version tracking (flags[SYS_ID].xpRetroactiveVersion)
 * - Actor.items collection for skills and purchasable items
 * - Actor.system for traits and rings data
 *
 * @module services/xp/xp-versioning
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Calculates a hash-based version identifier for an actor's XP-relevant data.
 *
 * Generates a deterministic hash from all character data that affects XP cost
 * calculations according to L5R4 advancement rules:
 * - All 8 trait values (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
 * - Void ring rank
 * - All skills with their ranks, free ranks, emphasis, and free emphasis
 * - All XP-costing items (advantages, disadvantages, kata, kiho) with their costs
 *
 * Uses a 32-bit hash algorithm (similar to Java's String.hashCode()) for fast,
 * consistent versioning. If hashing fails, falls back to timestamp to ensure
 * a valid version is always returned.
 *
 * @param {Actor} actor - The actor document to version (Foundry Actor document)
 * @returns {number} A positive integer version hash, or current timestamp on error
 *
 * @see buildXpHistory in xp-calculator.js which uses this version to detect changes
 */
export function calculateXpDataVersion(actor) {
  try {
    const sys = actor.system ?? {};

    // Collect all XP-relevant data into a serializable structure
    const xpData = {
      traits: sys.traits || {},
      voidRank: sys.rings?.void?.rank || 0,
      skills: actor.items
        .filter(i => i.type === "skill")
        .map(i => ({
          id: i.id,
          rank: i.system?.rank || 0,
          freeRanks: i.system?.freeRanks || 0,
          trainedEmphases: Array.isArray(i.system?.trainedEmphases)
            ? i.system.trainedEmphases.join(",")
            : "",
          freeEmphasis: i.system?.freeEmphasis || 0
        })),
      items: actor.items
        .filter(i => ["advantage", "disadvantage", "kata", "kiho"].includes(i.type))
        .map(i => ({
          id: i.id,
          type: i.type,
          cost: i.system?.cost || 0
        }))
    };

    // Generate hash using 32-bit algorithm (similar to Java String.hashCode)
    // Left shift by 5 and subtract original creates ((hash << 5) - hash) = hash * 31
    // The bitwise AND operation keeps the value within 32-bit integer range
    const str = JSON.stringify(xpData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Bitwise AND for 32-bit integer conversion
    }
    return Math.abs(hash);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to calculate XP data version", err);
    return Date.now(); // Fallback ensures update triggers on error
  }
}

/**
 * Determines if an actor's XP history requires retroactive recalculation.
 *
 * Checks two conditions that require XP history rebuild:
 * 1. **First run**: No previous version exists (xpRetroactiveVersion flag is 0)
 * 2. **Data changed**: Current XP data hash differs from stored version
 *
 * Note: Missing cache is no longer checked - if cache is missing, version will be 0
 * which triggers recalculation via condition 1.
 *
 * This function is called before rendering the XP Manager UI to ensure displayed
 * XP costs reflect the character's current state.
 *
 * @param {Actor} actor - The actor document to check (Foundry Actor document)
 * @returns {Promise<boolean>} True if retroactive XP update is needed, false otherwise.
 *                             Returns true on error to ensure data consistency.
 *
 * @see calculateXpDataVersion for version generation logic
 * @see buildXpHistory in xp-calculator.js which rebuilds the history when needed
 */
export async function needsRetroactiveUpdate(actor) {
  try {
    // Retrieve stored version from actor flags (Foundry flag system)
    const flags = actor.flags?.[SYS_ID] ?? {};
    const lastUpdateVersion = flags.xpRetroactiveVersion || 0;
    const currentVersion = calculateXpDataVersion(actor);

    // Check if recalculation needed
    const isFirstRun = lastUpdateVersion === 0;
    const hasDataChanged = lastUpdateVersion !== currentVersion;

    return isFirstRun || hasDataChanged;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to check retroactive XP update need", err);
    return true; // Fail-safe: trigger update on error to ensure data consistency
  }
}
