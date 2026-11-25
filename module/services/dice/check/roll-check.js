/**
 * @module services/dice/check/roll-check
 * @description L5R4Check: the one roll pipeline (roadmap/STAGE-08-ROLL-PIPELINE.md). A check names what it rolls;
 * the pipeline gathers its modifiers (collect.js), offers every choice the rules leave to the roller in one dialog
 * (dialog.js, AUTOMATION.md §4), settles the terms those choices set (terms.js), spends its Void Points, builds the
 * pool with the Ten Dice Rule last, rolls, compares with the TN, and posts a `roll` ChatMessage holding the whole
 * context (message-data.js).
 *
 * The rules it applies: Roll & Keep, the Ten Dice Rule and exploding dice, Void Points (never on damage), Raises and
 * Free Raises, Unskilled Rolls, wound penalties on the TN (roadmap/STAGE-08 decision 2), Emphases, and Embracing
 * the Taint. The posted card renders through card.js.
 * game-rules/23_roll_and_keep.md, p.75
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/26_special_dice_rules.md, p.77
 * game-rules/28_raises.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/33_wounds.md, p.82
 * game-rules/58_skills_overview.md, p.133
 * game-rules/89_shadowlands_taint.md, p.279
 */

import { SYS_ID } from "../../../config/constants.js";
import { F, T } from "../../../utils/localization.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import { toInt } from "../../../utils/type-coercion.js";
import { buildPool, getCheckResult, getPoolFormula } from "../../../utils/check.js";
import { askGmAllow } from "../../gm-allow.js";
import { spendVoidPoint } from "../resources/void-points.js";
import { applyTrackChange } from "../../ledger.js";
import { renderCheckCard } from "./card.js";
import { askCheckChoices } from "./dialog.js";
import {
  formatLabelWithSuffix,
  buildCheckLabel,
  buildCheckSystem,
  buildTnModifiers,
  getCheckTn
} from "./message-data.js";
import { buildCheck, buildChosenTerms, buildPreparedTerms, getManeuverPayment } from "./terms.js";

/**
 * What a caller asks the pipeline to roll.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @typedef {object} CheckRequest
 * @property {Actor} actor
 * @property {string} kind               skill, trait, ring, spell, maho, attack, damage, or roll
 * @property {string} label              Card and dialog title
 * @property {{roll: number, keep: number, bonus?: number}} base  The pool before modifiers
 * @property {string} [skill]            Skill name in lower case, for selectors
 * @property {string} [trait]            Trait key in the pool, for selectors and substitutions
 * @property {string} [ring]             Ring key, for selectors
 * @property {boolean} [unskilled=false] An Unskilled Roll
 * @property {string[]} [emphases=[]]    Trained Emphases offered
 * @property {number} [tn]               Default TN; an attack defaults to a single target's Armor TN
 * @property {number} [explode=10]       Explode threshold (a weapon's "Explodes on")
 * @property {CheckModifierInput[]} [modifiers=[]] Extra modifiers from the caller (Increased Damage, Raises)
 * @property {Item} [weapon]             Weapon of an attack or damage roll: its own rules apply
 * @property {Actor|null} [target]       The target; without it, the user's single target for an attack
 * @property {string[]} [options=[]]     Roll options the caller adds for predicates (a duel stage: `duel:focus`)
 * @property {number} [freeRaises=0]     Free Raises the caller grants before the dialog, offered with those of rules
 *   (a duel's Focus winner)
 * @property {{label: string, roll: number, keep: number, bonus?: number, explode?: number|null}} [damage]
 *   An attack's damage pool, stored on its message for the damage button
 * @property {string} [attackOf]         The attack message a damage roll belongs to
 * @property {boolean} [ranged=false]    An attack starts as ranged
 * @property {boolean} [askForOptions=true] Show the dialog; without it every default applies
 * @property {{template: string, data: object, bind?: function(HTMLFormElement): void}} [extras] Extra dialog fields
 *   for the caller, and what wires their live parts once the dialog renders (a Ring Roll's School Rank check)
 * @property {function(object): Promise<object|null>} [prepare] Runs on the dialog's choices before the roll; may
 *   add `labelSuffix`, `modifiers`, `freeRaises` and the `freeRaisesToTn` of them spent on the TN, or return null
 *   to stop
 * @property {function(): Promise<void>} [cancel] Runs when the check stops after `prepare` went through and before
 *   the roll (a spell slot `prepare` took is given back)
 * @property {function({success: boolean|null, total: number}): Promise<{labelSuffix?: string}>} [beforePost]
 *   Runs once the roll is evaluated, before the card posts (a spell's Taint)
 * @property {function(ChatMessage, object): Promise<void>} [after] Runs on the posted message
 */

