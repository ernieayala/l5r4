/**
 * Legacy NPC Wound System Migration
 * Migrates legacy NPC wound structures to current schema with manual/formula modes.
 *
 * @module setup/migrations/actors/npc-wounds
 */

import { SYS_ID } from "../../../config/constants.js";
import L5R4Actor from "../../../documents/actor.js";
import { normalizeWoundLevelData } from "../utils/helpers.js";

/**
 * Migrates legacy NPC wound system to current schema with manual/formula modes.
 *
 * Transforms older NPC wound data structures into the current system which supports two
 * wound calculation modes: manual (GM-defined levels) and formula (Earth Ring-based).
 * Handles multiple legacy field structures including wound_lvl, woundLevels, and various
 * armor TN field names.
 *
 * L5R4 Wound System (8 progressive ranks):
 * - Healthy: Earth × 5 (buffer for all campaigns regardless of multiplier)
 * - Nicked through Out: Size determined by woundsMultiplier (default ×2 for lethal play)
 * - Each rank imposes cumulative TN penalties: +3, +5, +10, +15, +20, +40, unconscious
 *
 * Migration Actions:
 * - Sets woundMode: "manual" if missing (GM-controlled wounds for NPCs)
 * - Sets woundsMultiplier: 2 (default Earth ×2 lethality per core rules)
 * - Sets woundsPenaltyMod: 0 (no modifier to standard wound penalties)
 * - Migrates armor_tn → armorTn (camelCase normalization)
 * - Converts string nrWoundLvls → number
 * - Normalizes wound penalties to positive absolute values (TN increases)
 * - Transforms wound_lvl/woundLevels → manualWoundLevels structure
 *
 * Uses actor._source to access raw pre-derived data, necessary because wound calculations
 * in prepareDerivedData may have already transformed the values. This ensures migration
 * reads the actual stored data, not computed values.
 *
 * @param {Document[]} docs - Array of Actor documents to scan for NPCs
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateLegacyNpcWounds(docs, label) {
  const npcActors = docs.filter(doc => doc.type === "npc");
  if (npcActors.length === 0) {
    return;
  }

  console.warn(`${SYS_ID} | Migrating ${npcActors.length} legacy NPC wound systems (${label})`);

  let migratedCount = 0;

  for (const actor of npcActors) {
    try {
      const updates = {};
      let needsUpdate = false;

      if (!actor.system.woundMode) {
        updates["system.woundMode"] = "manual";
        needsUpdate = true;
      }

      if (actor.system.woundsMultiplier === undefined) {
        updates["system.woundsMultiplier"] = 2;
        needsUpdate = true;
      }

      if (actor.system.woundsPenaltyMod === undefined) {
        updates["system.woundsPenaltyMod"] = 0;
        needsUpdate = true;
      }

      const legacyArmorTn = actor.system.armor?.armor_tn;
      const currentArmorTn = actor.system.armor?.armorTn;

      const armorTnValue =
        legacyArmorTn !== undefined && legacyArmorTn !== null ? legacyArmorTn : currentArmorTn;

      if (armorTnValue !== undefined && armorTnValue !== null) {
        updates["system.armor.armorTn"] = armorTnValue;
        needsUpdate = true;
      }

      if (typeof actor.system.nrWoundLvls === "string") {
        updates["system.nrWoundLvls"] = parseInt(actor.system.nrWoundLvls) || 1;
        needsUpdate = true;
      }

      if (actor.system.woundLevels) {
        const woundLevels = foundry.utils.deepClone(actor.system.woundLevels);

        if (normalizeWoundLevelData(woundLevels)) {
          updates["system.woundLevels"] = woundLevels;
          needsUpdate = true;
        }
      }

      // Access raw source data (pre-derivation) to read actual stored values, not calculated ones
      const rawSource = actor._source?.system || actor.system;
      const legacyWoundData = rawSource.wound_lvl;
      const rawWoundLevels = rawSource.woundLevels;

      // Transform legacy wound_lvl or woundLevels into current manualWoundLevels structure
      if (legacyWoundData || !rawSource.manualWoundLevels) {
        const sourceData = legacyWoundData || rawWoundLevels;

        if (sourceData) {
          const manualWoundLevels = {};
          const order = L5R4Actor.WOUND_LEVEL_ORDER;

          for (const key of order) {
            const woundLevel = sourceData[key];
            const value = woundLevel ? parseInt(woundLevel.value) || 0 : 0;
            const penalty = woundLevel ? Math.abs(parseInt(woundLevel.penalty) || 0) : 0;

            manualWoundLevels[key] = {
              value: value,
              penalty: penalty,
              active: value > 0
            };
          }

          updates["system.manualWoundLevels"] = manualWoundLevels;
          needsUpdate = true;
        }
      }

      if (actor.system.manualWoundLevels) {
        const manualWoundLevels = foundry.utils.deepClone(actor.system.manualWoundLevels);

        if (normalizeWoundLevelData(manualWoundLevels)) {
          updates["system.manualWoundLevels"] = manualWoundLevels;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await actor.update(updates, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate legacy NPC wounds", {
        id: actor.id,
        name: actor.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} legacy NPC wound systems (${label})`
    );
  }
}
