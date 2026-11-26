/**
 * @module services/combat/grapple
 * @description A grapple as a guided card. A hit with the Grapple maneuver (Jiujutsu / Agility, ignoring armor in
 * the Armor TN) starts it from the attack card (grapple-start.js): both sides are Grappled and the attacker is in
 * control. Control is
 * re-rolled as a Contested Skill / Strength Roll, where the attacker uses the Skill the grapple began with
 * (Jiujutsu, or a weapon's Skill) and the defender Jiujutsu. The one in control may:
 * - Hit: unarmed damage (Strength k1), or the weapon's damage for a weapon grapple, as a damage roll against the
 *   other side;
 * - Throw: the other side falls Prone and the grapple ends;
 * - Break: the grapple ends;
 * - Pass: keep control.
 * A weapon grappler who loses control gives the opponent two Free Raises for a Disarm next Turn; the card says so.
 * game-rules/40_grappling.md, p.88-89
 * game-rules/29_types_of_rolls.md, p.80
 */

import { CHAT_TEMPLATES } from "../../config/templates.js";
import { T, F } from "../../utils/localization.js";
import { getContestResult } from "../../utils/check.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { applyEffect, effectsOf } from "../effects/apply.js";
import { registerFlow, canActFor, buildSkillRequest, getFreshRoll } from "./flow.js";

/**
 * The grapple status both sides carry.
 * game-rules/40_grappling.md, p.89
 */
export const GRAPPLED = "grappled";

/**
 * The two sides of a grapple.
 * @param {object} state
 * @returns {Actor[]}
 */
function sidesOf(state) {
  return state.sides.map(uuid => fromUuidSync(uuid));
}

/**
 * End the grapple: both sides lose Grappled.
 * @param {Actor[]} sides
 * @returns {Promise<void>}
 */
async function endGrapple(sides) {
  for (const actor of sides) {
    for (const effect of effectsOf(actor, GRAPPLED)) {
      await effect.delete();
    }
  }
}

/**
 * Roll a side's control roll.
 * game-rules/40_grappling.md, p.88
 * @param {object} state
 * @param {number} i
 * @returns {Promise<ChatMessage|null>}
 */
function rollControl(state, i) {
  const [actor, opponent] = i === 0 ? sidesOf(state) : sidesOf(state).reverse();
  return rollCheck({
    ...buildSkillRequest(actor, i === 0 ? state.skill : "jiujutsu", "str"),
    kind: "skill",
    label: F("l5r4.ui.combat.grapple.controlLabel", { name: actor.name }),
    target: opponent
  });
}

/**
 * Roll the controller's Hit: unarmed damage (Strength k1) or the grappling weapon's damage, with no Raises.
 * game-rules/29_types_of_rolls.md, p.80
 * game-rules/40_grappling.md, p.88-89
 * @param {object} state
 * @returns {Promise<ChatMessage|null>}
 */
function rollHit(state) {
  const [actor, other] = state.control === 0 ? sidesOf(state) : sidesOf(state).reverse();
  const weapon = state.control === 0 ? state.weapon : null;
  const strength = getEffectiveTrait(actor, "str");
  return rollCheck({
    actor,
    kind: "damage",
    label: F("l5r4.ui.combat.grapple.hitLabel", {
      weapon: weapon?.label ?? T("l5r4.ui.combat.unarmed")
    }),
    base: weapon
      ? { roll: weapon.roll, keep: weapon.keep, bonus: weapon.bonus }
      : { roll: strength, keep: 1 },
    explode: weapon?.explode ?? 10,
    target: other
  });
}

/**
 * Record a side's control roll in the state, after checking the side and the roll are the user's; once both sides
 * have rolled, settle the Contested Roll.
 * game-rules/40_grappling.md, p.88
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 * @param {{card: ChatMessage, data: object, user: User}} step - The grapple card, the step the clicking client sent,
 *   and the requesting user
 */
function applyControlRoll(state, sides, { card, data, user }) {
  const i = Number(data.side);
  // An empty slot only: a side rolls control once until both have (#162)
  if (![0, 1].includes(i) || !canActFor(user, sides[i]) || state.rolls[i] !== null) {
    throw new Error("l5r4.ui.requests.notYourSide");
  }
  const roll = getFreshRoll(card, state, {
    rollId: data.rollId,
    actor: sides[i],
    kinds: ["skill"]
  });
  state.rolls[i] = { total: roll.system.outcome.total, raises: roll.system.tn.raises };
  if (state.rolls.every(entry => entry !== null)) {
    applyControlContest(state, sides);
  }
}

/**
 * Settle the control rolls as a Contested Roll: a tie changes nothing, otherwise the winner takes control, and a
 * weapon grappler who loses it is told the opponent gains Free Raises for a Disarm. The rolls are cleared.
 * game-rules/40_grappling.md, p.88-89
 * game-rules/29_types_of_rolls.md, p.80
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 */
function applyControlContest(state, sides) {
  // Each side's declared Raises count (#166); a card from 4.0.0 stored a control roll as its bare total
  const result = getContestResult(
    state.rolls.map((entry, side) => ({
      id: String(side),
      total: typeof entry === "number" ? entry : entry.total,
      raises: typeof entry === "number" ? 0 : entry.raises
    }))
  );
  if (result.tie) {
    state.log.push(T("l5r4.ui.check.contestTie"));
  } else {
    const winner = Number(result.winner);
    if (state.weapon && state.control === 0 && winner === 1) {
      state.log.push(F("l5r4.ui.combat.grapple.weaponLost", { name: sides[1].name }));
    }
    state.control = winner;
    state.log.push(F("l5r4.ui.combat.grapple.inControl", { name: sides[winner].name }));
  }
  state.rolls = [null, null];
}

