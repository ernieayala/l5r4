/**
 * @module utils/xp-calculations
 * @description Character creation bonuses from Family and School items, read from their TraitAdjust rules
 * or, for an item without one, from the legacy `trait`/`bonus` fields. XP prices are module/utils/xp-ledger.js.
 * game-rules/48_character_creation_expanded.md, p.102
 */

import { SYS_ID } from "../config/constants.js";
import { toNumber, toString } from "./type-coercion.js";
import { getTraitAdjustTotal } from "./rule-engine.js";

/**
 * Gets the creation bonus for a trait, split by where it comes from. A Family rule giving +1 Strength gives
 * `{ rules: 1, legacy: 0 }` for "str".
 * @param {object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {{rules: number, legacy: number}} Bonus from Family/School TraitAdjust rules, which add on top of the
 *   stored rank, and from the legacy `trait`/`bonus` fields, which the player stores as a rank
 */
export function getCreationFreeBonusSources(actor, key) {
  return getCreationBonusInternal(actor, key);
}

/**
 * Gets creation bonus for a specific trait.
 *
 * Sums bonuses from Family and School items that affect the trait.
 * Supports both TraitAdjust rules and the legacy bonus fields. A Family giving +1 Strength gives 1 for "str".
 * @param {object} actor - Foundry actor document
 * @param {string} key - Trait key ("sta", "str", "ref", "agi", etc.)
 * @returns {number} Total creation bonus for trait
 */
export function getCreationFreeBonus(actor, key) {
  const { rules, legacy } = getCreationFreeBonusSources(actor, key);
  return rules + legacy;
}

/**
 * Internal helper to calculate creation bonuses from Family/School.
 *
 * Aggregates bonuses from:
 * 1. TraitAdjust rules in the item's `system.rules`
 * 2. Legacy system: the item's system.trait and system.bonus fields, when it has no such rule
 *
 * Deduplicates by document UUID/ID to prevent double-counting.
 *
 * The two sources are summed apart because they reach the Trait differently: a rule adds on top of the
 * stored rank, while the legacy fields are never applied, so the player stores the bonus rank themselves.
 * @param {object} actor - Foundry actor document
 * @param {string} trait - Trait key, or "void" for the Void Ring
 * @returns {{rules: number, legacy: number}} Bonus from TraitAdjust rules and from the legacy fields
 */
function getCreationBonusInternal(actor, trait) {
  try {
    let rules = 0;
    let legacy = 0;
    for (const doc of creationDocsOf(actor)) {
      const bonus = getDocBonus(doc, trait);
      rules += bonus.rules;
      legacy += bonus.legacy;
    }
    return { rules, legacy };
  } catch {
    // Return 0 on any error
    return { rules: 0, legacy: 0 };
  }
}

/**
 * The Family and School documents whose bonuses count: the flagged ones (which may be in compendiums), then the
 * owned ones, each once by UUID or id.
 * @param {object} actor - Foundry actor document
 * @returns {object[]} The documents
 */
function creationDocsOf(actor) {
  const docs = [];
  // Check flagged Family/School items (may be in compendiums)
  for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
    const uuid = actor.getFlag(SYS_ID, flagKey);
    if (!uuid || !globalThis.fromUuidSync) {
      continue;
    }
    docs.push(globalThis.fromUuidSync(uuid));
  }
  // Check owned Family/School items
  for (const it of actor.items ?? []) {
    if (!it || typeof it.type !== "string") {
      continue;
    }
    if (it.type === "family" || it.type === "school") {
      docs.push(it);
    }
  }
  return getUniqueDocs(docs);
}

/**
 * The documents that exist, each once: a document with a UUID or id counts the first time it appears.
 * @param {Array<object|null|undefined>} docs
 * @returns {object[]}
 */
function getUniqueDocs(docs) {
  const seen = new Set();
  return docs.filter(doc => {
    if (!doc) {
      return false;
    }
    const did = doc.uuid ?? doc.id ?? null;
    if (did && seen.has(did)) {
      return false;
    }
    if (did) {
      seen.add(did);
    }
    return true;
  });
}

/**
 * One Family or School document's bonus to a Trait: from its TraitAdjust rules, which replace the legacy fields, or
 * else from its legacy `trait`/`bonus` fields.
 * @param {object} doc - The Family or School document
 * @param {string} trait - Trait key, or "void" for the Void Ring
 * @returns {{rules: number, legacy: number}}
 */
function getDocBonus(doc, trait) {
  const fromRules = getTraitAdjustTotal(doc.system?.rules, trait);
  if (fromRules !== 0) {
    return { rules: fromRules, legacy: 0 };
  }
  const tKey = toString(doc?.system?.trait).toLowerCase();
  const amt = toNumber(doc?.system?.bonus, NaN);
  return { rules: 0, legacy: tKey === trait && Number.isFinite(amt) ? amt : 0 };
}
