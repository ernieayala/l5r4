/**
 * @module services/combat/contest
 * @description The Contested Strength roll a Knockdown or Disarm calls for after a hit. Each side's owner rolls
 * Strength from the attack card; the roll is marked with the attack and its side, and whoever rolls second settles
 * it as a Contested Roll: the attacker winning knocks the target Prone, or makes him drop the weapon, which the card
 * tells the GM. A tie is rolled again. A GM's press rolls only the sides no connected player owns, and offers to roll a
 * player's side once nothing else is left (#165). A roll that replaces a side's (an Honor Roll, a re-roll keeping the
 * better) takes its place and settles the contest again while no tie has started a new one (#169).
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/29_types_of_rolls.md, p.80
 */

import { SYS_ID } from "../../config/constants.js";
import { CHAT_TEMPLATES, DIALOG_TEMPLATES } from "../../config/templates.js";
import { F, R, T } from "../../utils/localization.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { hasActivePlayer } from "../../utils/ownership.js";
import { askConfirm } from "../dialog.js";
import { rollTrait } from "../dice/rolls/trait-roll.js";
import { applyEffectAnywhere, effectsOf } from "../effects/apply.js";
import { registerGmQuery, requestGmQuery } from "../gm-client.js";
import { contestRollsOf, getContestOutcome } from "./contest-rolls.js";
import { canActFor, postReplacedTooLate } from "./flow.js";

/** Name of the GM query that puts a replacement roll in a contest (registered in registerContestQueries). */
export const REPLACE_CONTEST_QUERY = `${SYS_ID}.replaceContestRoll`;

/**
 * Roll Strength for each side of the contest the user may roll and that has not rolled, then settle it when both have.
 * A side a connected player owns is that player's to roll, Void Point and Raises included, so a GM's press skips it;
 * with nothing else to roll, the GM is asked whether to roll it for them (#165).
 * game-rules/25_rings_and_traits.md, p.78
 * @param {ChatMessage} attack - The attack message (kind "attack", a hit with Knockdown or Disarm)
 * @returns {Promise<void>}
 */
export async function rollContest(attack) {
  const sides = {
    attacker: fromUuidSync(attack.system.actorUuid),
    target: fromUuidSync(attack.system.target.uuid)
  };
  const rolls = contestRollsOf(attack);
  const open = Object.keys(sides).filter(side => sides[side]?.isOwner && !rolls[side]);
  const own = open.filter(side => !game.user.isGM || !hasActivePlayer(sides[side], game.users));
  const rolling = own.length ? own : await askRollForPlayers(open, sides);
  for (const side of rolling) {
    const actor = sides[side];
    const message = await rollTrait({
      actor,
      traitName: "str",
      traitRank: getEffectiveTrait(actor, "str")
    });
    if (!message) {
      return;
    }
    await message.setFlag(SYS_ID, "contest", { attackId: attack.id, side });
  }
  if (!rolling.length) {
    ui.notifications?.info(formatContestState(attack, sides));
    return;
  }
  await postContestResult(attack, sides);
}

/**
 * Put a roll that replaces a contest's Strength roll (an Honor Roll, a re-roll keeping the better) in its place, on
 * the GM's side: the contest settles again from it while the original is still its side's roll, a tie having started
 * no new contest since (#169, Ernie's ruling). A roll that marks no contest changes nothing.
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/43_honor.md, p.92
 * @param {ChatMessage} original - The roll replaced
 * @param {ChatMessage} replacement - The roll that replaces it
 * @returns {Promise<void>}
 */
export async function applyRerollToContest(original, replacement) {
  if (!original.getFlag(SYS_ID, "contest")) {
    return;
  }
  const request = { originalId: original.id, rollId: replacement.id };
  await requestGmQuery(REPLACE_CONTEST_QUERY, request, applyContestReplacement);
}

/** Register the GM side of replacing a contest's roll. */
export function registerContestQueries() {
  registerGmQuery(REPLACE_CONTEST_QUERY, (request, { user }) =>
    applyContestReplacement(request, user)
  );
}

/**
 * The GM's fallback when every side left to roll is a connected player's: ask, for each, whether to roll it here, so a
 * player who stepped away never stalls the table (#165).
 * @param {string[]} waiting - The sides left to roll, each owned by a connected player
 * @param {{attacker: Actor, target: Actor}} sides
 * @returns {Promise<string[]>} The sides the GM chose to roll
 */
async function askRollForPlayers(waiting, sides) {
  const chosen = [];
  for (const side of waiting) {
    const name = sides[side].name;
    const yes = await askConfirm({
      window: { title: F("l5r4.ui.combat.contestRollForTitle", { name }) },
      content: await R(DIALOG_TEMPLATES.confirm, {
        question: F("l5r4.ui.combat.contestRollForQuestion", { name })
      }),
      yes: { label: T("l5r4.ui.combat.rollForThem") },
      no: { label: T("l5r4.ui.combat.waitForPlayer") }
    });
    if (yes) {
      chosen.push(side);
    }
  }
  return chosen;
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
        origin: attack.uuid,
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
 * Replace a contest's roll on the GM: the roll must re-roll the original for the same actor, whom the user acts for.
 * The replacement takes the original's contest mark; once both sides have rolled, the contest settles again.
 * @param {{originalId: string, rollId: string}} request - From another client
 * @param {User} user - The requesting user
 * @returns {Promise<void>}
 */
async function applyContestReplacement({ originalId, rollId }, user) {
  const original = game.messages.get(String(originalId));
  const roll = game.messages.get(String(rollId));
  const mark = original?.getFlag(SYS_ID, "contest");
  const attack = game.messages.get(String(mark?.attackId));
  const actor = fromUuidSync(roll?.system.actorUuid ?? "") ?? null;
  const replaces =
    Boolean(attack) &&
    roll?.type === "roll" &&
    [roll.system.honorRollOf, roll.system.rerollOf].includes(original.id) &&
    roll.system.actorUuid === original.system.actorUuid &&
    canActFor(user, actor);
  if (!replaces) {
    throw new Error("l5r4.ui.requests.notReplacement");
  }
  if (contestRollsOf(attack)[mark.side]?.id !== original.id) {
    await postReplacedTooLate(actor);
    return;
  }
  const before = getContestOutcome(attack);
  await roll.setFlag(SYS_ID, "contest", { attackId: attack.id, side: mark.side });
  if (before) {
    await updateContestOutcome(attack, before);
  }
}

/**
 * Settle a contest again after a roll replaced one of its sides': when the outcome changes, the Prone a Knockdown won
 * by the attacker gave is removed, and the new outcome is posted and applied as a first settling would.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {ChatMessage} attack - The attack message
 * @param {{winner: string|null, tie: boolean}} before - The outcome the original roll gave
 * @returns {Promise<void>}
 */
async function updateContestOutcome(attack, before) {
  const after = getContestOutcome(attack);
  if (after.tie === before.tie && after.winner === before.winner) {
    return;
  }
  const sides = {
    attacker: fromUuidSync(attack.system.actorUuid),
    target: fromUuidSync(attack.system.target.uuid)
  };
  if (before.winner === "attacker" && attack.system.maneuvers.knockdown) {
    const given = effectsOf(sides.target, "prone").filter(e => e.origin === attack.uuid);
    await sides.target.deleteEmbeddedDocuments(
      "ActiveEffect",
      given.map(e => e.id)
    );
  }
  await postContestResult(attack, sides);
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
