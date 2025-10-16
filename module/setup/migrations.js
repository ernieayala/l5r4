/**
 * L5R4 System Data Migrations
 *
 * Handles schema transformations and data migrations across system versions. Migrates both
 * world documents (actors, items) and compendium packs when the system is updated, ensuring
 * backward compatibility with legacy data structures from earlier system versions.
 *
 * Key Responsibilities:
 * - **Schema Migrations**: Transform legacy field names (snake_case → camelCase)
 * - **Type Migrations**: Convert deprecated item types (bow → weapon with isBow flag)
 * - **Wound System**: Migrate NPC wound modes, multipliers, and legacy wound_lvl structures
 * - **Icon Paths**: Update old .png icon paths to new .webp asset structure
 * - **Default Values**: Backfill missing fields with proper defaults
 * - **Data Normalization**: Ensure type consistency (strings → numbers, case normalization)
 *
 * Migration Lifecycle:
 * - Triggered by system version change via game.settings
 * - Runs once per version bump during Foundry ready hook
 * - Processes world actors/items first, then unlocked compendiums
 * - Includes embedded items within actors (equipment, skills, etc.)
 *
 * L5R4 Game Mechanics Migrated:
 * - **Wound Levels**: 8-rank system (Healthy → Out) with progressive TN penalties
 * - **Earth Multipliers**: Configurable lethality (×2 default, ×3/×4/×5 heroic)
 * - **Armor TN**: Legacy armor_tn → armorTn per (Reflexes × 5 + 5 + bonus) formula
 * - **Skill Defaults**: freeRanks and freeEmphasis for advancement tracking
 *
 * Foundry VTT Integration:
 * - Uses Document.update() with render: false for bulk performance (requires v13+)
 * - Accesses _source for pre-derived raw data when needed
 * - Handles FilePicker API differences between Foundry versions
 * - Respects compendium locked state (skips locked packs)
 * - Uses diff: false for type changes (full replacement required)
 *
 * Safety Notes:
 * - All migrations wrapped in try/catch to prevent cascade failures
 * - Logs failures to console with document context for manual review
 * - Non-destructive: preserves data when target fields already populated
 * - Idempotent: safe to run multiple times on same data
 *
 * @module setup/migrations
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActor.html#update|Document.update API}
 */

import { SYS_ID, PATHS } from "../config/constants.js";
import L5R4Actor from "../documents/actor.js";

import { SCHEMA_MAP } from "./schema-map.js";

/**
 * Migrates legacy "bow" item type to unified "weapon" type with isBow flag.
 *
 * Transforms deprecated standalone bow items into weapon items marked with isBow: true,
 * preserving bow-specific properties (str requirement, range, arrow type) while unifying
 * the item type structure. This migration enables shared weapon systems while maintaining
 * bow-specific mechanics like ranged attacks and arrow compatibility.
 *
 * Migration Details:
 * - Sets damageKeep: 0 (bows calculate damage differently than melee weapons)
 * - Preserves bow mechanics: str (tension rating), range, arrow type
 * - Carries forward explodesOn (typically 10 for standard dice)
 * - Maintains skill/trait associations for attack rolls
 *
 * Uses diff: false because changing document type requires full replacement, not incremental
 * patching. Foundry VTT doesn't support partial updates when document type changes.
 *
 * @param {Document[]} docs - Array of Item documents to scan for bow types
 * @param {string} label - Migration context label for console logging (e.g., "world-items")
 * @returns {Promise<void>}
 */
