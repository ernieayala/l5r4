/**
 * Source-data migrations the data models run in `migrateData`.
 *
 * A schema drops stored keys it does not define (common/data/fields.mjs:1143-1146), so legacy shapes are
 * reshaped here, on raw source, before cleaning. The ready-hook migrations in module/setup/migrations/ read
 * documents after that cleaning and so never see these keys (roadmap/STAGE-02-DATA-MODELS.md decision 7).
 * Pure functions on plain objects; `source` may be a full source or an update delta.
 *
 * @module data/migrate-source
 */

import { TRAIT_KEYS } from "../config/reference-data.js";
import { WOUND_LEVEL_ORDER } from "../config/game-mechanics.js";

/**
 * Move `object[from]` to `object[to]` when the target is empty, then drop `from`. Matches the 3.2.1
 * schema-map rule: an existing target value wins (module/setup/migrations/schema/schema-apply.js).
 * @param {object} object  Mutated.
 * @param {string} from
 * @param {string} to
 */
function renameKey(object, from, to) {
  if (!object || !(from in object)) {
    return;
  }
  if (object[to] === undefined || object[to] === "") {
    object[to] = object[from];
  }
  delete object[from];
}

/**
 * Traits stored as `{rank}` by older versions become plain numbers
 * (module/documents/actor/calculations/shared-traits-rings.js reads both shapes).
 * @param {object} source  Actor system source (mutated).
 */
export function migrateCommonActorSource(source) {
  const traits = source.traits;
  if (!traits || typeof traits !== "object") {
    return;
  }
  for (const key of TRAIT_KEYS) {
    const value = traits[key];
    if (value && typeof value === "object" && "rank" in value) {
      traits[key] = value.rank;
    }
  }
}

/**
 * PC snake_case keys from before 3.0 (module/setup/migrations/schema/schema-map.js).
 * @param {object} source  PC system source (mutated).
 */
export function migratePcSource(source) {
  renameKey(source, "armor_tn", "armorTn");
  renameKey(source, "shadow_taint", "shadowTaint");
  for (const name of ["roll", "keep", "total"]) {
    renameKey(source.initiative, `${name}_mod`, `${name}Mod`);
  }
  // A Void Point on Armor TN is an effect that ends with its Round (STAGE-09); a 3.2.1 actor's marker for one
  // lasted at most that Round and is dropped
  if (source.armorTn) {
    delete source.armorTn.useVoid;
    delete source.armorTn.voidRound;
  }
}

/**
 * NPC Armor TN key and legacy wound levels. `wound_lvl` (pre-3.0), or a stored `woundLevels` with no
 * `manualWoundLevels`, becomes `manualWoundLevels`: values as integers, penalties as positive TN increases,
 * a level active when its threshold is above 0 (module/setup/migrations/actors/npc-wounds.js).
 * @param {object} source  NPC system source (mutated).
 */
export function migrateNpcSource(source) {
  renameKey(source.armor, "armor_tn", "armorTn");

  const legacy = source.wound_lvl ?? (source.manualWoundLevels ? undefined : source.woundLevels);
  delete source.wound_lvl;
  if (!legacy || typeof legacy !== "object") {
    return;
  }
  source.manualWoundLevels = Object.fromEntries(
    WOUND_LEVEL_ORDER.map(key => {
      const level = legacy[key];
      const value = level ? parseInt(level.value) || 0 : 0;
      const penalty = level ? Math.abs(parseInt(level.penalty) || 0) : 0;
      return [key, { value, penalty, active: value > 0 }];
    })
  );
}

/**
 * A `keywords` array (the 3.2.1 default) becomes the comma-separated text the item sheet edits
 * (roadmap/STAGE-02-DATA-MODELS.md decision 8).
 * @param {object} source  Item system source (mutated).
 */
export function migrateKeywordsSource(source) {
  if (Array.isArray(source.keywords)) {
    source.keywords = source.keywords.join(", ");
  }
}

/**
 * Skill snake_case keys from before 3.0 (module/setup/migrations/schema/schema-map.js).
 * @param {object} source  Skill system source (mutated).
 */
export function migrateSkillSource(source) {
  renameKey(source, "mastery_3", "mastery3");
  renameKey(source, "mastery_5", "mastery5");
  renameKey(source, "mastery_7", "mastery7");
  renameKey(source, "insight_bonus", "insightBonus");
  renameKey(source, "roll_bonus", "rollBonus");
  renameKey(source, "keep_bonus", "keepBonus");
  renameKey(source, "total_bonus", "totalBonus");
}

/**
 * Armor misspellings from before 3.0 (module/setup/migrations/schema/schema-map.js).
 * @param {object} source  Armor system source (mutated).
 */
export function migrateArmorSource(source) {
  renameKey(source, "equiped", "equipped");
  renameKey(source, "specialRues", "specialRules");
}
