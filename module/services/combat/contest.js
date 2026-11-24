/**
 * @module services/combat/contest
 * @description The Contested Strength roll a Knockdown or Disarm calls for after a hit. Each side's owner rolls
 * Strength from the attack card; the roll is marked with the attack and its side, and whoever rolls second settles
 * it as a Contested Roll: the attacker winning knocks the target Prone, or makes him drop the weapon, which the card
 * tells the GM. A tie is rolled again.
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/29_types_of_rolls.md, p.80
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES } from "../../config/templates.js";
import { F, R, T } from "../../utils/localization.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { rollTrait } from "../dice/rolls/trait-roll.js";
import { applyEffectAnywhere } from "../effects/apply.js";
import { contestRollsOf, getContestOutcome } from "./contest-rolls.js";

/**
 * Roll Strength for each side of the contest the user owns and that has not rolled, then settle it when both have.
 * @param {ChatMessage} attack - The attack message (kind "attack", a hit with Knockdown or Disarm)
 * @returns {Promise<void>}
 */
export async function rollContest(attack) {
  const sides = {
    attacker: fromUuidSync(attack.system.actorUuid),
    target: fromUuidSync(attack.system.target.uuid)
  };
  let rolled = false;
  for (const [side, actor] of Object.entries(sides)) {
    if (!actor?.isOwner || contestRollsOf(attack)[side]) {
      continue;
    }
    const message = await rollTrait({
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
    ui.notifications?.info(formatContestState(attack, sides));
    return;
  }
  await postContestResult(attack, sides);
}

/**
 * Settle the contest once both sides have rolled; until then, say whose roll it waits for (#140).
 * @param {ChatMessage} attack
 * @param {{attacker: Actor, target: Actor}} sides
 * @returns {Promise<void>}
 */
async function postContestResult(attack, sides) {
  const result = getContestOutcome(attack);
  if (!result) {
    ui.notifications?.info(formatContestState(attack, sides));
    return;
  }
  const speaker = ChatMessage.getSpeaker({ actor: sides.attacker });
  if (result.tie) {
    await ChatMessage.create({
      speaker,
      content: await R(CHAT_TEMPLATES.note, { lines: [T("l5r4.ui.check.contestTie")] }),
      flags: { [SYS_ID]: { contestTie: attack.id } }
    });
    return;
  }
  const lines = await applyContestOutcome(attack, sides, result.winner);
  await ChatMessage.create({ speaker, content: await R(CHAT_TEMPLATES.note, { lines }) });
}

/**
 * Apply what the contest's winner gains: the attacker winning knocks the target Prone for a Knockdown and disarms him
 * for a Disarm, which the card tells the GM.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {ChatMessage} attack - The attack message
 * @param {{attacker: Actor, target: Actor}} sides - Each side's actor
 * @param {"attacker"|"target"} winnerSide - The side that won
 * @returns {Promise<string[]>} The card's lines: the winner, then each maneuver's outcome
 */
async function applyContestOutcome(attack, sides, winnerSide) {
  const { knockdown, disarm } = attack.system.maneuvers;
  const lines = [F("l5r4.ui.check.contestWinner", { name: sides[winnerSide].name })];
  if (winnerSide !== "attacker") {
    return lines;
  }
  if (knockdown) {
    if (!sides.target.statuses.has("prone")) {
      // The contest the GM's client checks before it knocks down a target the user does not own (#162)
      await applyEffectAnywhere(sides.target, "prone", {
        proof: { kind: "contest", attackId: attack.id }
      });
    }
    lines.push(F("l5r4.ui.combat.knockedDown", { name: sides.target.name }));
  }
  if (disarm) {
    lines.push(F("l5r4.ui.combat.disarmed", { name: sides.target.name }));
  }
  return lines;
}

/**
 * Where a contest stands for a user who has nothing to roll: settled once both sides have rolled, otherwise waiting
 * for the side that has not.
 * @param {ChatMessage} attack - The attack message
 * @param {{attacker: Actor, target: Actor}} sides
 * @returns {string}
 */
function formatContestState(attack, sides) {
  const rolls = contestRollsOf(attack);
  if (rolls.attacker && rolls.target) {
    return T("l5r4.ui.combat.contestSettled");
  }
  const waiting = rolls.attacker ? sides.target : sides.attacker;
  return F("l5r4.ui.combat.contestWaitingFor", { name: waiting.name });
}
