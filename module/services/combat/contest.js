/**
 * @module services/combat/contest
 * @description The Contested Strength roll a Knockdown or Disarm calls for after a hit (pp.86-87). Each side's owner
 * rolls Strength from the attack card; the roll is marked with the attack and its side, and whoever rolls second
 * settles it (p.80): the attacker winning knocks the target Prone, or makes him drop the weapon, which the card
 * tells the GM. A tie is rolled again.
 */

import { SYS_ID } from "../../config/constants.js";
import { F, T } from "../../utils/localization.js";
import { contest } from "../../utils/check.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { TraitRoll } from "../dice/rolls/trait-roll.js";
import { applyEffectAnywhere } from "../effects/apply.js";

/**
 * The Strength rolls made for an attack's contest, by side, since its last tie.
 * @param {string} attackId
 * @returns {{attacker?: ChatMessage, target?: ChatMessage}}
 */
function contestRolls(attackId) {
  const rolls = {};
  for (const message of game.messages.contents) {
    const mark = message.getFlag(SYS_ID, "contest");
    if (mark?.attackId === attackId) {
      rolls[mark.side] = message;
    }
    if (message.getFlag(SYS_ID, "contestTie") === attackId) {
      delete rolls.attacker;
      delete rolls.target;
    }
  }
  return rolls;
}

/**
 * Roll Strength for each side of the contest the user owns and that has not rolled, then settle it when both have.
 * @param {ChatMessage} attack  The attack message (kind "attack", a hit with Knockdown or Disarm)
 * @returns {Promise<void>}
 */
export async function rollContest(attack) {
  const sides = {
    attacker: fromUuidSync(attack.system.actorUuid),
    target: fromUuidSync(attack.system.target.uuid)
  };
  let rolled = false;
  for (const [side, actor] of Object.entries(sides)) {
    if (!actor?.isOwner || contestRolls(attack.id)[side]) {
      continue;
    }
    const message = await TraitRoll({
      actor,
      traitName: "str",
      traitRank: getEffectiveTrait(actor, "str")
    });
    if (!message) {
      return;
    }
    await message.setFlag(SYS_ID, "contest", { attackId: attack.id, side });
    rolled = true;
  }
  if (!rolled) {
    ui.notifications?.info(T("l5r4.ui.combat.contestWaiting"));
    return;
  }
  await settleContest(attack, sides);
}

/**
 * Settle the contest once both sides have rolled.
 * @param {ChatMessage} attack
 * @param {{attacker: Actor, target: Actor}} sides
 * @returns {Promise<void>}
 */
async function settleContest(attack, sides) {
  const rolls = contestRolls(attack.id);
  if (!rolls.attacker || !rolls.target) {
    return;
  }
  const result = contest([
    { id: "attacker", total: rolls.attacker.system.outcome.total },
    { id: "target", total: rolls.target.system.outcome.total }
  ]);
  const speaker = ChatMessage.getSpeaker({ actor: sides.attacker });
  if (result.tie) {
    await ChatMessage.create({
      speaker,
      content: `<p>${T("l5r4.ui.check.contestTie")}</p>`,
      flags: { [SYS_ID]: { contestTie: attack.id } }
    });
    return;
  }
  const { knockdown, disarm } = attack.system.maneuvers;
  const winner = sides[result.winner];
  const lines = [F("l5r4.ui.check.contestWinner", { name: foundry.utils.escapeHTML(winner.name) })];
  if (result.winner === "attacker") {
    if (knockdown) {
      if (!sides.target.statuses.has("prone")) {
        await applyEffectAnywhere(sides.target, "prone");
      }
      lines.push(
        F("l5r4.ui.combat.knockedDown", { name: foundry.utils.escapeHTML(sides.target.name) })
      );
    }
    if (disarm) {
      lines.push(
        F("l5r4.ui.combat.disarmed", { name: foundry.utils.escapeHTML(sides.target.name) })
      );
    }
  }
  await ChatMessage.create({ speaker, content: lines.map(line => `<p>${line}</p>`).join("") });
}