async function migrateBowsToWeapons(docs, label) {
  const bowItems = docs.filter(doc => doc.type === "bow");
  if (bowItems.length === 0) {
    return;
  }

  console.warn(`${SYS_ID} | Migrating ${bowItems.length} bow items to weapons (${label})`);

  for (const item of bowItems) {
    try {
      const currentSystem = foundry.utils.deepClone(item.system || {});
      const weaponSystem = {
        ...currentSystem,
        isBow: true,
        damageKeep: 0, // Bows don't use damageKeep, set to 0

        str: currentSystem.str || 1,
        range: currentSystem.range || 100,
        arrow: currentSystem.arrow || "willow",

        explodesOn: currentSystem.explodesOn || 10,
        associatedSkill: currentSystem.associatedSkill || "",
        fallbackTrait: currentSystem.fallbackTrait || "ref"
      };

      const updateData = {
        type: "weapon",
        system: weaponSystem
      };

      await item.update(updateData, { diff: false, recursive: false, render: false });
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate bow item", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }
}

/**
 * Retrieves a nested property value from an object using dot notation path.
 *
 * Safely traverses nested object structure to retrieve deeply nested values without
 * throwing errors if intermediate properties are missing. Used by schema migration
 * functions to read legacy field locations before transformation.
 *
 * @param {Object} obj - Source object to traverse
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armor_tn")
 * @returns {*} The value at the specified path, or undefined if path doesn't exist
 */
function getByPath(obj, path) {
  try {
    return path
      .split(".")
      .reduce((acc, key) => (acc !== undefined && acc !== null ? acc[key] : undefined), obj);
  } catch (_e) {
    return undefined;
  }
}

/**
 * Sets a nested property value on an object using dot notation path.
 *
 * Creates intermediate objects as needed when traversing the path. Mutates the original
 * object directly. Used by schema migrations to write transformed values to new field
 * locations while building update payloads.
 *
 * @param {Object} obj - Target object to modify (mutated in place)
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armorTn")
 * @param {*} value - Value to assign at the target path
 * @returns {void}
 */
function setByPath(obj, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur[k] === undefined || cur[k] === null || typeof cur[k] !== "object") {
      cur[k] = {};
    }
    cur = cur[k];
  }
  cur[last] = value;
}

/**
 * Deletes a nested property from an object using dot notation path.
 *
 * Safely removes a property at any nesting level. Handles missing intermediate paths
 * gracefully without throwing errors. Used by schema migrations to clean up legacy
 * field names after copying their values to new locations.
 *
 * @param {Object} obj - Target object to modify (mutated in place)
 * @param {string} path - Dot-delimited property path (e.g., "system.armor.armor_tn")
 * @returns {void}
 */
function deleteByPath(obj, path) {
  const parts = path.split(".");
  const last = parts.pop();
  let cur = obj;
  for (const k of parts) {
    if (cur?.[k] === undefined) {
      return;
    }
    cur = cur[k];
  }
  if (cur && Object.prototype.hasOwnProperty.call(cur, last)) {
    delete cur[last];
  }
}

/**
 * Normalizes wound level data types and ensures penalties are positive values.
 *
 * Converts legacy string types to numbers and ensures wound penalties are stored as
 * positive absolute values (L5R4 represents penalties as positive TN increases, not
 * negative modifiers). Mutates the wound data object in place.
 *
 * L5R4 Wound Penalties:
 * - Nicked: +3 TN, Grazed: +5 TN, Hurt: +10 TN, Injured: +15 TN
 * - Crippled: +20 TN, Down: +40 TN
 * - Penalties increase the TN of all rolls, making actions harder
 *
 * @param {Object} woundData - Wound level data object with penalty/value properties (mutated)
 * @returns {boolean} True if any normalization changes were made, false otherwise
 */
function normalizeWoundLevelData(woundData) {
  let changed = false;

  for (const [_key, level] of Object.entries(woundData)) {
    if (typeof level.penalty === "string") {
      level.penalty = Math.abs(parseInt(level.penalty) || 0);
      changed = true;
    } else if (typeof level.penalty === "number" && level.penalty < 0) {
      level.penalty = Math.abs(level.penalty);
      changed = true;
    }

    if (typeof level.value === "string") {
      level.value = parseInt(level.value) || 0;
      changed = true;
    }
  }

  return changed;
}

/**
 * Migrates all embedded items within an actor document.
 *
 * Applies all item-type migrations to embedded items (skills, equipment, weapons, etc.)
 * owned by an actor. Processes schema remapping, bow→weapon conversions, skill defaults,
 * and data normalization in sequence.
 *
 * @param {Actor} actor - Actor document containing embedded items to migrate
 * @param {string} labelPrefix - Context prefix for logging (e.g., "actor", "compendium-actor")
 * @returns {Promise<void>}
 */
