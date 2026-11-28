/**
 * @module data/migrate-source
 * @description Source-data migrations the data models run in `migrateData`.
 *
 * A schema drops stored keys it does not define [src: common/data/fields.mjs:1143-1146], so legacy shapes are
 * reshaped here, on raw source, before cleaning. The ready-hook migrations in module/setup/migrations/ read
 * documents after that cleaning and so never see these keys (roadmap/STAGE-02-DATA-MODELS.md decision 7); their
 * last step writes the reshaped data back, which removes the legacy keys from the database (#182).
 * Pure functions on plain objects; `source` may be a full source or an update delta.
 */

import { TRAIT_KEYS } from "../config/reference-data.js";
import { WOUND_LEVEL_ORDER } from "../config/game-mechanics.js";

/**
 * Traits stored as `{rank}` by older versions become plain numbers
 * (module/documents/actor/calculations/shared-traits-rings-system.js reads both shapes).
 * @param {object} source - Actor system source (mutated).
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
 * PC snake_case keys from before 3.0.
 * @param {object} source - PC system source (mutated).
 */
export function migratePcSource(source) {
  migrateKey(source, "armor_tn", "armorTn");
  migrateKey(source, "shadow_taint", "shadowTaint");
  for (const name of ["roll", "keep", "total"]) {
    migrateKey(source.initiative, `${name}_mod`, `${name}Mod`);
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
 * a level active when its threshold is above 0. 3.2.1's template stored a default `armorTn` and
 * `manualWoundLevels` beside the legacy keys, so the legacy keys win, as 3.2.1's NPC migration had them (#182); the
 * world migration then writes the result back without them, so a later edit is never undone.
 * @param {object} source - NPC system source (mutated).
 */
export function migrateNpcSource(source) {
  if (source.armor && "armor_tn" in source.armor) {
    source.armor.armorTn = source.armor.armor_tn ?? source.armor.armorTn;
    delete source.armor.armor_tn;
  }

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
 * @param {object} source - Item system source (mutated).
 */
export function migrateKeywordsSource(source) {
  if (Array.isArray(source.keywords)) {
    source.keywords = source.keywords.join(", ");
  }
}

/**
 * Skill snake_case keys from before 3.0. The Insight bonus field is
 * dropped: Insight comes from Rings and Skill ranks only, and nothing ever counted it (#75).
 * game-rules/49_improving_your_character.md, p.104
 * @param {object} source - Skill system source (mutated).
 */
export function migrateSkillSource(source) {
  migrateKey(source, "mastery_3", "mastery3");
  migrateKey(source, "mastery_5", "mastery5");
  migrateKey(source, "mastery_7", "mastery7");
  delete source.insight_bonus;
  delete source.insightBonus;
  migrateKey(source, "roll_bonus", "rollBonus");
  migrateKey(source, "keep_bonus", "keepBonus");
  migrateKey(source, "total_bonus", "totalBonus");
  migrateSkillFreeSource(source);
}

/**
 * A weapon's Explodes On kept to a whole face from 2 to 10, so an exploding die always stops. 0, blank, or a value
 * that is not a number reads as 10, which is how 3.2.1 rolled it (`|| 10`).
 * game-rules/26_special_dice_rules.md, p.77
 * @param {object} source - Weapon system source (mutated).
 */
export function migrateWeaponSource(source) {
  if (!("explodesOn" in source)) {
    return;
  }
  const value = Math.round(Number(source.explodesOn));
  source.explodesOn = value ? Math.min(10, Math.max(2, value)) : 10;
}

/**
 * Armor misspellings from before 3.0.
 * @param {object} source - Armor system source (mutated).
 */
export function migrateArmorSource(source) {
  migrateKey(source, "equiped", "equipped");
  migrateKey(source, "specialRues", "specialRules");
}

/**
 * Move `object[from]` to `object[to]` when the target is empty, then drop `from`: an existing target value wins, as
 * it did in 3.2.1's own schema map.
 * @param {object} object - Mutated.
 * @param {string} from
 * @param {string} to
 */
function migrateKey(object, from, to) {
  if (!object || !(from in object)) {
    return;
  }
  if (object[to] === undefined || object[to] === "") {
    object[to] = object[from];
  }
  delete object[from];
}

/**
 * A Skill's free ranks and free Emphases kept within what it holds: a Skill granted twice once got more free ranks
 * than ranks, which made its next rank cost no XP (#160). Only a source holding both numbers is read, since an update
 * may carry one alone.
 * game-rules/48_character_creation_expanded.md, p.103
 * @param {object} source - Skill system source (mutated).
 */
function migrateSkillFreeSource(source) {
  if (typeof source.rank === "number" && source.freeRanks > source.rank) {
    source.freeRanks = source.rank;
  }
  if (Array.isArray(source.trainedEmphases) && typeof source.freeEmphasis === "number") {
    source.freeEmphasis = Math.min(
      source.freeEmphasis,
      source.trainedEmphases.filter(Boolean).length
    );
  }
}
