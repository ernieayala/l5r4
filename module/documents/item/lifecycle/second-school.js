/**
 * @module documents/item/lifecycle/second-school
 * @description A School added beside the character's other School (Multiple Schools, roadmap/STAGE-18 decision 10):
 * the purchase marks it with `flags.l5r4-enhanced.secondSchool`. It gives no Skills; its Techniques wait until each of
 * its School Skills is at rank 1, and while they wait a chat note names the missing Skills, once per change, kept in
 * `flags.l5r4-enhanced.waitingFor`. module/documents/item/lifecycle/grants.js asks it which grants are due.
 * game-rules/64_advantages.md, p.151
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { hasOpenChoice } from "../../../utils/choices.js";
import { getMissingSchoolSkills } from "../../../utils/grants.js";
import { F, R } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";

/**
 * A second School's due grants: its Skills are recorded but not given, and the rest wait until each of its School
 * Skills is at rank 1.
 * game-rules/64_advantages.md, p.151
 * @param {Actor} actor
 * @param {Item} giver - The second School
 * @param {object} grants
 * @param {import("../../../utils/grants.js").GrantRule[]} grants.rules - All its GrantItem rules
 * @param {import("../../../utils/grants.js").GrantRule[]} grants.due - Those due now
 * @returns {Promise<{grant: object[], skip: object[]}>} The rules to grant, and the Skill rules to record unused
 */
export async function getSecondSchoolGrants(actor, giver, { rules, due }) {
  const sources = new Map();
  for (const rule of rules.filter(r => !hasOpenChoice(r.uuid))) {
    sources.set(rule.uuid, await fromUuid(rule.uuid));
  }
  const isSkill = rule => sources.get(rule.uuid)?.type === "skill";
  const ranks = new Map(
    actor.items
      .filter(item => item.type === "skill")
      .map(item => [item.name.toLowerCase().trim(), toInt(item.system.rank)])
  );
  const skillNames = rules.filter(isSkill).map(rule => sources.get(rule.uuid).name);
  const missing = getMissingSchoolSkills(skillNames, ranks);
  const held = missing.length ? due.filter(rule => !isSkill(rule)) : [];
  const heldNames = held.map(rule => sources.get(rule.uuid)?.name).filter(Boolean);
  await updateWaitingNote(actor, giver, { missing: heldNames.length ? missing : [], heldNames });
  return {
    grant: missing.length ? [] : due.filter(rule => !isSkill(rule)),
    skip: due.filter(isSkill)
  };
}

/**
 * Keep the second School's `waitingFor` flag at the Skills its held grants wait for, and post a chat note when that
 * list changes to a new one.
 * @param {Actor} actor
 * @param {Item} giver - The second School
 * @param {object} waiting
 * @param {string[]} waiting.missing - The School Skills below rank 1, empty when nothing waits
 * @param {string[]} waiting.heldNames - The names of the items that wait
 * @returns {Promise<void>}
 */
async function updateWaitingNote(actor, giver, { missing, heldNames }) {
  const before = giver.getFlag(SYS_ID, "waitingFor") ?? [];
  if (missing.join("\n") === before.join("\n")) {
    return;
  }
  await giver.setFlag(SYS_ID, "waitingFor", missing);
  if (!missing.length) {
    return;
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await R(CHAT_TEMPLATES.note, {
      lines: [
        F("l5r4.ui.grants.waiting", {
          name: actor.name,
          items: heldNames.join(", "),
          giver: giver.name,
          skills: missing.join(", ")
        })
      ]
    })
  });
}
