/**
 * @module services/xp/versioning
 * @description Change detection for a character's XP data: a content hash of the Traits, Skills, Void rank, and
 * purchased advantages, disadvantages, kata, and kiho, compared with the version stored in
 * `flags[SYS_ID].xpRetroactiveVersion`, tells the XP manager when to rebuild the XP history so it shows the current
 * costs. The rebuild stores the history in `flags[SYS_ID].xpSpentCache` with the version it was built at.
 */

import { SYS_ID } from "../../config/constants.js";
import { logError } from "../../utils/error-logging.js";
import { buildXpHistory } from "./calculator.js";

/**
 * Calculates a hash-based version identifier for an actor's XP-relevant data.
 *
 * Generates a deterministic hash from all character data that affects XP cost
 * calculations according to L5R4 advancement rules:
 * - All 8 trait values (Stamina, Willpower, Strength, Perception, Reflexes, Awareness, Agility, Intelligence)
 * - Void ring rank
 * - All skills with their ranks, free ranks, emphasis, and free emphasis
 * - All XP-costing items (advantages, disadvantages, kata, kiho) with their costs
 * - The price of each entry the XP ledger charged, which Cost rules change
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
export function getXpDataVersion(actor) {
  try {
    return getHashCode(JSON.stringify(buildXpVersionData(actor)));
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
 * @see getXpDataVersion for version generation logic
 * @see buildXpHistory in xp-calculator.js which rebuilds the history when needed
 */
export async function isRetroactiveUpdateDue(actor) {
  try {
    // Retrieve stored version from actor flags (Foundry flag system)
    const flags = actor.flags?.[SYS_ID] ?? {};
    const lastUpdateVersion = flags.xpRetroactiveVersion || 0;
    const currentVersion = getXpDataVersion(actor);

    // Check if recalculation needed
    const isFirstRun = lastUpdateVersion === 0;
    const hasDataChanged = lastUpdateVersion !== currentVersion;

    return isFirstRun || hasDataChanged;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to check retroactive XP update need", err);
    return true; // Fail-safe: trigger update on error to ensure data consistency
  }
}

/**
 * The XP history the XP manager last stored for an actor, empty before the first rebuild.
 * @param {Actor} actor
 * @returns {Array<object>} XP spending entries
 */
export function xpSpentOf(actor) {
  const flags = actor.flags?.[SYS_ID] ?? {};
  return Array.isArray(flags.xpSpentCache) ? flags.xpSpentCache : [];
}

/**
 * Rebuild an actor's XP history from its items and store it with the current version. The history is written only
 * when it changed, so an unchanged rebuild re-renders nothing; a failure is logged, and the XP manager still opens.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function updateXpHistory(actor) {
  try {
    // Rebuild XP spending history from current actor items
    // This recalculates all XP costs based on current item data
    const retroactiveSpent = await buildXpHistory(actor);
    const existingCache = xpSpentOf(actor);

    // Write the cache only when the spending history differs
    // This prevents unnecessary flag updates and re-renders
    const changed = JSON.stringify(existingCache) !== JSON.stringify(retroactiveSpent);
    if (changed) {
      await actor.setFlag(SYS_ID, "xpSpentCache", retroactiveSpent);
    }

    // Update version flag to prevent redundant recalculations
    // The version is a hash of the XP-relevant Traits, Void Ring, Skills, items, and ledger prices
    const currentVersion = getXpDataVersion(actor);
    await actor.setFlag(SYS_ID, "xpRetroactiveVersion", currentVersion);
  } catch (err) {
    logError("Failed to perform retroactive XP update", err, {
      actorId: actor?.id
    });
  }
}

/**
 * Collects the actor's XP-relevant data into a serializable structure.
 * @param {Actor} actor - The actor document to version
 * @returns {object} The Traits, Void rank, Skills, XP-costing items, and ledger prices
 */
function buildXpVersionData(actor) {
  const sys = actor?.system ?? {};
  const items = actor?.items ?? [];
  return {
    traits: sys.traits || {},
    voidRank: sys.rings?.void?.rank || 0,
    skills: items
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
    items: items
      .filter(i => ["advantage", "disadvantage", "kata", "kiho"].includes(i.type))
      .map(i => ({
        id: i.id,
        type: i.type,
        cost: i.system?.cost || 0
      })),
    // The prices the ledger charged, so a Cost rule that changes one changes the version (roadmap/STAGE-11)
    prices: (sys._xp?.entries ?? []).map(e => e.delta)
  };
}

/**
 * Hashes a string to a 32-bit integer, as Java's String.hashCode does, and returns its absolute value.
 * @param {string} str - The text to hash
 * @returns {number} A positive integer
 */
function getHashCode(str) {
  // ((hash << 5) - hash) is hash * 31; the bitwise AND keeps the value within 32-bit integer range
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Bitwise AND for 32-bit integer conversion
  }
  return Math.abs(hash);
}
