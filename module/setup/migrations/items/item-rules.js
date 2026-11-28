/**
 * @module setup/migrations/items/item-rules
 * @description Moves 3.2.1 item mechanics into `system.rules` (roadmap/STAGE-07-RULE-ENGINE.md, Conversions).
 */

import { WEAPON_TYPES } from "../../../config/constants.js";

const TRAIT_CHANGE = /^system\.traits\.(sta|wil|str|per|ref|awa|agi|int)$/;
const voidChangeKeys = new Set(["system.rings.void.rank", "system.rings.void.value"]);
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
 * Moves one item's mechanics into rules: Family and School Trait bonus effects become TraitAdjust rules, a Master
 * of Blood advantage gets its rules, and the item's Free Raises become a FreeRaise rule. It runs once per item
 * (#181), so a rule a GM deletes afterwards stays deleted.
 *
 * @param {Item} item
 * @param {import("../../migrations.js").MigrationRun} run - Its notes are extended
 * @returns {Promise<void>}
 */
export async function migrateItemRules(item, run) {
  await migrateFreeRaises(item, run);
  if (item.type === "family" || item.type === "school") {
    await migrateCreationBonusEffects(item);
  } else if (item.type === "advantage" && item.name.toLowerCase().includes("master of blood")) {
    await migrateMasterOfBloodRules(item);
  }
}

/**
 * The Trait an "add" change raises, "void" for the Void Ring, or null when the change is something else.
 * @param {object} change
 * @returns {string|null}
 */
function changedTraitOf(change) {
  if (change.type !== "add") {
    return null;
  }
  if (voidChangeKeys.has(change.key)) {
    return "void";
  }
  return TRAIT_CHANGE.exec(change.key)?.[1] ?? null;
}

/**
 * Family and School items: each transferred effect's numeric Trait and Void "add" changes become TraitAdjust
 * rules. The changes leave the effect, and an effect left with no changes and no statuses is deleted, so the
 * bonus applies once.
 * @param {Item} item
 * @returns {Promise<void>}
 */
async function migrateCreationBonusEffects(item) {
  const { rules, updates, deletions } = buildCreationBonusMoves(item);
  if (rules.length === 0) {
    return;
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
}

/**
 * What moving a Family or School item's Trait bonuses into rules does: the TraitAdjust rules, the effects that keep
 * other changes, and the effects left empty, which are deleted.
 * @param {Item} item
 * @returns {{rules: object[], updates: object[], deletions: string[]}} The rules to add, the effect updates, and the
 * ids of the effects to delete
 */
function buildCreationBonusMoves(item) {
  const rules = [];
  const deletions = [];
  const updates = [];
  for (const effect of item.effects) {
    if (!effect.transfer) {
      continue;
    }
    const { moved, kept } = buildTraitAdjustMoves(effect);
    if (moved.length === 0) {
      continue;
    }
    rules.push(...moved);
    if (kept.length === 0 && effect.statuses.size === 0) {
      deletions.push(effect.id);
    } else {
      updates.push({ _id: effect.id, "system.changes": kept });
    }
  }
  return { rules, updates, deletions };
}

/**
 * Split one effect's changes: each numeric Trait or Void "add" change becomes a TraitAdjust rule, and the rest stay.
 * @param {ActiveEffect} effect
 * @returns {{moved: object[], kept: object[]}} The TraitAdjust rules and the changes the effect keeps
 */
function buildTraitAdjustMoves(effect) {
  const moved = [];
  const kept = [];
  for (const change of effect._source.system.changes) {
    const trait = changedTraitOf(change);
    const value = Number(change.value);
    if (trait && Number.isFinite(value)) {
      moved.push({ key: "TraitAdjust", trait, value });
    } else {
      kept.push(change);
    }
  }
  return { moved, kept };
}

/**
 * Master of Blood: 3.2.1 recognized the advantage by name; it now carries its rules. Each is added when the item
 * lacks a rule of its key, so running again changes nothing.
 * @param {Item} item
 * @returns {Promise<void>}
 */
async function migrateMasterOfBloodRules(item) {
  const rules = item._source.system.rules;
  const missing = MASTER_OF_BLOOD_RULES.filter(
    wanted =>
      !rules.some(
        rule =>
          rule.key === wanted.key && (wanted.key !== "RollOption" || rule.option === wanted.option)
      )
  );
  if (missing.length === 0) {
    return;
  }
  await item.update({ "system.rules": [...rules, ...structuredClone(missing)] }, { render: false });
}

/**
 * An item's `freeRaises` value, which 3.2.1 added to every roll its owner made, becomes a FreeRaise rule on "any"
 * roll, which the GM can see and narrow in the rules editor (Ernie's ruling). The field is set to 0, so running
 * again changes nothing. On an item whose rules wait for it to be in use (worn armor, a weapon's own rolls, an
 * activated kata or kiho, a tattoo not passive), the Free Raises now wait too, and the GM is told (#182).
 * @param {Item} item
 * @param {import("../../migrations.js").MigrationRun} run - Its notes are extended
 * @returns {Promise<void>}
 */
async function migrateFreeRaises(item, run) {
  const value = Number(item._source.system.freeRaises);
  if (!(value > 0)) {
    return;
  }
  await item.update(
    {
      "system.rules": [...item._source.system.rules, { key: "FreeRaise", selector: "any", value }],
      "system.freeRaises": 0
    },
    { render: false }
  );
  const narrowed =
    item.type === "armor" || WEAPON_TYPES.includes(item.type) || !item.system.rulesActive;
  if (item.actor && narrowed) {
    run.notes.push(
      game.i18n.localize("l5r4.system.migration.freeRaisesNarrowed", {
        name: item.actor.name,
        item: item.name
      })
    );
  }
}