/**
 * @typedef {object} CheckModifierInput
 * @property {string} label
 * @property {number} [roll=0]
 * @property {number} [keep=0]
 * @property {number} [total=0]
 * @property {boolean} [enabled=true]
 */

/**
 * Roll a check through the pipeline and post its card. The steps run in order: ask for the check's terms, spend its
 * Void Points, roll its pool, and post its card; then a used modifier that consumes its effect ends it, and the
 * request's `after` runs on the message. A check that stops after the request's `prepare` runs its `cancel`.
 *
 * @param {CheckRequest} request
 * @returns {Promise<ChatMessage|null>} The posted message, or null when the roller cancels or the roll cannot be made
 */
export async function rollCheck(request) {
  const asked = await askCheck(request);
  if (!asked) {
    return null;
  }
  const { check, choices, terms } = asked;
  if (!(await spendCheckVoidPoints(check.actor, terms))) {
    await request.cancel?.();
    return null;
  }
  const rolled = await rollCheckPool(check, terms);
  const message = await postCheck(check, terms, rolled);
  await deleteConsumedEffects(terms.applied);
  if (request.after) {
    await request.after(message, choices);
  }
  return message;
}

/**
 * Settle what the check rolls, in order: the weapon's Strength check, the check's terms before the dialog, the
 * roller's choices, the terms they set, the caller's preparation, and whether the Raises pay for the attack's
 * maneuvers.
 * @param {CheckRequest} request
 * @returns {Promise<{check: object, choices: object, terms: object}|null>} Null when the roller cancels or the roll
 *   cannot be made
 */
async function askCheck(request) {
  if (!(await canWieldWeapon(request))) {
    return null;
  }
  const check = buildCheck(request);
  const choices = request.askForOptions === false ? {} : await askCheckChoices(check);
  if (!choices) {
    return null;
  }
  const chosen = buildChosenTerms(check, choices);
  const prepared = request.prepare ? await request.prepare(choices) : {};
  if (prepared === null) {
    return null;
  }
  const terms = { ...chosen, ...buildPreparedTerms(chosen, prepared) };
  const payment = getManeuverPayment(check, choices, terms);
  // Maneuvers the Raises do not pay for are the GM's call (#223): allowed in the dialog already, or asked here for a
  // roll made without it
  const unpaid = payment && !payment.affordable && choices.gmAllowed !== "1";
  if (unpaid && !(await askUnpaidManeuvers(check, terms, payment))) {
    await request.cancel?.();
    return null;
  }
  terms.maneuvers = payment?.maneuvers ?? null;
  return { check, choices, terms };
}

/**
 * Ask the GM to allow maneuvers the attack's Raises do not pay for (#223).
 * game-rules/38_maneuvers.md, p.86-87
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms
 * @param {{cost: number}} payment - From getManeuverPayment
 * @returns {Promise<boolean>} Whether the attack rolls
 */
function askUnpaidManeuvers(check, terms, payment) {
  return askGmAllow({
    title: check.request.label,
    reason: F("l5r4.ui.combat.notEnoughRaises", { cost: payment.cost, raises: terms.raises }),
    ask: T("l5r4.ui.requests.allowRequest")
  });
}

/**
 * Whether the actor may attack with the request's weapon: a weapon needing more Strength than its wielder has cannot
 * be used, though the GM may allow it, so the GM is asked. Every roll but an attack may.
 * game-rules/74_weapons.md, p.199
 * @param {CheckRequest} request
 * @returns {Promise<boolean>}
 */