/**
 * Apply the controller's action, after checking the user acts for the side in control: a Hit's damage roll is
 * logged, a Throw knocks the other side Prone and ends the grapple, a Break ends it, a Pass keeps control.
 * game-rules/40_grappling.md, p.88-89
 * @param {object} state - The grapple's state, changed in place
 * @param {Actor[]} sides - The two sides
 * @param {{card: ChatMessage, data: object, user: User}} step - The grapple card, the step the clicking client sent,
 *   and the requesting user
 * @returns {Promise<void>}
 */
async function applyControllerAction(state, sides, { card, data, user }) {
  const controller = sides[state.control];
  const other = sides[1 - state.control];
  if (!canActFor(user, controller)) {
    throw new Error("l5r4.ui.requests.onlyController");
  }
  if (data.action === "hit") {
    const hit = { rollId: data.rollId, actor: controller, kinds: ["damage"] };
    const total = getFreshRoll(card, state, hit).system.outcome.total;
    state.log.push(F("l5r4.ui.combat.grapple.hitLog", { name: controller.name, total }));
  } else if (data.action === "throw") {
    await endGrapple(sides);
    if (!other.statuses.has("prone")) {
      await applyEffect(other, "prone");
    }
    state.log.push(F("l5r4.ui.combat.grapple.thrown", { name: other.name }));
    state.over = true;
  } else if (data.action === "break") {
    await endGrapple(sides);
    state.log.push(F("l5r4.ui.combat.grapple.broken", { name: controller.name }));
    state.over = true;
  } else if (data.action === "pass") {
    state.log.push(F("l5r4.ui.combat.grapple.passed", { name: controller.name }));
  } else {
    throw new Error("l5r4.ui.requests.unknownAction");
  }
}

/**
 * The side a grapple button acts for: its own side for a control roll, the side in control for the rest.
 * @param {object} state
 * @param {DOMStringMap} dataset
 * @returns {number}
 */
function buttonSideOf(state, dataset) {
  return dataset.flowAction === "control" ? Number(dataset.side) : state.control;
}

registerFlow("grapple", {
  /**
   * The actor a grapple button acts for.
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Actor|null}
   */
  actorOf(state, dataset) {
    return sidesOf(state)[buttonSideOf(state, dataset)] ?? null;
  },

  /**
   * A button on the grapple card, on the clicking client.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {{dataset: DOMStringMap}} press - The button pressed
   * @returns {Promise<object|null>}
   */
  async click(_card, state, { dataset }) {
    const action = dataset.flowAction;
    const i = buttonSideOf(state, dataset);
    if (!sidesOf(state)[i]?.isOwner) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
      return null;
    }
    if (action === "control") {
      const message = await rollControl(state, i);
      return message ? { action, side: i, rollId: message.id } : null;
    }
    if (action === "hit") {
      const message = await rollHit(state);
      return message ? { action, rollId: message.id } : null;
    }
    return { action };
  },

  /**
   * Record a step on the GM.
   * @param {object} state
   * @param {object} step
   * @param {ChatMessage} step.card - The grapple card
   * @param {object} step.data - The step the clicking client sent
   * @param {User} step.user - The requesting user
   * @returns {Promise<object>}
   */
  async step(state, { card, data, user }) {
    const sides = sidesOf(state);
    if (state.over) {
      throw new Error("l5r4.ui.requests.grappleOver");
    }
    if (data.action === "control") {
      applyControlRoll(state, sides, { card, data, user });
      return state;
    }
    await applyControllerAction(state, sides, { card, data, user });
    return state;
  },

  /**
   * The GM's Redo (#164): the control rolls in play are cleared, to be rolled again.
   * @param {object} state
   * @returns {object}
   */
  redo(state) {
    state.rolls = [null, null];
    return state;
  },

  /**
   * The GM's End (#164): the grapple ends and both sides lose Grappled, a side whose actor is gone skipped.
   * @param {object} state
   * @returns {Promise<object>}
   */
  async end(state) {
    await endGrapple(sidesOf(state).filter(Boolean));
    state.log.push(T("l5r4.ui.combat.grapple.endedByGm"));
    state.over = true;
    return state;
  },

  /**
   * The card's HTML.
   * @param {object} state
   * @returns {Promise<string>}
   */
  async render(state) {
    const sides = sidesOf(state);
    const names = sides.map(actor => actor?.name ?? "?");
    const buttons = [];
    if (!state.over) {
      names.forEach((name, i) => {
        if (state.rolls[i] === null) {
          buttons.push({
            action: "control",
            label: F("l5r4.ui.combat.grapple.rollControl", { name }),
            data: i
          });
        }
      });
      for (const action of ["hit", "throw", "break", "pass"]) {
        buttons.push({ action, label: T(`l5r4.ui.combat.grapple.${action}`), data: state.control });
      }
    }
    return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.flowCard, {
      title: F("l5r4.ui.combat.grapple.titleFor", { name: names[0], target: names[1] }),
      stage: state.over
        ? T("l5r4.ui.combat.grapple.over")
        : F("l5r4.ui.combat.grapple.inControl", { name: names[state.control] }),
      lines: state.log.slice(-6),
      buttons,
      gm: { redo: !state.over, end: !state.over }
    });
  }
});
