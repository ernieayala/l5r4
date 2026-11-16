/**
 * @module services/dice/check/card
 * @description The check card: a `roll` message's card rendered from its stored context alone, with the optional
 * Honor Roll it offers and the lines a hit's maneuvers add, and the "+2k1 +5" text of a modifier that the card and
 * the check dialog both show.
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/43_honor.md, p.92
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";

/**
 * Roll kinds the Honor Roll can re-roll: Skill, Trait, Ring, and Spell Casting rolls.
 * game-rules/43_honor.md, p.92
 */
const honorRollKinds = new Set(["skill", "attack", "trait", "ring", "spell", "maho"]);

/**
 * Whether a check's card offers the optional Honor Roll (roadmap/STAGE-11 decision 3): the world setting is on and
 * the roll failed, and it is not itself an Honor Roll. Whether the roller still has it this session is checked on the
 * click (module/services/dice/check/chat-actions.js, rollHonor).
 * game-rules/43_honor.md, p.92
 * @param {object} system - RollMessageData source
 * @returns {boolean}
 */
export function isHonorRollOffered(system) {
  return (
    game.settings.get(SYS_ID, "honorRoll") &&
    system.outcome.success === false &&
    honorRollKinds.has(system.kind) &&
    !system.honorRollOf
  );
}

/**
 * Render a check's card from its stored context.
 * @param {object} system - RollMessageData source
 * @param {Roll} roll
 * @param {{actorId?: string}} [extra] - The roller's id
 * @returns {Promise<string>}
 */
export async function renderCheckCard(system, roll, { actorId = "" } = {}) {
  const success = system.outcome.success;
  const isAttack = system.kind === "attack";
  const hit = isAttack && success === true;
  const maneuvers = system.maneuvers ?? {};
  const missed = isAttack ? "l5r4.ui.mechanics.rolls.missed" : "l5r4.ui.mechanics.rolls.failure";
  return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.checkCard, {
    ...system,
    tn: system.tn.effective === null ? null : system.tn,
    freeRaisesLeft: system.tn.freeRaises - system.tn.freeRaisesToTN,
    outcomeText: T(success ? "l5r4.ui.mechanics.rolls.success" : missed),
    appliedModifiers: system.modifiers
      .filter(m => m.enabled && (m.roll || m.keep || m.total))
      .map(m => ({ label: m.label, text: formatModifier(m) })),
    roll: await roll.render(),
    damageButton: hit && !maneuvers.grapple ? (system.damage?.label ?? "") : "",
    maneuverNotes: hit ? formatManeuverNotes(maneuvers) : [],
    contest: hit && Boolean(system.target?.uuid) && (maneuvers.knockdown || maneuvers.disarm),
    grappleButton: hit && Boolean(system.target?.uuid) && maneuvers.grapple,
    applyTarget: system.kind === "damage" ? system.target?.name : "",
    honorRoll: isHonorRollOffered(system),
    actorId
  });
}

/**
 * The "+2k1 +5"-style text for a modifier.
 * @param {{roll?: number, keep?: number, total?: number}} modifier
 * @returns {string}
 */
export function formatModifier({ roll = 0, keep = 0, total = 0 }) {
  const parts = [];
  if (roll || keep) {
    parts.push(`${roll >= 0 ? "+" : ""}${roll}k${keep}`);
  }
  if (total) {
    parts.push(`${total > 0 ? "+" : ""}${total}`);
  }
  return parts.join(" ");
}

/**
 * The lines a hit's maneuvers add to its card: what each did, and the Contested Strength roll Knockdown and Disarm
 * call for. A Called Shot's effect is the GM's (STAGE-10 decision 1).
 * game-rules/38_maneuvers.md, p.86-87
 * @param {object} maneuvers
 * @returns {string[]}
 */
function formatManeuverNotes(maneuvers) {
  const notes = [];
  if (maneuvers.calledShot) {
    notes.push(
      F("l5r4.ui.combat.calledShotNote", {
        raises: maneuvers.calledShot,
        location: maneuvers.location || T("l5r4.ui.combat.calledShotUnnamed")
      })
    );
  }
  if (maneuvers.feint) {
    notes.push(T("l5r4.ui.combat.feintNote"));
  }
  if (maneuvers.increasedDamage) {
    notes.push(F("l5r4.ui.combat.increasedDamageNote", { dice: maneuvers.increasedDamage }));
  }
  if (maneuvers.knockdown) {
    notes.push(T("l5r4.ui.combat.knockdownNote"));
  }
  if (maneuvers.disarm) {
    notes.push(T("l5r4.ui.combat.disarmNote"));
  }
  if (maneuvers.extraAttack) {
    notes.push(T("l5r4.ui.combat.extraAttackNote"));
  }
  return notes;
}
