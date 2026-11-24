/**
 * @module documents/item/lifecycle/grants
 * @description GrantItem rules on an actor's items (roadmap/STAGE-11 decisions 2 and 7): a School's Skills come with
 * it, its Techniques as the School Rank reaches them (a second School's as module/documents/item/lifecycle/
 * second-school.js says), and removing the School takes back what it gave. The client that sent the change to the
 * actor or item does the work (module/utils/change-origin.js), so one client makes each grant, even when its user is
 * signed in on others; changes to one actor run one after another.
 * game-rules/48_character_creation_expanded.md, p.102
 * game-rules/49_improving_your_character.md, p.104
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { applyChoices } from "../../../utils/choices.js";
import {
  buildEmptyGrantRecord,
  buildGrantedSkill,
  getPendingGrants,
  buildUngrantedSkill,
  isSecondSchool
} from "../../../utils/grants.js";
import { F, R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { createRule } from "../../../data/rules/rule-models.js";
import { getSecondSchoolGrants } from "./second-school.js";

/**
 * Grant work waiting per actor UUID, so one client's grants for an actor never overlap.
 * @type {Map<string, Promise<void>>}
 */
const queues = new Map();

/**
 * Once the actor's grant work queued so far has run.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export function grantQueueOf(actor) {
  return queues.get(actor.uuid) ?? Promise.resolve();
}

/**
 * Grant whatever is due on the actor, after its earlier grant work.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export function applyGrants(actor) {
  return updateGrantQueue(actor, () => createDueGrants(actor));
}

/**
 * Take back what a deleted giver granted (decision 7): delete each granted item, except a Skill with ranks or
 * Emphases bought on top, which loses only what the grant gave.
 * @param {Actor} actor
 * @param {Item} giver - The deleted item, its flags still readable
 * @returns {Promise<void>}
 */
export function deleteGrantedItems(actor, giver) {
  return updateGrantQueue(actor, async () => {
    const { deletes, updates } = buildUngrantChanges(actor, giver);
    if (updates.length) {
      await actor.updateEmbeddedDocuments("Item", updates);
    }
    if (deletes.length) {
      await actor.deleteEmbeddedDocuments("Item", deletes);
    }
  });
}

/**
 * Note on its giver that a granted item was removed, so it is not granted again.
 * @param {Actor} actor
 * @param {Item} granted - The deleted item
 * @returns {Promise<void>}
 */
export function updateGrantRecords(actor, granted) {
  return updateGrantQueue(actor, async () => {
    const giver = actor.items.get(granted.getFlag(SYS_ID, "grantedBy"));
    if (!giver) {
      return;
    }
    const records = recordsOf(giver).map(record =>
      record.itemId === granted.id ? { ...record, itemId: null } : record
    );
    await giver.setFlag(SYS_ID, "grants", records);
  });
}

/**
 * Run a task after the actor's earlier grant work.
 * @param {Actor} actor
 * @param {function(): Promise<void>} task
 * @returns {Promise<void>}
 */
function updateGrantQueue(actor, task) {
  const previous = queues.get(actor.uuid) ?? Promise.resolve();
  const next = previous.then(task).catch(err => {
    // A request already sent when the actor was deleted fails with it; there is nothing left to grant
    if (fromUuidSync(actor.uuid)) {
      console.error(`${SYS_ID} | Grants for ${actor.name} failed`, err);
    }
  });
  queues.set(actor.uuid, next);
  next.finally(() => {
    if (queues.get(actor.uuid) === next) {
      queues.delete(actor.uuid);
    }
  });
  return next;
}

/**
 * An item's GrantItem rules, choices filled in. A rule that fails validation is skipped with a warning; it is
 * stored user JSON.
 * @param {Item} item
 * @returns {import("../../../utils/grants.js").GrantRule[]}
 */
function grantRulesOf(item) {
  const rules = [];
  for (const source of applyChoices(item.system.rules)) {
    if (source?.key !== "GrantItem") {
      continue;
    }
    try {
      const { uuid, rank, skillRank, emphasis } = createRule(source);
      rules.push({ uuid, rank, skillRank, emphasis });
    } catch (err) {
      console.warn(`${SYS_ID} | GrantItem rule on "${item.name}" skipped: ${err.message}`);
    }
  }
  return rules;
}

/**
 * The School Rank a giver's grants wait for: a School's own, else the owner's Insight Rank (decision 2). An NPC has
 * no Insight Rank and counts as Rank 1.
 * @param {Item} giver
 * @returns {number}
 */
function rankOf(giver) {
  return giver.type === "school"
    ? giver.system.schoolRank
    : toInt(giver.actor.system.insight?.rank) || 1;
}

/**
 * A giver's grant records.
 * @param {Item} giver
 * @returns {import("../../../utils/grants.js").GrantRecord[]}
 */
function recordsOf(giver) {
  return giver.getFlag(SYS_ID, "grants") ?? [];
}