async function migrateActorEmbeddedItems(actor, labelPrefix) {
  if (actor.items.size === 0) {
    return;
  }

  await applySchemaMapToDocs(actor.items.contents, `${labelPrefix}-items:${actor.id}`);
  await migrateBowsToWeapons(actor.items.contents, `${labelPrefix}-bow-migration:${actor.id}`);
  await migrateSkillDefaults(actor.items.contents, `${labelPrefix}-skill-defaults:${actor.id}`);
  await migrateArmorTypes(actor.items.contents, `${labelPrefix}-armor-types:${actor.id}`);
  await normalizeItems(actor.items.contents, `${labelPrefix}-items-norm:${actor.id}`);
}

/**
 * Builds an update object for document schema field remapping.
 *
 * Scans the document against SCHEMA_MAP rules to identify legacy field names that need
 * transformation. Only creates updates if legacy fields exist AND target fields are empty.
 * Preserves existing data at target locations (non-destructive).
 *
 * Schema Map Example:
 * - { docType: "Actor", type: "npc", from: "system.armor.armor_tn", to: "system.armor.armorTn" }
 *
 * @param {Document} doc - Actor or Item document to evaluate
 * @returns {Object|null} Update object with transformed fields, or null if no changes needed
 */
function buildSchemaUpdate(doc) {
  const { documentName: docType } = doc; // "Actor" | "Item"
  const type = doc.type;

  const rules = SCHEMA_MAP.filter(
    r => r.docType === docType && (r.type === type || r.type === "*")
  );
  if (!rules.length) {
    return null;
  }

  const patch = { system: foundry.utils.deepClone(doc.system ?? {}) };
  let touched = false;

  for (const rule of rules) {
    const fromVal = getByPath(patch, rule.from);
    const toVal = getByPath(patch, rule.to);

    const hasValidTarget = toVal !== undefined && toVal !== "";
    if (fromVal === undefined || hasValidTarget) {
      continue;
    }

    setByPath(patch, rule.to, fromVal);
    deleteByPath(patch, rule.from);
    touched = true;
  }

  if (!touched) {
    return null;
  }

  return { system: patch.system };
}

