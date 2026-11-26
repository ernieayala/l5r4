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
import { applyChoices } from "../../../utils/choices.js";
import {
  buildEmptyGrantRecord,
  buildGrantedSkill,
  getPendingGrants,
  isSecondSchool
} from "../../../utils/grants.js";
import { F } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { createRule } from "../../../data/rules/rule-models.js";
import { postGrantNote, postGrantProblem } from "./grant-notes.js";
import { buildUngrantChanges, recordsOf } from "./grant-records.js";
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
      return postGrantProblem(actor, F("l5r4.ui.grants.failed", { name: actor.name }));
    }
    return undefined;
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
 * An item's GrantItem rules, choices filled in. A rule that fails validation is skipped, and a note to the GM and
 * the owners names the item and why (#143); it is stored user JSON.
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
      // Left running: the rules are read synchronously; a note that cannot post is logged
      postGrantProblem(
        item.actor,
        F("l5r4.ui.grants.invalid", { giver: item.name, error: err.message })
      ).catch(noteErr => console.error(`${SYS_ID} | Grant note failed`, noteErr));
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
    const recorded = records.length;
    records.push(...skip.map(rule => buildEmptyGrantRecord(rule.uuid)));
    for (const rule of grant) {
      if (isActorGone()) {
        return;
      }
      const record = await createDueGrant(actor, rule, { giver });
      if (record) {
        records.push(record);
      }
    }
    if (records.length > recorded && !isActorGone()) {
      await giver.setFlag(SYS_ID, "grants", records);
    }
  }
}

/**
 * Grant one due rule: give its item to the actor and, when the grant waited for a School Rank, post a chat note. A
 * rule whose UUID is not an item grants nothing and is not recorded, so it is tried again once the item exists (a
 * pack restored, an item recreated); a note to the GM and the owners names the giver and the UUID (#143).
 * @param {Actor} actor
 * @param {import("../../../utils/grants.js").GrantRule} rule
 * @param {object} grant
 * @param {Item} grant.giver - The item whose rule grants it
 * @returns {Promise<import("../../../utils/grants.js").GrantRecord|null>} null when nothing was granted
 */
async function createDueGrant(actor, rule, { giver }) {
  const source = await fromUuid(rule.uuid).catch(() => null);
  if (source?.documentName !== "Item") {
    await postGrantProblem(
      actor,
      F("l5r4.ui.grants.missing", { giver: giver.name, uuid: rule.uuid })
    );
    return null;
  }
  const record = await createGrantedItem(actor, rule, { giver, source });
  if (rule.rank > 0) {
    await postGrantNote(actor, { giver, source, rank: rule.rank });
  }
  return record;
}