/**
 * Give one granted item to the actor: a Skill it already has becomes a School Skill with the free ranks; anything
 * else is copied with its giver's id.
 * @param {Actor} actor
 * @param {import("../../../utils/grants.js").GrantRule} rule
 * @param {object} grant
 * @param {Item} grant.giver - The item whose rule grants it
 * @param {Item} grant.source - The item granted
 * @returns {Promise<import("../../../utils/grants.js").GrantRecord>}
 */
async function createGrantedItem(actor, rule, { giver, source }) {
  const link = { [`flags.${SYS_ID}.grantedBy`]: giver.id };
  if (source.type === "skill") {
    const name = source.name.toLowerCase().trim();
    const owned = actor.items.find(i => i.type === "skill" && i.name.toLowerCase().trim() === name);
    if (owned) {
      const { update, record } = buildGrantedSkill(owned._source.system, rule);
      await owned.update({ system: update, ...link });
      return { uuid: rule.uuid, itemId: owned.id, created: false, ...record };
    }
  }
  const data = source.toObject();
  delete data._id;
  let record = { freeRanks: 0, emphasis: "", freeEmphasis: 0 };
  if (source.type === "skill") {
    const granted = buildGrantedSkill(data.system, rule);
    Object.assign(data.system, granted.update);
    record = granted.record;
  }
  foundry.utils.setProperty(data, `flags.${SYS_ID}.grantedBy`, giver.id);
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  return { uuid: rule.uuid, itemId: created.id, created: true, ...record };
}

/**
 * Grant everything due on the actor: each item's GrantItem rules not yet granted whose School Rank has come. A grant
 * that waited for a School Rank posts a chat note.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function createDueGrants(actor) {
  // Grant work queued before the actor was deleted has nothing left to grant to
  const isActorGone = () => !fromUuidSync(actor.uuid);
  for (const giver of actor.items.contents) {
    const rules = grantRulesOf(giver);
    if (!rules.length || !actor.items.has(giver.id)) {
      continue;
    }
    const records = [...recordsOf(giver)];
    const due = getPendingGrants(rules, records, rankOf(giver));
    const { grant, skip } = isSecondSchool(giver)
      ? await getSecondSchoolGrants(actor, giver, { rules, due })
      : { grant: due, skip: [] };
    records.push(...skip.map(rule => buildEmptyGrantRecord(rule.uuid)));
    for (const rule of grant) {
      if (isActorGone()) {
        return;
      }
      records.push(await createDueGrant(actor, rule, { giver }));
    }
    if ((grant.length || skip.length) && !isActorGone()) {
      await giver.setFlag(SYS_ID, "grants", records);
    }
  }
}

/**
 * The changes that take back what a deleted giver granted: the granted items to delete, and the Skills with ranks or
 * Emphases bought on top, each losing only what the grant gave.
 * @param {Actor} actor
 * @param {Item} giver - The deleted item, its flags still readable
 * @returns {{deletes: string[], updates: object[]}} Item ids to delete, and item updates
 */
function buildUngrantChanges(actor, giver) {
  const deletes = [];
  const updates = [];
  for (const record of recordsOf(giver)) {
    const target = record.itemId ? actor.items.get(record.itemId) : null;
    if (!target) {
      continue;
    }
    const plan =
      target.type === "skill"
        ? buildUngrantedSkill(target._source.system, record)
        : { delete: record.created };
    if (plan.delete) {
      deletes.push(target.id);
    } else if (plan.update) {
      updates.push({
        _id: target.id,
        system: plan.update,
        [`flags.${SYS_ID}.grantedBy`]: new foundry.data.operators.ForcedDeletion()
      });
    }
  }
  return { deletes, updates };
}

/**
 * Grant one due rule: give its item to the actor and, when the grant waited for a School Rank, post a chat note. A
 * rule whose UUID is not an item is recorded as granted with no item, so it is not tried again.
 * @param {Actor} actor
 * @param {import("../../../utils/grants.js").GrantRule} rule
 * @param {object} grant
 * @param {Item} grant.giver - The item whose rule grants it
 * @returns {Promise<import("../../../utils/grants.js").GrantRecord>}
 */
async function createDueGrant(actor, rule, { giver }) {
  const source = await fromUuid(rule.uuid);
  if (source?.documentName !== "Item") {
    console.warn(`${SYS_ID} | "${giver.name}" grants ${rule.uuid}, which is not an item`);
    return buildEmptyGrantRecord(rule.uuid);
  }
  const record = await createGrantedItem(actor, rule, { giver, source });
  if (rule.rank > 0) {
    await postGrantNote(actor, { giver, source, rank: rule.rank });
  }
  return record;
}

/**
 * Post the chat note that a grant which waited for a School Rank has come.
 * @param {Actor} actor
 * @param {object} grant
 * @param {Item} grant.giver - The item whose rule grants it
 * @param {Item} grant.source - The item granted
 * @param {number} grant.rank - The School Rank it waited for
 * @returns {Promise<void>}
 */
async function postGrantNote(actor, { giver, source, rank }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await R(CHAT_TEMPLATES.note, {
      lines: [
        F("l5r4.ui.grants.granted", {
          name: actor.name,
          item: source.name,
          giver: giver.name,
          rank
        })
      ]
    })
  });
}