/**
 * Applies schema field remapping to a collection of documents.
 *
 * Iterates through documents and applies SCHEMA_MAP transformations (e.g., snake_case →
 * camelCase field names). Each document is evaluated independently and updated only if
 * changes are needed. Errors are logged but don't halt the batch process.
 *
 * @param {Document[]} docs - Array of Actor or Item documents to process
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
async function applySchemaMapToDocs(docs, label) {
  for (const doc of docs) {
    try {
      const update = buildSchemaUpdate(doc);
      if (update) {
        await doc.update(update);
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}

/**
 * Normalizes weapon/bow item data for consistency.
 *
 * Ensures weapon size properties use lowercase values. Early system versions may have
 * stored size values with mixed case ("Medium" vs "medium"). This migration enforces
 * lowercase for consistent filtering and comparison.
 *
 * @param {Document[]} docs - Array of Item documents to normalize
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
async function normalizeItems(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Item") {
        continue;
      }
      const t = doc.type;
      if (t !== "weapon" && t !== "bow") {
        continue;
      }
      const sz = doc.system?.size;
      if (typeof sz === "string" && sz !== sz.toLowerCase()) {
        await doc.update({ "system.size": sz.toLowerCase() }, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Normalization failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}

/**
 * Ensures skill items have required default values for advancement tracking.
 *
 * Backfills freeRanks and freeEmphasis fields which may be missing in skills created
 * before these properties were added. These fields track ranks/emphasis granted by
 * advantages, disadvantages, or school bonuses that don't cost XP.
 *
 * @param {Document[]} docs - Array of Item documents to scan for skills
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
async function migrateSkillDefaults(docs, label) {
  const skillItems = docs.filter(doc => doc.type === "skill");
  if (skillItems.length === 0) {
    return;
  }

  console.warn(
    `${SYS_ID} | Migrating ${skillItems.length} skill items to ensure proper defaults (${label})`
  );

  let migratedCount = 0;

  for (const item of skillItems) {
    try {
      const updates = {};
      let needsUpdate = false;

      const currentFreeRanks = item.system?.freeRanks;
      if (currentFreeRanks === undefined || currentFreeRanks === null) {
        updates["system.freeRanks"] = 0;
        needsUpdate = true;
      }

      const currentFreeEmphasis = item.system?.freeEmphasis;
      if (currentFreeEmphasis === undefined || currentFreeEmphasis === null) {
        updates["system.freeEmphasis"] = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await item.update(updates, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate skill defaults", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} skill items with default values (${label})`
    );
  }
}

/**
 * Ensures armor items have the armorType field for penalty calculations.
 *
 * Backfills armorType field for armor items created before the armor penalty system
 * was implemented. Defaults to "ashigaru" armor type (no penalties) to avoid surprising
 * players with unexpected penalties. Players can manually adjust to light/heavy/riding as needed.
 *
 * L5R4 Armor Types:
 * - Ashigaru: No penalties (peasant armor)
 * - Light: +5 TN to Athletics/Stealth skills
 * - Heavy: +5 TN to all Agility/Reflexes skills
 * - Riding: +5 TN to all Agility/Reflexes rolls (waived when mounted)
 *
 * @param {Document[]} docs - Array of Item documents to scan for armor
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
async function migrateArmorTypes(docs, label) {
  const armorItems = docs.filter(doc => doc.type === "armor");
  if (armorItems.length === 0) {
    return;
  }

  console.warn(
    `${SYS_ID} | Migrating ${armorItems.length} armor items to add armorType field (${label})`
  );

  let migratedCount = 0;

  for (const item of armorItems) {
    try {
      const currentArmorType = item.system?.armorType;
      if (currentArmorType === undefined || currentArmorType === null || currentArmorType === "") {
        await item.update({ "system.armorType": "ashigaru" }, { diff: true, render: false });
        migratedCount++;
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate armor type", {
        id: item.id,
        name: item.name,
        err
      });
    }
  }

  if (migratedCount > 0) {
    console.warn(
      `${SYS_ID} | Successfully migrated ${migratedCount} armor items with armorType field (${label})`
    );
  }
}

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
async function migrateLegacyNpcWounds(docs, label) {
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

/**
 * Removes legacy field names after successful migration to new schema.
 *
 * Deletes old snake_case field names when corresponding camelCase fields exist and are
 * populated. This cleanup prevents data duplication and ensures documents only contain
 * current-schema fields. Only removes fields when BOTH old and new versions exist,
 * preserving data safety.
 *
 * @param {Document[]} docs - Array of Actor documents to clean up
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
async function cleanupLegacyFields(docs, label) {
  for (const doc of docs) {
    try {
      if (doc.documentName !== "Actor") {
        continue;
      }

      const updates = {};
      let needsUpdate = false;

      const cleanupRules = [
        { old: "system.wounds.heal_rate", new: "system.wounds.healRate" },
        { old: "system.wound_lvl", new: "system.woundLevels" },
        { old: "system.armor.armor_tn", new: "system.armor.armorTn" },
        { old: "system.shadow_taint", new: "system.shadowTaint" },
        { old: "system.armor_tn", new: "system.armorTn" },
        { old: "system.initiative.roll_mod", new: "system.initiative.rollMod" },
        { old: "system.initiative.keep_mod", new: "system.initiative.keepMod" },
        { old: "system.initiative.total_mod", new: "system.initiative.totalMod" }
      ];

      for (const rule of cleanupRules) {
        const oldVal = getByPath(doc, rule.old);
        const newVal = getByPath(doc, rule.new);

        if (oldVal !== undefined && newVal !== undefined) {
          setByPath(updates, rule.old, null);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await doc.update(updates, { diff: true, render: false });
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Legacy cleanup failed", {
        label,
        id: doc.id,
        type: doc.type,
        error: e
      });
    }
  }
}

/**
 * Legacy icon filename mapping for .png → .webp migration.
 *
 * Maps old PNG icon filenames to new WebP format with updated naming conventions.
 * Used during system asset migration to update document icons without breaking existing
 * actor/item references. Frozen to prevent runtime modification.
 *
 * @type {Object<string, string>}
 * @constant
 */
