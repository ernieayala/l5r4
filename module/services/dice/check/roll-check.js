/**
 * @module services/dice/check/roll-check
 * @description L5R4Check: the one roll pipeline (roadmap/STAGE-08-ROLL-PIPELINE.md). A check names what it rolls;
 * the pipeline gathers its modifiers (collect.js), offers every choice the rules leave to the roller in one dialog
 * (AUTOMATION.md §4), settles the terms those choices set (terms.js), spends a Void Point, builds the pool with the
 * Ten Dice Rule last, rolls, compares with the TN, and posts a `roll` ChatMessage holding the whole context
 * (message-data.js).
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
import { DIALOG_TEMPLATES } from "../../../config/templates.js";
import { F, T } from "../../../utils/localization.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getStackedModifiers } from "../../../utils/modifier-stacking.js";
import { buildPool, getCheckResult, getPoolFormula, getTn } from "../../../utils/check.js";
import { askGmAllow } from "../../gm-allow.js";
import { spendVoidPoint } from "../resources/void-points.js";
import { applyTrackChange } from "../../ledger.js";
import { renderCheckCard } from "./card.js";
import {
  formatLabelWithSuffix,
  buildCheckLabel,
  buildCheckSystem,
  buildTnModifiers
} from "./message-data.js";
import {
  buildCheck,
  buildChosenTerms,
  buildDialogContext,
  buildPreparedTerms,
  getManeuverPayment
} from "./terms.js";

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
 * @property {{label: string, roll: number, keep: number, bonus?: number, explode?: number|null}} [damage]
 *   An attack's damage pool, stored on its message for the damage button
 * @property {string} [attackOf]         The attack message a damage roll belongs to
 * @property {boolean} [ranged=false]    An attack starts as ranged
 * @property {boolean} [askForOptions=true] Show the dialog; without it every default applies
 * @property {{template: string, data: object}} [extras] Extra dialog fields for the caller
 * @property {function(object): Promise<object|null>} [prepare] Runs on the dialog's choices before the roll; may
 *   add `labelSuffix`, `modifiers`, `freeRaises`, or return null to stop
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
  if (payment && !payment.affordable) {
    const { cost } = payment;
    ui.notifications?.warn(F("l5r4.ui.combat.notEnoughRaises", { cost, raises: terms.raises }));
    await request.cancel?.();
    return null;
  }
  terms.maneuvers = payment?.maneuvers ?? null;
  return { check, choices, terms };
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
 * Show the check dialog with the check's terms.
 * @param {object} check - From buildCheck
 * @returns {Promise<object|null>} The form's values, or null when the roller closes the dialog
 */
function askCheckChoices(check) {
  return askChoices(check.request, buildDialogContext(check));
}

/**
 * Spend the check's Void Points: one on the roll, one on the Skill's rank; each Void Point use is its own point.
 * game-rules/25_rings_and_traits.md, p.78
 * @param {Actor} actor
 * @param {object} terms - The chosen terms
 * @returns {Promise<boolean>} False, after a warning, when a point cannot be spent
 */
async function spendCheckVoidPoints(actor, terms) {
  const count = Number(terms.voidPoint) + Number(terms.voidSkill);
  for (let i = 0; i < count; i++) {
    const spent = await spendVoidPoint(actor);
    if (!spent.success) {
      ui.notifications?.warn(spent.message);
      return false;
    }
  }
  return true;
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
  const tn = check.isDamage
    ? null
    : getTn({
        base: terms.tnBase,
        raises: terms.raises,
        freeRaisesToTn: terms.freeRaisesToTn,
        woundPenalty: terms.applyWound ? check.woundPenalty : 0,
        // TN changes of one type do not stack, as on the sheet (module/utils/modifier-stacking.js)
        modifiers: [
          getStackedModifiers(tnModifiers.map(m => ({ total: m.value, type: m.type }))).total
        ]
      });
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

/**
 * Read the dialog's form into choices.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
function formDataOf(form) {
  return foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
}

/**
 * Show the check dialog.
 * @param {CheckRequest} request
 * @param {object} context - Dialog template context
 * @returns {Promise<object|null>} The form's values, or null when the roller closes the dialog
 */
async function askChoices(request, context) {
  // Each field's label points at its control by id; the ids are unique to this dialog
  const formId = foundry.utils.randomID();
  const extras = request.extras
    ? await foundry.applications.handlebars.renderTemplate(request.extras.template, {
        ...request.extras.data,
        formId
      })
    : "";
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.check, {
    ...context,
    formId,
    extras
  });
  return foundry.applications.api.DialogV2.prompt({
    window: { title: request.label },
    position: { width: 420 },
    content,
    ok: { label: T("l5r4.ui.common.roll"), callback: (_event, button) => formDataOf(button.form) },
    rejectClose: false,
    modal: true
  });
}
