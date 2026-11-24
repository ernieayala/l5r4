/**
 * @module setup/migrations/actors/npc-wounds
 * @description Migrates legacy NPC wound structures to the current schema with manual and formula modes.
 */
import { migrateWoundLevelData } from "../utils/helpers.js";

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
 * - Normalizes manualWoundLevels penalties to positive absolute values (TN increases)
 *
 * Legacy wound_lvl / woundLevels become manualWoundLevels earlier, in NpcData.migrateData
 * (module/data/migrate-source.js), because the schema drops those keys when the actor loads.
 *
 * @param {Actor} actor - An actor; a PC is left alone
 * @returns {Promise<void>}
 */
export async function migrateLegacyNpcWounds(actor) {
  if (actor.type !== "npc") {
    return;
  }
  const updates = {
    ...buildWoundSettingDefaults(actor.system),
    ...buildLegacyWoundValues(actor.system)
  };
  if (Object.keys(updates).length > 0) {
    await actor.update(updates, { diff: true, render: false });
  }
}

/**
 * The wound settings an NPC lacks, at their defaults: manual mode, the ×2 Earth multiplier, no penalty modifier.
 * @param {object} system - The NPC's system data
 * @returns {object} Update entries; empty when every setting is present
 */
function buildWoundSettingDefaults(system) {
  const updates = {};
  if (!system.woundMode) {
    updates["system.woundMode"] = "manual";
  }
  if (system.woundsMultiplier === undefined) {
    updates["system.woundsMultiplier"] = 2;
  }
  if (system.woundsPenaltyMod === undefined) {
    updates["system.woundsPenaltyMod"] = 0;
  }
  return updates;
}

/**
 * Legacy wound values in their current shape: the Armor TN under `armorTn`, a numeric `nrWoundLvls`, and manual
 * Wound Rank penalties as positive numbers.
 * @param {object} system - The NPC's system data
 * @returns {object} Update entries; empty when nothing needs normalizing
 */
function buildLegacyWoundValues(system) {
  const updates = {};
  const legacyArmorTn = system.armor?.armor_tn;
  const currentArmorTn = system.armor?.armorTn;

  const armorTnValue =
    legacyArmorTn !== undefined && legacyArmorTn !== null ? legacyArmorTn : currentArmorTn;

  if (armorTnValue !== undefined && armorTnValue !== null) {
    updates["system.armor.armorTn"] = armorTnValue;
  }

  if (typeof system.nrWoundLvls === "string") {
    updates["system.nrWoundLvls"] = parseInt(system.nrWoundLvls) || 1;
  }

  // Legacy wound_lvl / woundLevels become manualWoundLevels in NpcData.migrateData, on raw source before the
  // schema drops those keys (module/data/migrate-source.js migrateNpcSource).
  if (system.manualWoundLevels) {
    const manualWoundLevels = foundry.utils.deepClone(system.manualWoundLevels);

    if (migrateWoundLevelData(manualWoundLevels)) {
      updates["system.manualWoundLevels"] = manualWoundLevels;
    }
  }
  return updates;
}
