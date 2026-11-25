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
import { toInt } from "../../../utils/type-coercion.js";

/**
 * Roll kinds the Honor Roll can re-roll: Skill, Trait, Ring, and Spell Casting rolls.
 * game-rules/43_honor.md, p.92
 */
const honorRollKinds = new Set(["skill", "attack", "trait", "ring", "spell", "maho"]);

/**
 * Whether a check's card offers the optional Honor Roll (roadmap/STAGE-11 decision 3): the world setting is on and
 * the roll failed, and it is not itself an Honor Roll. Whether the roller still has it this session is checked on the
 * click (module/services/dice/check/honor-roll.js, rollHonor).
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
 * Whether the roller has an Honor Rank to call on for an Honor Roll: a character at Rank 0 has none, and an NPC has
 * no Honor at all. The card shows no button the roller could never use (#107).
 * game-rules/43_honor.md, p.92
 * @param {Actor|null|undefined} actor - The roller
 * @returns {boolean}
 */
export function hasHonorToCall(actor) {
  return toInt(actor?.system.honor?.rank) >= 1;
}

/**
 * What a check card's buttons have started, kept in its message's `flags.l5r4-enhanced.used` so the card shows it
 * (#140).
 * @typedef {object} CardUse
 * @property {string} [damage]          The damage roll a hit's button posted
 * @property {{uuid: string, name: string, wounds: number, resultId: string}[]} [applied] Actors a damage roll was
 *   applied to, with the Wounds each took and its result card
 * @property {number[]} [conditions]    Indexes of the offered conditions applied to the target
 * @property {string} [grapple]         The grapple card the hit started
 */

/**
 * Render a check's card from its stored context and what its buttons have started.
 * @param {object} system - RollMessageData source
 * @param {Roll} roll
 * @param {{actorId?: string, used?: CardUse}} [extra] - The roller's id, and the card's use so far
 * @returns {Promise<string>}
 */
export async function renderCheckCard(system, roll, { actorId = "", used = {} } = {}) {
  const success = system.outcome.success;
  const isAttack = system.kind === "attack";
  const hit = isAttack && success === true;
  const maneuvers = system.maneuvers ?? {};
  const missed = isAttack ? "l5r4.ui.mechanics.rolls.missed" : "l5r4.ui.mechanics.rolls.failure";
  return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.checkCard, {
    ...system,
    ...buildUseContext(system, used),
    tn: system.tn.effective === null ? null : system.tn,
    raisesText: formatRaisesNote(system),
    // A roll with no TN still shows the Raises a Contested Roll will count
    raisesWithoutTn: system.tn.effective === null ? system.tn.raises : 0,
    tnChanges: system.tn.modifiers?.length
      ? F("l5r4.ui.check.tnChangesNote", { changes: formatTnChanges(system.tn.modifiers) })
      : "",
    freeRaisesLeft: system.tn.freeRaises - system.tn.freeRaisesToTN,
    outcomeText: T(success ? "l5r4.ui.mechanics.rolls.success" : missed),
    appliedModifiers: system.modifiers
      .filter(m => m.enabled && (m.roll || m.keep || m.total))
      .map(m => ({ label: m.label, text: formatModifier(m) })),
    roll: await roll.render(),
    damageButton: hit && !maneuvers.grapple ? (system.damage?.label ?? "") : "",
    maneuverNotes: hit ? formatManeuverNotes(maneuvers) : formatMissedManeuvers(maneuvers),
    contest: hit && Boolean(system.target?.uuid) && (maneuvers.knockdown || maneuvers.disarm),
    grappleButton: hit && Boolean(system.target?.uuid) && maneuvers.grapple,
    applyTarget: system.kind === "damage" ? system.target?.name : "",
    honorRoll: isHonorRollOffered(system) && hasHonorToCall(game.actors.get(actorId)),
    actorId
  });
}

/**
 * Record what a check card's button started and render the card again to show it, in one update. Only the card's
 * author or a GM may change a message; a click by anyone else changes the game but leaves the card as it was.
 * @param {ChatMessage} message - A `roll` message
 * @param {CardUse} change - What to add to the card's use
 * @returns {Promise<void>}
 */
export async function updateCheckCardUse(message, change) {
  if (!message.canUserModify(game.user, "update")) {
    return;
  }
  const used = { ...(message.getFlag(SYS_ID, "used") ?? {}), ...change };
  const actorId = fromUuidSync(message.system.actorUuid)?.id ?? "";
  const content = await renderCheckCard(message.system.toObject(), message.rolls[0], {
    actorId,
    used
  });
  await message.update({ content, [`flags.${SYS_ID}.used`]: used });
}

/**
 * A roll's TN changes as one line, "Fatigued +5, Armor Piercing arrow ignores armor -12": the check dialog's TN hint,
 * and inside the card's TN note (decision 17, #115).
 * @param {{label: string, value: number}[]} changes
 * @returns {string}
 */
export function formatTnChanges(changes) {
  return changes.map(c => `${c.label} ${formatModifier({ total: c.value })}`).join(", ");
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
 * What the card shows of its use, as record lines: that the hit's damage was rolled, whom a damage roll was applied
 * to, which offered conditions were applied, and that the grapple started. The buttons stay as they are, so each can
 * be pressed again, as PF2e's damage buttons can (#223).
 * @param {object} system - RollMessageData source
 * @param {CardUse} used
 * @returns {object} Template context
 */
function buildUseContext(system, used) {
  const applied = used.applied ?? [];
  return {
    damageRolled: Boolean(used.damage),
    appliedNotes: applied.map(a =>
      F("l5r4.ui.combat.appliedTo", { name: a.name, wounds: a.wounds })
    ),
    conditions: (system.conditions ?? []).map((condition, index) => ({
      ...condition,
      applied: (used.conditions ?? []).includes(index)
    })),
    grappleStarted: Boolean(used.grapple)
  };
}

/**
 * The card's Raises line: for an attack, what its declared Raises paid for, maneuvers or Increased Damage (#136);
 * for any other roll with a TN, the count. Empty with no Raises or no TN.
 * game-rules/38_maneuvers.md, p.87
 * @param {object} system - RollMessageData source
 * @returns {string}
 */
function formatRaisesNote(system) {
  const count = system.tn.raises;
  if (!count || system.tn.effective === null) {
    return "";
  }
  if (system.kind !== "attack") {
    return F("l5r4.ui.check.raisesNote", { count });
  }
  const damage = system.maneuvers.increasedDamage;
  return F("l5r4.ui.check.raisesAttackNote", { count, maneuvers: count - damage, damage });
}

/**
 * The line a missed attack's card shows for the maneuvers it declared: they failed with it (#136). None when it
 * declared none, and on any roll that is not an attack.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {object} maneuvers
 * @returns {string[]}
 */
function formatMissedManeuvers(maneuvers) {
  const declared = [];
  if (maneuvers.calledShot) {
    declared.push(
      F("l5r4.ui.combat.calledShotDeclared", {
        raises: maneuvers.calledShot,
        location: maneuvers.location || T("l5r4.ui.combat.calledShotUnnamed")
      })
    );
  }
  for (const key of ["feint", "knockdown", "disarm", "extraAttack"]) {
    if (maneuvers[key]) {
      declared.push(T(`l5r4.ui.ruleSummary.maneuver.${key}`));
    }
  }
  if (maneuvers.grapple) {
    declared.push(T("l5r4.ui.combat.grapple.title"));
  }
  return declared.length
    ? [F("l5r4.ui.combat.maneuversMissed", { maneuvers: declared.join(", ") })]
    : [];
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
