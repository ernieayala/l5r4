/**
 * @module documents/item/lifecycle/grant-records
 * @description The grant records givers keep in `flags.l5r4-enhanced.grants` (module/utils/grants.js), and what taking
 * back a deleted giver's grants changes on the actor: each granted item deleted, or a Skill with ranks or Emphases
 * bought on top, or another giver granting it too, keeping what is still owed (roadmap/STAGE-11 decision 7; #160).
 * grants.js runs the changes in the actor's grant queue.
 */

import { SYS_ID } from "../../../config/constants.js";
import { buildUngrantedSkill } from "../../../utils/grants.js";

/**
 * A giver's grant records.
 * @param {Item} giver
 * @returns {import("../../../utils/grants.js").GrantRecord[]}
 */
export function recordsOf(giver) {
  return giver.getFlag(SYS_ID, "grants") ?? [];
}

/**
 * The changes that take back what a deleted giver granted: the granted items to delete, and the Skills with ranks or
 * Emphases bought on top, each losing only what the grant gave.
 * @param {Actor} actor
 * @param {Item} giver - The deleted item, its flags still readable
 * @returns {{deletes: string[], updates: object[]}} Item ids to delete, and item updates
 */
export function buildUngrantChanges(actor, giver) {
  const deletes = [];
  const updates = [];
  for (const record of recordsOf(giver)) {
    const target = record.itemId ? actor.items.get(record.itemId) : null;
    const change = target ? buildUngrantChange(actor, giver, { record, target }) : null;
    if (change?.delete) {
      deletes.push(target.id);
    } else if (change?.update) {
      updates.push(change.update);
    }
  }
  return { deletes, updates };
}

/**
 * What taking back one grant does to its item. Another giver granting the same Skill keeps what it gives, and becomes
 * its giver (#160).
 * @param {Actor} actor
 * @param {Item} giver - The deleted giver
 * @param {{record: object, target: Item}} grant - The grant's record and the item it gave
 * @returns {{delete: true}|{update: object}|null} Null when nothing changes
 */
function buildUngrantChange(actor, giver, { record, target }) {
  const others = otherGrantsOf(actor, giver, target);
  const plan =
    target.type === "skill"
      ? buildUngrantedSkill(
          target._source.system,
          record,
          others.map(other => other.record)
        )
      : { delete: record.created };
  if (plan.delete) {
    return { delete: true };
  }
  if (!plan.update) {
    return null;
  }
  return {
    update: {
      _id: target.id,
      system: plan.update,
      [`flags.${SYS_ID}.grantedBy`]: others.length
        ? others[0].giverId
        : new foundry.data.operators.ForcedDeletion()
    }
  };
}

/**
 * The grant records other items on the actor hold for the same granted item, with their givers.
 * @param {Actor} actor
 * @param {Item} giver - The giver being removed
 * @param {Item} target - The granted item
 * @returns {Array<{giverId: string, record: import("../../../utils/grants.js").GrantRecord}>}
 */
function otherGrantsOf(actor, giver, target) {
  return actor.items
    .filter(item => item.id !== giver.id)
    .flatMap(item =>
      recordsOf(item)
        .filter(record => record.itemId === target.id)
        .map(record => ({ giverId: item.id, record }))
    );
}
