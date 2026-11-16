/**
 * @module setup/migrations/items/item-rules
 * @description Moves 3.2.1 item mechanics into `system.rules` (roadmap/STAGE-07-RULE-ENGINE.md, Conversions).
 */
import { SYS_ID } from "../../../config/constants.js";

const TRAIT_CHANGE = /^system\.traits\.(sta|wil|str|per|ref|awa|agi|int)$/;
const VOID_CHANGE_KEYS = new Set(["system.rings.void.rank", "system.rings.void.value"]);
const MASTER_OF_BLOOD = "master-of-blood";

/**
 * The rules a Master of Blood advantage carries: the RollOption the maho roll reads for its lower blood cost and
 * Taint, and +10 to the TN of every spell that is not maho.
 * game-rules/89_shadowlands_taint.md, p.280
 * @type {ReadonlyArray<object>}
 */
const MASTER_OF_BLOOD_RULES = Object.freeze([
  { key: "RollOption", option: MASTER_OF_BLOOD },
  {
    key: "TNModifier",
    selector: "spell",
    value: 10,
    predicate: [{ not: "check:maho" }]
  }
]);

/**
 * Moves item mechanics into rules: Family and School Trait bonus effects become TraitAdjust rules, a Master of
 * Blood advantage gets its rules, and any item's Free Raises become a FreeRaise rule. Running again changes nothing.
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
      let changed = await convertFreeRaises(item);
      if (item.type === "family" || item.type === "school") {
        changed = (await convertCreationBonusEffects(item)) || changed;
      } else if (item.type === "advantage" && item.name.toLowerCase().includes("master of blood")) {
        changed = (await addMasterOfBloodRules(item)) || changed;
      }
      migrated += Number(changed);
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
 * Master of Blood: 3.2.1 recognized the advantage by name; it now carries its rules. Each is added when the item
 * lacks a rule of its key, so running again changes nothing.
 * @param {Item} item
 * @returns {Promise<boolean>} Whether the item changed.
 */
async function addMasterOfBloodRules(item) {
  const rules = item._source.system.rules;
  const missing = MASTER_OF_BLOOD_RULES.filter(
    wanted =>
      !rules.some(
        rule =>
          rule.key === wanted.key && (wanted.key !== "RollOption" || rule.option === wanted.option)
      )
  );
  if (missing.length === 0) {
    return false;
  }
  await item.update({ "system.rules": [...rules, ...structuredClone(missing)] }, { render: false });
  return true;
}

/**
 * An item's `freeRaises` value, which 3.2.1 added to every roll its owner made, becomes a FreeRaise rule on "any"
 * roll, which the GM can see and narrow in the rules editor (Ernie's ruling). The field is set to 0, so running
 * again changes nothing.
 * @param {Item} item
 * @returns {Promise<boolean>} Whether the item changed.
 */
async function convertFreeRaises(item) {
  const value = Number(item._source.system.freeRaises);
  if (!(value > 0)) {
    return false;
  }
  await item.update(
    {
      "system.rules": [...item._source.system.rules, { key: "FreeRaise", selector: "any", value }],
      "system.freeRaises": 0
    },
    { render: false }
  );
  return true;
}
