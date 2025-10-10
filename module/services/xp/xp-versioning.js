/**
 * @fileoverview L5R4 XP Versioning Service
 * 
 * Change detection system for XP data to minimize unnecessary retroactive updates.
 * Uses hash-based versioning to track when character data changes require XP history
 * to be rebuilt. This prevents timing issues with character sheet updates and improves
 * performance by only recalculating when needed.
 * 
 * **Core Responsibilities:**
 * - **Version Calculation**: Generate hash of XP-relevant character data
 * - **Change Detection**: Determine if retroactive update is needed
 * - **Flag Management**: Read/write version tracking flags
 * - **First-Run Detection**: Identify actors never processed before
 * 
 * **Design Principles:**
 * - **Pure Functions**: No side effects in calculation
 * - **Hash-Based**: Simple string hash for version comparison
 * - **Minimal Data**: Only hash XP-relevant fields
 * - **Performance**: Fast comparison to avoid delays
 * 
 * **Versioned Data:**
 * The hash includes:
 * - All trait values
 * - Void ring rank
 * - All skill ranks, free ranks, emphases, and free emphases
 * - All advantages, disadvantages, kata, and kiho with costs
 * 
 * **Update Triggers:**
 * Retroactive update is needed when:
 * 1. Never run before (lastUpdateVersion === 0)
 * 2. Actor data changed (version mismatch)
 * 3. No xpSpent data exists (legacy actor)
 * 
 * **Usage:**
 * ```javascript
 * import { needsRetroactiveUpdate, calculateXpDataVersion } from "./xp-versioning.js";
 * 
 * if (await needsRetroactiveUpdate(actor)) {
 *   const entries = await buildXpHistory(actor);
 *   await actor.setFlag(SYS_ID, "xpSpent", entries);
 *   await actor.setFlag(SYS_ID, "xpRetroactiveVersion", calculateXpDataVersion(actor));
 * }
 * ```
 * 
 * @author L5R4 System Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link ./xp-calculator.js|XP Calculator} - Rebuilds history when update needed
 * @see {@link ../../apps/xp-manager.js|XP Manager} - Uses this to minimize updates
 */

import { SYS_ID } from "../../config/constants.js";

/**
 * Calculate a version hash of the actor's XP-relevant data.
 * Creates a consistent hash of all character data that affects XP expenditure
 * calculations. Used to detect when retroactive XP updates are needed.
 * 
 * **Hashed Data:**
 * - Trait values (all 8 traits)
 * - Void ring rank
 * - Skill data: id, rank, freeRanks, emphasis, freeEmphasis
 * - Item data: id, type, cost (for advantages/disadvantages/kata/kiho)
 * 
 * **Hash Algorithm:**
 * Simple string hash using the DJB2-style algorithm:
 * - Convert data to JSON string
 * - Iterate characters and compute hash code
 * - Return absolute value (always positive)
 * 
 * **Collision Handling:**
 * Hash collisions are theoretically possible but extremely rare for this use case.
 * If collision occurs, unnecessary recalculation happens (safe but slightly inefficient).
 * On error, falls back to timestamp to force recalculation (safe fallback).
 * 
 * @param {Actor} actor - Actor document to calculate version for
 * @returns {number} Version hash (positive integer)
 * 
 * @example
 * const version = calculateXpDataVersion(actor);
 * // Returns: 1234567890 (consistent hash of current state)
 */
export function calculateXpDataVersion(actor) {
  try {
    const sys = actor.system ?? {};
    
    // Create a hash of XP-relevant data
    const xpData = {
      traits: sys.traits || {},
      voidRank: sys.rings?.void?.rank || 0,
      skills: actor.items.filter(i => i.type === "skill").map(i => ({
        id: i.id,
        rank: i.system?.rank || 0,
        freeRanks: i.system?.freeRanks || 0,
        emphasis: i.system?.emphasis || "",
        freeEmphasis: i.system?.freeEmphasis || 0
      })),
      items: actor.items.filter(i => ["advantage", "disadvantage", "kata", "kiho"].includes(i.type)).map(i => ({
        id: i.id,
        type: i.type,
        cost: i.system?.cost || 0
      }))
    };
    
    // Simple hash function - convert to string and get hash code
    const str = JSON.stringify(xpData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to calculate XP data version", err);
    return Date.now(); // Fallback to timestamp to force recalculation
  }
}

/**
 * Check if retroactive XP update is needed for an actor.
 * Compares current data version with last processed version to determine
 * if XP history needs to be rebuilt. Prevents unnecessary recalculations.
 * 
 * **Update Conditions:**
 * Returns true when ANY of these conditions are met:
 * 1. **First Run**: No previous version flag exists (lastUpdateVersion === 0)
 * 2. **Data Changed**: Current version differs from stored version
 * 3. **Missing Data**: xpSpent flag is missing or empty (legacy actor)
 * 
 * **Performance:**
 * This check is fast (version comparison only) and prevents expensive
 * recalculations every time the XP Manager opens.
 * 
 * **Side Effects:**
 * None - pure check function. Caller is responsible for updating flags
 * after performing retroactive update.
 * 
 * @param {Actor} actor - Actor document to check
 * @returns {Promise<boolean>} True if retroactive update is needed
 * 
 * @example
 * if (await needsRetroactiveUpdate(actor)) {
 *   console.log("XP data is stale, rebuilding...");
 *   // Perform update...
 * } else {
 *   console.log("XP data is current, skipping update");
 * }
 */
export async function needsRetroactiveUpdate(actor) {
  try {
    const flags = actor.flags?.[SYS_ID] ?? {};
    const lastUpdateVersion = flags.xpRetroactiveVersion || 0;
    const currentVersion = calculateXpDataVersion(actor);
    
    // Check conditions for update
    const isFirstRun = lastUpdateVersion === 0;
    const hasDataChanged = lastUpdateVersion !== currentVersion;
    const hasMissingData = !Array.isArray(flags.xpSpent) || flags.xpSpent.length === 0;
    
    const needsUpdate = isFirstRun || hasDataChanged || hasMissingData;
    
    if (needsUpdate) {
      console.log(`${SYS_ID} | XP retroactive update needed`, { 
        actorId: actor.id,
        actorName: actor.name,
        reason: isFirstRun ? "first-run" : hasMissingData ? "missing-data" : "data-changed",
        lastVersion: lastUpdateVersion, 
        currentVersion: currentVersion 
      });
    }
    
    return needsUpdate;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to check retroactive XP update need", err);
    // On error, be conservative and trigger update
    return true;
  }
}