const ICON_MIGRATION_MAP = Object.freeze({
  "attackstance.png": "attack-stance.webp",
  "fullattackstance.png": "full-attack-stance.webp",
  "defensestance.png": "defence-stance.webp",
  "fulldefensestance.png": "full-defense-stance.webp",
  "centerstance.png": "centered-stance.webp",

  "grapple.png": "grappled.webp",
  "mounted.png": "mounted.webp",

  "bamboo.png": "clan.webp",
  "bow.png": "bow.webp",
  "coins.png": "item.webp",
  "flower.png": "skill.webp",
  "hat.png": "armor.webp",
  "kanji.png": "technique.webp",
  "scroll.png": "kata.webp",
  "scroll2.png": "spell.webp",
  "sword.png": "weapon.webp",
  "tattoo.png": "tattoo.webp",
  "tori.png": "family.webp",
  "yin-yang.png": "advantage.webp",

  "helm.png": "pc.webp",
  "ninja.png": "npc.webp"
});

/**
 * Directory listing cache to avoid repeated FilePicker API calls.
 *
 * Caches directory contents during icon migration to improve performance when checking
 * for file existence. Populated lazily as directories are accessed.
 *
 * @type {Map<string, Set<string>>}
 */
const dirCache = new Map();

/**
 * Lists files in a directory with caching for performance.
 *
 * Uses Foundry's FilePicker API to browse directory contents, extracting just the
 * filenames. Results are cached to avoid redundant API calls during bulk migrations.
 * Handles API differences between Foundry versions via optional chaining.
 *
 * Foundry VTT Integration:
 * - foundry.applications?.apps?.FilePicker?.implementation handles v13+ structure
 * - Falls back to global FilePicker for earlier versions
 * - browse("data", path) reads from Foundry's Data directory
 *
 * @param {string} dirPath - Directory path to list (relative to Foundry Data)
 * @returns {Promise<Set<string>>} Set of filenames in the directory
 */
async function listDir(dirPath) {
  if (dirCache.has(dirPath)) {
    return dirCache.get(dirPath);
  }
  try {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    const res = await FP.browse("data", dirPath);
    const files = new Set(
      (res.files ?? []).map(f => {
        const i = f.lastIndexOf("/");
        return i >= 0 ? f.slice(i + 1) : f;
      })
    );
    dirCache.set(dirPath, files);
    return files;
  } catch (err) {
    console.warn(`${SYS_ID}`, "Failed to browse directory", { dirPath, err });
    const empty = new Set();
    dirCache.set(dirPath, empty);
    return empty;
  }
}

/**
 * Computes new icon path from legacy path using migration map.
 *
 * Checks if an image path references a legacy icon and returns the new path if the
 * target file exists. Only returns a path if the new icon file actually exists on disk,
 * preventing broken image references.
 *
 * @param {string} img - Current image path to evaluate
 * @returns {Promise<string|null>} New icon path if migration needed and file exists, null otherwise
 */
async function computeNewIconPath(img) {
  if (typeof img !== "string" || !img.startsWith(PATHS.icons + "/")) {
    return null;
  }
  const prefix = PATHS.icons + "/";
  const file = img.slice(prefix.length);
  const rel = ICON_MIGRATION_MAP[file];
  if (!rel) {
    return null;
  }
  const targetPath = prefix + rel;
  const lastSlash = targetPath.lastIndexOf("/");
  const dir = targetPath.slice(0, lastSlash);
  const base = targetPath.slice(lastSlash + 1);
  const files = await listDir(dir);
  return files.has(base) ? targetPath : null;
}

