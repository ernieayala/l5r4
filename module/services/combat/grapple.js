/**
 * @module services/combat/grapple
 * @description A grapple as a guided card (Core Rulebook pp.88-89). A hit with the Grapple maneuver (Jiujutsu /
 * Agility, ignoring armor in the Armor TN) starts it from the attack card: both sides are Grappled and the attacker
 * is in control. Control is re-rolled as a Contested Skill / Strength Roll, where the attacker uses the Skill the
 * grapple began with (Jiujutsu, or a weapon's Skill, p.89) and the defender Jiujutsu. The one in control may:
 * - Hit: unarmed damage (Strength k1, p.80), or the weapon's damage for a weapon grapple, as a damage roll against
 *   the other side;
 * - Throw: the other side falls Prone and the grapple ends;
 * - Break: the grapple ends;
 * - Pass: keep control.
 * A weapon grappler who loses control gives the opponent two Free Raises for a Disarm next Turn (p.89); the card
 * says so.
 */

import { CHAT_TEMPLATES } from "../../config/templates.js";
import { T, F } from "../../utils/localization.js";
import { contest } from "../../utils/check.js";
import { getEffectiveTrait } from "../../utils/mechanics.js";
import { rollCheck } from "../dice/check/roll-check.js";
import { applyEffectAnywhere, effectsOf } from "../effects/apply.js";
import { defineFlow, mayActFor, skillRequest, startFlow } from "./flow.js";

/** The grapple statuses both sides carry (p.89). */
const GRAPPLED = "grappled";

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
async function release(sides) {
  for (const actor of sides) {
    for (const effect of effectsOf(actor, GRAPPLED)) {
      await effect.delete();
    }
  }
}

/**
 * Roll a side's control roll (p.88).
 * @param {object} state
 * @param {number} i
 * @returns {Promise<ChatMessage|null>}
 */
function rollControl(state, i) {
  const [actor, opponent] = i === 0 ? sidesOf(state) : sidesOf(state).reverse();
  return rollCheck({
    ...skillRequest(actor, i === 0 ? state.skill : "jiujutsu", "str"),
    kind: "skill",
    label: `${T("l5r4.ui.combat.grapple.control")}: ${actor.name}`,
    target: opponent
  });
}

/**
 * Roll the controller's Hit: unarmed damage (Strength k1, p.80) or the grappling weapon's damage (p.89), with no
 * Raises (p.88).
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
    label: `${T("l5r4.ui.combat.grapple.hit")}: ${weapon?.label ?? T("l5r4.ui.combat.unarmed")}`,
    base: weapon
      ? { roll: weapon.roll, keep: weapon.keep, bonus: weapon.bonus }
      : { roll: strength, keep: 1 },
    explode: weapon?.explode ?? 10,
    target: other
  });
}

defineFlow("grapple", {
  /**
   * A button on the grapple card, on the clicking client.
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {DOMStringMap} dataset
   * @returns {Promise<object|null>}
   */
  async click(_card, state, dataset) {
    const action = dataset.flowAction;
    const i = action === "control" ? Number(dataset.side) : state.control;
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
   * @param {ChatMessage} _card
   * @param {object} state
   * @param {object} data
   * @param {User} user
   * @returns {Promise<object>}
   */
  async step(_card, state, data, user) {
    const sides = sidesOf(state);
    if (state.over) {
      throw new Error("The grapple is over");
    }
    if (data.action === "control") {
      const i = Number(data.side);
      const roll = game.messages.get(String(data.rollId));
      if (
        ![0, 1].includes(i) ||
        !mayActFor(user, sides[i]) ||
        roll?.system.actorUuid !== sides[i].uuid
      ) {
        throw new Error("Not this user's side or roll");
      }
      state.rolls[i] = roll.system.outcome.total;
      if (state.rolls.every(total => total !== null)) {
        const result = contest(state.rolls.map((total, side) => ({ id: String(side), total })));
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
      return state;
    }
    const controller = sides[state.control];
    const other = sides[1 - state.control];
    if (!mayActFor(user, controller)) {
      throw new Error("Only the side in control acts");
    }
    if (data.action === "hit") {
      const roll = game.messages.get(String(data.rollId));
      if (roll?.system.actorUuid !== controller.uuid || roll.system.kind !== "damage") {
        throw new Error("Not the controller's damage roll");
      }
      state.log.push(
        F("l5r4.ui.combat.grapple.hitLog", {
          name: controller.name,
          total: roll.system.outcome.total
        })
      );
    } else if (data.action === "throw") {
      await release(sides);
      if (!other.statuses.has("prone")) {
        await applyEffectAnywhere(other, "prone");
      }
      state.log.push(F("l5r4.ui.combat.grapple.thrown", { name: other.name }));
      state.over = true;
    } else if (data.action === "break") {
      await release(sides);
      state.log.push(F("l5r4.ui.combat.grapple.broken", { name: controller.name }));
      state.over = true;
    } else if (data.action === "pass") {
      state.log.push(F("l5r4.ui.combat.grapple.passed", { name: controller.name }));
    } else {
      throw new Error(`Unknown grapple action ${data.action}`);
    }
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
      title: `${T("l5r4.ui.combat.grapple.title")}: ${names.join(" / ")}`,
      stage: state.over
        ? T("l5r4.ui.combat.grapple.over")
        : F("l5r4.ui.combat.grapple.inControl", { name: names[state.control] }),
      lines: state.log.slice(-6),
      buttons
    });
  }
});

/**
 * Start a grapple from a hit with the Grapple maneuver: both sides become Grappled, the attacker in control.
 * @param {ChatMessage} attack  The attack message
 * @returns {Promise<ChatMessage|null>}
 */
export async function startGrapple(attack) {
  const attacker = fromUuidSync(attack.system.actorUuid);
  const target = fromUuidSync(attack.system.target.uuid);
  if (!attacker?.isOwner || !target) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermission"));
    return null;
  }
  for (const actor of [attacker, target]) {
    if (!actor.statuses.has(GRAPPLED)) {
      await applyEffectAnywhere(actor, GRAPPLED);
    }
  }
  // A grapple begun with a Weapon Skill is a weapon grapple (p.89); an "Unarmed" item rolled with Jiujutsu is not
  const skill = attack.system.skill || "jiujutsu";
  const weapon = skill !== "jiujutsu" && attack.system.weaponUuid ? attack.system.damage : null;
  return startFlow(
    "grapple",
    {
      sides: [attacker.uuid, target.uuid],
      skill,
      weapon: weapon?.label ? { ...weapon } : null,
      control: 0,
      rolls: [null, null],
      log: [F("l5r4.ui.combat.grapple.inControl", { name: attacker.name })],
      over: false
    },
    attacker
  );
}