async function canWieldWeapon({ actor, kind, weapon }) {
  const minStrength = kind === "attack" ? toInt(weapon?.system.minStrength) : 0;
  if (minStrength <= getEffectiveTrait(actor, "str")) {
    return true;
  }
  return askGmAllow({
    title: weapon.name,
    reason: F("l5r4.equipment.weapons.belowMinStrength", {
      name: actor.name,
      min: minStrength,
      weapon: weapon.name
    }),
    ask: T("l5r4.equipment.weapons.belowMinStrengthGM")
  });
}

/**
 * Spend the check's Void Points: one on the roll, one on the Skill's rank; each Void Point use is its own point, and
 * all of them are taken together or none is.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {Actor} actor
 * @param {object} terms - The chosen terms
 * @returns {Promise<boolean>} False, after a warning, when the points cannot be spent
 */
async function spendCheckVoidPoints(actor, terms) {
  const count = Number(terms.voidPoint) + Number(terms.voidSkill);
  if (!count) {
    return true;
  }
  const spent = await spendVoidPoint(actor, count);
  if (!spent.success) {
    ui.notifications?.warn(spent.message);
  }
  return spent.success;
}

/**
 * Build the pool with the Ten Dice Rule last and roll it. Embracing the Taint costs its point once the roll is made.
 * game-rules/89_shadowlands_taint.md, p.279
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms
 * @returns {Promise<{pool: object, roll: Roll}>}
 */
async function rollCheckPool(check, terms) {
  const { request, ctx, basePool, actor } = check;
  const littleTruths = game.settings.get(SYS_ID, "LtException");
  const pool = buildPool({
    ...basePool,
    modifiers: terms.applied,
    voidPoint: terms.voidPoint,
    unskilled: terms.rolledUnskilled,
    // A weapon whose dice never explode stays so; otherwise the lowest threshold wins
    // game-rules/74_weapons.md, p.202
    explode: request.explode === null ? null : Math.min(request.explode ?? 10, ctx.explode ?? 10),
    rerollOnes: Boolean(terms.emphasis) || ctx.rerollOnes,
    keepOverride: terms.keepOverride,
    littleTruths
  });
  const roll = new foundry.dice.Roll(getPoolFormula(pool));
  await roll.evaluate();
  if (terms.embrace) {
    await applyTrackChange(actor, "taint", { points: 1, reason: T("l5r4.ui.taint.embraceReason") });
  }
  return { pool, roll };
}

/**
 * Compare the roll with its TN, finish its label (the request's `beforePost` may add to it), and post its card.
 * @param {object} check - From buildCheck
 * @param {object} terms - The chosen and prepared terms, with the maneuvers
 * @param {{pool: object, roll: Roll}} rolled - From rollCheckPool
 * @returns {Promise<ChatMessage>}
 */
async function postCheck(check, terms, { pool, roll }) {
  const { request, actor } = check;
  const tnModifiers = buildTnModifiers(check, terms);
  const tn = getCheckTn(check, terms, tnModifiers);
  const outcome = getCheckResult(roll.total, tn);
  let label = buildCheckLabel(request.label, terms);
  if (request.beforePost) {
    const post = await request.beforePost({ success: outcome?.success ?? null, total: roll.total });
    label = formatLabelWithSuffix(label, post?.labelSuffix);
  }
  const system = buildCheckSystem(check, terms, { pool, roll, tn, tnModifiers, outcome, label });
  const content = await renderCheckCard(system, roll, { actorId: actor.id });
  return roll.toMessage({
    type: "roll",
    system,
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });
}

/**
 * End the effect each used modifier that `consumes` it carries (Center Stance's bonus).
 * game-rules/36_stances.md, p.84
 * @param {object[]} applied - The modifiers the roll applied
 * @returns {Promise<void>}
 */
async function deleteConsumedEffects(applied) {
  const consumed = new Set(applied.filter(m => m.enabled && m.consumes).map(m => m.consumes));
  for (const uuid of consumed) {
    await (await fromUuid(uuid))?.delete();
  }
}