/**
 * Determines updated icon path for a document, with special bow handling.
 *
 * Checks standard icon migration map and applies special logic for weapon items with
 * isBow flag to ensure they use the bow icon. Returns null if no migration needed.
 *
 * @param {Document} doc - Document to evaluate for icon update
 * @param {string} docType - Document type ("Actor" or "Item")
 * @returns {Promise<string|null>} New icon path if update needed, null otherwise
 */
async function getUpdatedIconPath(doc, docType) {
  let nextImg = await computeNewIconPath(doc.img);

  if (docType === "Item" && doc.type === "weapon" && doc.system?.isBow) {
    const bowIcon = await computeNewIconPath("bow.png");
    if (bowIcon && doc.img !== bowIcon) {
      nextImg = bowIcon;
    }
  }

  return nextImg;
}

/**
 * Migrates legacy PNG icon paths to new WebP assets for world documents.
 *
 * Updates actor and item icons from old .png format to new .webp assets. Also updates
 * prototype token images for actors. Only runs if GM and migration setting enabled.
 * Displays notification with count of updated documents when complete.
 *
 * This is a world-only migration (compendiums handled separately by migrateCompendiumIconPaths).
 *
 * @returns {Promise<void>}
 * @async
 * @export
 */
export async function runIconPathMigration() {
  if (!game.user?.isGM) {
    return;
  }
  const shouldRun = game.settings.get(SYS_ID, "runMigration");
  if (!shouldRun) {
    return;
  }

  let changed = 0;

  for (const a of game.actors.contents) {
    const updates = {};

    const nextImg = await computeNewIconPath(a.img);
    if (nextImg && nextImg !== a.img) {
      updates.img = nextImg;
    }

    const tokenImg = a.prototypeToken?.texture?.src;
    if (tokenImg) {
      const nextToken = await computeNewIconPath(tokenImg);
      if (nextToken && nextToken !== tokenImg) {
        updates["prototypeToken.texture.src"] = nextToken;
      }
    }

    if (Object.keys(updates).length > 0) {
      try {
        await a.update(updates, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update actor img", { id: a.id, err });
      }
    }
  }

  for (const i of game.items.contents) {
    const nextImg = await getUpdatedIconPath(i, "Item");

    if (nextImg && nextImg !== i.img) {
      try {
        await i.update({ img: nextImg }, { diff: true, render: false });
        changed++;
      } catch (err) {
        console.warn(`${SYS_ID}`, "Failed to update item img", { id: i.id, err });
      }
    }
  }

  ui.notifications?.info(
    game.i18n.format("l5r4.system.migration.iconsUpdated", { count: changed })
  );
}

/**
 * Migrates legacy PNG icon paths to new WebP assets in compendium packs.
 *
 * Updates actor and item icons within unlocked compendium packs. Skips locked packs to
 * avoid permission errors. Displays notification with count of updated documents when
 * complete. Runs separately from world migration to handle compendium-specific loading.
 *
 * Foundry VTT Integration:
 * - Respects pack.metadata.locked status (skips locked compendia)
 * - Loads compendium documents via pack.getDocuments()
 * - Updates both document icons and actor prototype token images
 *
 * @returns {Promise<void>}
 * @async
 */
async function migrateCompendiumIconPaths() {
  let changed = 0;
  const packs = game.packs?.contents ?? [];
  for (const pack of packs) {
    const docName = pack.documentName ?? pack.metadata?.type ?? pack.metadata?.documentName;
    if (docName !== "Actor" && docName !== "Item") {
      continue;
    }

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      continue;
    }

    let docs = [];
    try {
      docs = await pack.getDocuments();
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to load compendium documents", {
        collection: pack.collection,
        err
      });
      continue;
    }

    for (const doc of docs) {
      const nextImg = await getUpdatedIconPath(doc, docName);
      const updates = {};

      if (nextImg && nextImg !== doc.img) {
        updates.img = nextImg;
      }

      if (docName === "Actor") {
        const tokenImg = doc.prototypeToken?.texture?.src;
        if (tokenImg) {
          const nextToken = await computeNewIconPath(tokenImg);
          if (nextToken && nextToken !== tokenImg) {
            updates["prototypeToken.texture.src"] = nextToken;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        try {
          await doc.update(updates, { diff: true, render: false });
          changed++;
        } catch (err) {
          console.warn(`${SYS_ID}`, "Failed to update compendium doc img", {
            id: doc.id,
            collection: pack.collection,
            err
          });
        }
      }
    }
  }

  if (changed > 0) {
    ui.notifications?.info(
      game.i18n.format("l5r4.system.migration.compendiumIconsUpdated", { count: changed })
    );
  }
}

