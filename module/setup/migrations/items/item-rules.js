/**
 * Item Rules Migration
 * Moves 3.2.1 item mechanics into `system.rules` (roadmap/STAGE-07-RULE-ENGINE.md, Conversions).
 *
 * @module setup/migrations/items/item-rules
 */

import { SYS_ID } from "../../../config/constants.js";

const TRAIT_CHANGE = /^system\.traits\.(sta|wil|str|per|ref|awa|agi|int)$/;
const VOID_CHANGE_KEYS = new Set(["system.rings.void.rank", "system.rings.void.value"]);
const MASTER_OF_BLOOD = "master-of-blood";

/**
 * The Trait an "add" change raises, "void" for the Void Ring, or null when the change is something else.
 * @param {object} change
 * @returns {string|null}
 */
function changeTrait(change) {
  if (change.type !== "add") {
    return null;
  }
  if (VOID_CHANGE_KEYS.has(change.key)) {
    return "void";
  }
  return TRAIT_CHANGE.exec(change.key)?.[1] ?? null;
}

/**
 * Family and School items: each transferred effect's numeric Trait and Void "add" changes become TraitAdjust
 * rules. The changes leave the effect, and an effect left with no changes and no statuses is deleted, so the
 * bonus applies once.
 * @param {Item} item
 * @returns {Promise<boolean>} Whether the item changed.
 */
async function convertCreationBonusEffects(item) {
  const rules = [];
  const deletions = [];
  const updates = [];
  for (const effect of item.effects) {
    if (!effect.transfer) {
      continue;
    }
    const kept = [];
    let moved = false;
    for (const change of effect._source.system.changes) {
      const trait = changeTrait(change);
      const value = Number(change.value);
      if (trait && Number.isFinite(value)) {
        rules.push({ key: "TraitAdjust", trait, value });
        moved = true;
      } else {
        kept.push(change);
      }
    }
    if (!moved) {
      continue;
    }
    if (kept.length === 0 && effect.statuses.size === 0) {
      deletions.push(effect.id);
    } else {
      updates.push({ _id: effect.id, "system.changes": kept });
    }
  }
  if (rules.length === 0) {
    return false;
  }

  await item.update(
    { "system.rules": [...item._source.system.rules, ...rules] },
    { render: false }
  );
  if (updates.length > 0) {
    await item.updateEmbeddedDocuments("ActiveEffect", updates, { render: false });
  }
  if (deletions.length > 0) {
    await item.deleteEmbeddedDocuments("ActiveEffect", deletions, { render: false });
  }
  return true;
}

/**
 * Master of Blood: 3.2.1 recognized the advantage by name; it now carries the RollOption the maho roll reads.
 * @param {Item} item
 * @returns {Promise<boolean>} Whether the item changed.
 */
async function addMasterOfBloodOption(item) {
  const rules = item._source.system.rules;
  if (rules.some(rule => rule.key === "RollOption" && rule.option === MASTER_OF_BLOOD)) {
    return false;
  }
  await item.update(
    { "system.rules": [...rules, { key: "RollOption", option: MASTER_OF_BLOOD }] },
    { render: false }
  );
  return true;
}

/**
 * Moves item mechanics into rules: Family and School Trait bonus effects become TraitAdjust rules, and a
 * Master of Blood advantage gets its RollOption. Running again changes nothing.
 *
 * @param {Document[]} docs - Documents to scan; non-Items are skipped
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateItemRules(docs, label) {
  let migrated = 0;
  for (const item of docs) {
    if (item.documentName !== "Item") {
      continue;
    }
    try {
      if (item.type === "family" || item.type === "school") {
        migrated += Number(await convertCreationBonusEffects(item));
      } else if (item.type === "advantage" && item.name.toLowerCase().includes("master of blood")) {
        migrated += Number(await addMasterOfBloodOption(item));
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to move item mechanics into rules", {
        label,
        id: item.id,
        name: item.name,
        err
      });
    }
  }
  if (migrated > 0) {
    console.warn(`${SYS_ID} | Moved the mechanics of ${migrated} items into rules (${label})`);
  }
}
