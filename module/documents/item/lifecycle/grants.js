/**
 * @module documents/item/lifecycle/grants
 * @description GrantItem rules on an actor's items (roadmap/STAGE-11 decisions 2 and 7): a School's Skills come with
 * it, its Techniques as the School Rank reaches them, and removing the School takes back what it gave. The user who
 * changed the actor or item does the work, so one client makes each change; changes to one actor run one after
 * another.
 * game-rules/48_character_creation_expanded.md, p.102
 * game-rules/49_improving_your_character.md, p.104
 */

import { SYS_ID } from "../../../config/constants.js";
import { applyChoices } from "../../../utils/choices.js";
import { grantSkill, pendingGrants, ungrantSkill } from "../../../utils/grants.js";
import { F } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { createRule } from "../../../data/rules/rule-models.js";

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
export function grantsSettled(actor) {
  return queues.get(actor.uuid) ?? Promise.resolve();
}

/**
 * Grant whatever is due on the actor, after its earlier grant work.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export function syncGrants(actor) {
  return queued(actor, () => grantDue(actor));
}

/**
 * Take back what a deleted giver granted (decision 7): delete each granted item, except a Skill with ranks or
 * Emphases bought on top, which loses only what the grant gave.
 * @param {Actor} actor
 * @param {Item} giver - The deleted item, its flags still readable
 * @returns {Promise<void>}
 */
export function ungrant(actor, giver) {
  return queued(actor, async () => {
    const deletes = [];
    const updates = [];
    for (const record of recordsOf(giver)) {
      const target = record.itemId ? actor.items.get(record.itemId) : null;
      if (!target) {
        continue;
      }
      const plan =
        target.type === "skill"
          ? ungrantSkill(target._source.system, record)
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
export function forgetGrant(actor, granted) {
  return queued(actor, async () => {
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
function queued(actor, task) {
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
function grantRules(item) {
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
 * @param {Item} giver
 * @param {Item} source
 * @param {import("../../../utils/grants.js").GrantRule} rule
 * @returns {Promise<import("../../../utils/grants.js").GrantRecord>}
 */
async function grantOne(actor, giver, source, rule) {
  const link = { [`flags.${SYS_ID}.grantedBy`]: giver.id };
  if (source.type === "skill") {
    const name = source.name.toLowerCase().trim();
    const owned = actor.items.find(i => i.type === "skill" && i.name.toLowerCase().trim() === name);
    if (owned) {
      const { update, record } = grantSkill(owned._source.system, rule);
      await owned.update({ system: update, ...link });
      return { uuid: rule.uuid, itemId: owned.id, created: false, ...record };
    }
  }
  const data = source.toObject();
  delete data._id;
  let record = { freeRanks: 0, emphasis: "", freeEmphasis: 0 };
  if (source.type === "skill") {
    const granted = grantSkill(data.system, rule);
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
async function grantDue(actor) {
  // Grant work queued before the actor was deleted has nothing left to grant to
  const gone = () => !fromUuidSync(actor.uuid);
  for (const giver of actor.items.contents) {
    const rules = grantRules(giver);
    if (!rules.length || !actor.items.has(giver.id)) {
      continue;
    }
    const records = [...recordsOf(giver)];
    const due = pendingGrants(rules, records, rankOf(giver));
    for (const rule of due) {
      if (gone()) {
        return;
      }
      const source = await fromUuid(rule.uuid);
      if (source?.documentName !== "Item") {
        console.warn(`${SYS_ID} | "${giver.name}" grants ${rule.uuid}, which is not an item`);
        records.push({
          uuid: rule.uuid,
          itemId: null,
          created: false,
          freeRanks: 0,
          emphasis: "",
          freeEmphasis: 0
        });
        continue;
      }
      records.push(await grantOne(actor, giver, source, rule));
      if (rule.rank > 0) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<p>${F("l5r4.ui.grants.granted", {
            name: foundry.utils.escapeHTML(actor.name),
            item: foundry.utils.escapeHTML(source.name),
            giver: foundry.utils.escapeHTML(giver.name),
            rank: rule.rank
          })}</p>`
        });
      }
    }
    if (due.length && !gone()) {
      await giver.setFlag(SYS_ID, "grants", records);
    }
  }
}