/**
 * Main migration orchestration function for system version updates.
 *
 * Executes all migration steps in sequence when system version changes. Processes world
 * documents first, then unlocked compendiums. Only runs for GM users. Handles both schema
 * transformations (field renames, type changes) and content migrations (wound systems,
 * icon paths, defaults).
 *
 * Migration Execution Order:
 * 1. Schema field remapping (world actors/items)
 * 2. NPC wound system migration (world actors)
 * 3. Bow → weapon type conversion (world items)
 * 4. Skill default values backfill (world items)
 * 5. Data normalization (world items)
 * 6. Legacy field cleanup (world actors)
 * 7. Embedded item migrations (all world actors)
 * 8. Compendium migrations (unlocked packs only)
 * 9. Icon path migrations (world + compendiums)
 *
 * Foundry VTT Integration:
 * - Called from system ready hook when version mismatch detected
 * - Uses game.actors.contents and game.items.contents for world documents
 * - Uses game.packs to iterate compendium packs
 * - Checks pack.metadata.locked to respect pack permissions
 *
 * @param {string} fromVersion - Previous system version (unused but kept for API compatibility)
 * @param {string} toVersion - New system version (unused but kept for API compatibility)
 * @returns {Promise<void>}
 * @async
 * @export
 */
export async function runMigrations(fromVersion, toVersion) {
  if (!game.user?.isGM) {
    return;
  }

  await applySchemaMapToDocs(game.actors.contents, "world-actors");
  await applySchemaMapToDocs(game.items.contents, "world-items");

  await migrateLegacyNpcWounds(game.actors.contents, "world-legacy-npc-wounds");

  await migrateBowsToWeapons(game.items.contents, "world-bow-migration");

  await migrateSkillDefaults(game.items.contents, "world-skill-defaults");

  await migrateArmorTypes(game.items.contents, "world-armor-types");

  await normalizeItems(game.items.contents, "world-items-norm");

  await cleanupLegacyFields(game.actors.contents, "world-actors-cleanup");

  for (const actor of game.actors) {
    await migrateActorEmbeddedItems(actor, "actor");
  }

  for (const pack of game.packs) {
    const docType = pack.metadata?.type ?? pack.documentName;
    if (docType !== "Actor" && docType !== "Item") {
      continue;
    }

    const isLocked = pack.metadata?.locked ?? pack.locked ?? false;
    if (isLocked) {
      console.warn(`${SYS_ID}`, "Skipping locked compendium", { collection: pack.collection });
      continue;
    }

    try {
      const docs = await pack.getDocuments();
      await applySchemaMapToDocs(docs, `pack:${pack.collection}`);

      if (docType === "Actor") {
        await migrateLegacyNpcWounds(docs, `pack-legacy-npc-wounds:${pack.collection}`);
      }
      await migrateBowsToWeapons(docs, `pack-bow-migration:${pack.collection}`);
      await migrateSkillDefaults(docs, `pack-skill-defaults:${pack.collection}`);
      await migrateArmorTypes(docs, `pack-armor-types:${pack.collection}`);
      await normalizeItems(docs, `pack-norm:${pack.collection}`);

      if (docType === "Actor") {
        for (const actor of docs) {
          await migrateActorEmbeddedItems(actor, `compendium-actor:${pack.collection}`);
        }
      }
    } catch (e) {
      console.warn(`${SYS_ID}`, "Schema remap pack failed", { pack: pack.collection, error: e });
    }
  }

  try {
    await runIconPathMigration();
    await migrateCompendiumIconPaths();
  } catch (err) {
    console.warn(`${SYS_ID} | Migration failed`, { fromVersion, toVersion, error: err });
  }
}
