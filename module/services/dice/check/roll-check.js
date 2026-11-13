/**
 * @module services/dice/check/roll-check
 * @description L5R4Check: the one roll pipeline (roadmap/STAGE-08-ROLL-PIPELINE.md). A check names what it rolls;
 * the pipeline gathers its modifiers (collect.js), offers every choice the rules leave to the roller in one dialog
 * (AUTOMATION.md §4), spends a Void Point, builds the pool with the Ten Dice Rule last, rolls, compares with the
 * TN, and posts a `roll` ChatMessage holding the whole context.
 *
 * Rules: Roll & Keep p.75, Ten Dice Rule and exploding dice p.77, Void Points p.78 (never on damage), Raises and
 * Free Raises p.79, Unskilled Rolls p.80, wound penalties on the TN p.82 (decision 2), Emphases p.133.
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES, DIALOG_TEMPLATES } from "../../../config/templates.js";
import { T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import {
  buildPool,
  evaluateCheck,
  maxRaises,
  poolFormula,
  targetNumber
} from "../../../utils/check.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { resolveTargets } from "../resources/target-resolver.js";
import { collectCheck } from "./collect.js";
import { voidOverLimit } from "../../effects/uses.js";

/**
 * @typedef {object} CheckRequest
 * @property {Actor} actor
 * @property {string} kind               skill, trait, ring, spell, maho, attack, damage, or roll
 * @property {string} label              Card and dialog title
 * @property {{roll: number, keep: number, bonus?: number}} base  The pool before modifiers
 * @property {string} [skill]            Skill name in lower case, for selectors
 * @property {string} [trait]            Trait key in the pool, for selectors and substitutions
 * @property {string} [ring]             Ring key, for selectors
 * @property {boolean} [unskilled=false] An Unskilled Roll (p.80)
 * @property {string[]} [emphases=[]]    Trained Emphases offered
 * @property {number} [tn]               Default TN; an attack defaults to a single target's Armor TN
 * @property {number} [explode=10]       Explode threshold (a weapon's "Explodes on")
 * @property {CheckModifierInput[]} [modifiers=[]] Extra modifiers from the caller (Increased Damage, Raises)
 * @property {Item} [weapon]             Weapon of an attack or damage roll
 * @property {boolean} [ranged=false]    An attack starts as ranged
 * @property {boolean} [askForOptions=true] Show the dialog; without it every default applies
 * @property {{template: string, data: object}} [extras] Extra dialog fields for the caller
 * @property {function(object): Promise<object|null>} [prepare] Runs on the dialog's choices before the roll; may
 *   add `labelSuffix`, `modifiers`, `freeRaises`, or return null to stop
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
 * "+2k1 +5"-style text for a modifier.
 * @param {{roll?: number, keep?: number, total?: number}} modifier
 * @returns {string}
 */
function modifierText({ roll = 0, keep = 0, total = 0 }) {
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
 * The actor's Void Points to spend and its Void Ring.
 * @param {Actor} actor
 * @returns {{points: number, ring: number}}
 */
function voidOf(actor) {
  return {
    points: toInt(actor.system.rings.void.value),
    ring: toInt(actor.system.rings.void.rank)
  };
}

/**
 * Read the dialog's form into choices.
 * @param {HTMLFormElement} form
 * @returns {object}
 */
function readForm(form) {
  return foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
}

/**
 * Show the check dialog.
 * @param {CheckRequest} request
 * @param {object} context  Dialog template context
 * @returns {Promise<object|null>} The form's values, or null when the roller closes the dialog
 */
async function askChoices(request, context) {
  const extras = request.extras
    ? await foundry.applications.handlebars.renderTemplate(
        request.extras.template,
        request.extras.data
      )
    : "";
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.check, {
    ...context,
    extras
  });
  return foundry.applications.api.DialogV2.prompt({
    window: { title: request.label },
    position: { width: 420 },
    content,
    ok: { label: T("l5r4.ui.common.roll"), callback: (_event, button) => readForm(button.form) },
    rejectClose: false,
    modal: true
  });
}

/**
 * Roll a check through the pipeline and post its card.
 *
 * @param {CheckRequest} request
 * @returns {Promise<ChatMessage|null>} The posted message, or null when the roller cancels or the roll cannot be made
 */
export async function rollCheck(request) {
  const { actor, kind } = request;
  const isDamage = kind === "damage";
  const unskilled = Boolean(request.unskilled);
  const { autoTN, targetData } = resolveTargets(actor, kind === "attack" ? "attack" : null);
  const target = targetData?.actor ?? null;
  const ctx = collectCheck(actor, {
    kind,
    skill: request.skill,
    trait: request.trait,
    ring: request.ring,
    target
  });
  const modifiers = [
    ...ctx.modifiers,
    ...(request.modifiers ?? []).map(m => ({ roll: 0, keep: 0, total: 0, enabled: true, ...m }))
  ];
  const voidState = voidOf(actor);
  const raisesAllowed = !isDamage && !unskilled;
  const maximum = maxRaises(voidState.ring, unskilled);
  const freeRaises = raisesAllowed ? ctx.freeRaises : 0;
  const woundPenalty = isDamage ? 0 : toInt(actor.system.woundPenalty);
  const defaultTN = toInt(request.tn ?? 0) || (kind === "attack" ? autoTN : 0);
  const emphases = unskilled ? [] : (request.emphases ?? []).filter(Boolean);
  const isSkill = ["skill", "attack"].includes(kind);

  let choices = {};
  if (request.askForOptions !== false) {
    const base = buildPool({ ...request.base, modifiers });
    choices = await askChoices(request, {
      pool: `${base.roll}k${base.keep}${base.bonus ? modifierText({ total: base.bonus }) : ""}`,
      modifiers: modifiers.map(m => ({ ...m, text: modifierText(m) })),
      substitutes: ctx.substitutes.map(s => ({ ...s, text: `${s.replace} → ${s.with}` })),
      hasTN: !isDamage,
      tn: defaultTN,
      tnModifiers: ctx.tnModifiers,
      woundPenalty,
      raisesAllowed,
      unskilled,
      maxRaises: maximum,
      freeRaises,
      voidAllowed: !isDamage,
      voidPoints: voidState.points,
      voidOverLimit: !isDamage && voidOverLimit(actor),
      emphases,
      isAttack: kind === "attack",
      ranged: Boolean(request.ranged),
      socialResistance: isSkill,
      honorRank: toInt(actor.system.honor?.rank)
    });
    if (!choices) {
      return null;
    }
  }

  // Dialog choices are user input: coerce and bound each one (CLAUDE.md, trust boundaries)
  const enabled = choices.modifier ?? {};
  const range = (choices.isRanged ?? Boolean(request.ranged)) ? "ranged" : "melee";
  // Each modifier as the roller left it; a modifier for the other attack range drops out
  const applied = modifiers
    .map((m, i) => ({
      ...m,
      enabled: request.askForOptions === false ? m.enabled : Boolean(enabled[i])
    }))
    .filter(m => !m.range || m.range === range);
  const manual = {
    label: T("l5r4.ui.check.manual"),
    roll: toInt(choices.rollMod),
    keep: toInt(choices.keepMod),
    total: toInt(choices.totalMod),
    enabled: true
  };
  if (manual.roll || manual.keep || manual.total) {
    applied.push(manual);
  }
  if (isSkill && choices.socialResistance) {
    applied.push({
      label: T("l5r4.ui.mechanics.rolls.socialResistance"),
      roll: 0,
      keep: 0,
      total: toInt(actor.system.honor?.rank),
      enabled: true
    });
  }

  // A Substitute swaps the Trait in the pool: its rank counts in both rolled and kept dice
  const substitutes = choices.substitute ?? {};
  ctx.substitutes.forEach((substitute, i) => {
    const [, from] = substitute.replace.split(":");
    const [, to] = substitute.with.split(":");
    if (substitutes[i] && request.trait === from && to) {
      const delta = getEffectiveTrait(actor, to) - getEffectiveTrait(actor, from);
      applied.push({ label: substitute.label, roll: delta, keep: delta, total: 0, enabled: true });
    }
  });

  const raises = raisesAllowed ? Math.min(Math.max(0, toInt(choices.raises)), maximum) : 0;
  const freeRaisesToTN = Math.min(Math.max(0, toInt(choices.freeRaisesToTN)), freeRaises);
  const voidPoint = !isDamage && Boolean(choices.void);
  const emphasis = emphases.includes(choices.emphasis) ? choices.emphasis : "";
  const keepOverride = toInt(choices.keep) > 0 ? toInt(choices.keep) : null;
  let tnBase = Math.max(0, toInt(choices.tn ?? defaultTN));
  const applyWound = choices.woundPenalty ?? true;

  const prepared = request.prepare ? await request.prepare(choices) : {};
  if (prepared === null) {
    return null;
  }
  applied.push(...(prepared.modifiers ?? []));
  const totalFreeRaises = freeRaises + toInt(prepared.freeRaises);
  if (prepared.tn !== undefined) {
    tnBase = prepared.tn;
  }

  if (voidPoint) {
    const spent = await spendVoidPoint(actor);
    if (!spent.success) {
      ui.notifications?.warn(spent.message);
      return null;
    }
  }

  const littleTruths = game.settings.get(SYS_ID, "LtException");
  const pool = buildPool({
    ...request.base,
    modifiers: applied,
    voidPoint,
    unskilled,
    explode: Math.min(request.explode ?? 10, ctx.explode ?? 10),
    rerollOnes: Boolean(emphasis) || ctx.rerollOnes,
    keepOverride,
    littleTruths
  });
  const roll = new foundry.dice.Roll(poolFormula(pool));
  await roll.evaluate();

  // A TN change for the other attack range drops out, as a modifier does
  const tnModifiers = isDamage
    ? []
    : ctx.tnModifiers
        .filter(m => !m.range || m.range === range)
        .map(({ label: l, value }) => ({ label: l, value }));
  const tn = isDamage
    ? null
    : targetNumber({
        base: tnBase,
        raises,
        freeRaisesToTN,
        woundPenalty: applyWound ? woundPenalty : 0,
        modifiers: tnModifiers.map(m => m.value)
      });
  const outcome = evaluateCheck(roll.total, tn);

  let label = request.label;
  if (unskilled) {
    label += ` [${T("l5r4.ui.mechanics.rolls.unskilled")}]`;
  }
  if (emphasis) {
    label += ` (${T("l5r4.ui.mechanics.rolls.emphasis")}: ${emphasis})`;
  }
  if (voidPoint) {
    label += ` ${T("l5r4.ui.mechanics.rings.void")}!`;
  }
  if (prepared.labelSuffix) {
    label += prepared.labelSuffix;
  }
  if (request.beforePost) {
    const post = await request.beforePost({ success: outcome?.success ?? null, total: roll.total });
    label += post?.labelSuffix ?? "";
  }

  const weapon = request.weapon ?? null;
  const hit = kind === "attack" && outcome?.success === true;
  const system = {
    actorUuid: actor.uuid,
    kind,
    label,
    pool: { ...pool, unskilled },
    modifiers: applied.map(({ label: l, roll: r, keep: k, total: t, enabled: e }) => ({
      label: l,
      roll: r,
      keep: k,
      total: t,
      enabled: e
    })),
    voidPoint,
    emphasis,
    tn: {
      base: tnBase,
      raises,
      freeRaises: totalFreeRaises,
      freeRaisesToTN,
      woundPenalty: tn === null || !applyWound ? 0 : woundPenalty,
      modifiers: tn === null ? [] : tnModifiers,
      effective: tn
    },
    target: { uuid: target?.uuid ?? "", name: target?.name ?? "" },
    outcome: {
      total: roll.total,
      success: outcome?.success ?? null,
      margin: outcome?.margin ?? null
    },
    weaponUuid: weapon?.uuid ?? "",
    notes: ctx.notes,
    conditions: target ? ctx.applyConditions : []
  };

  const content = await renderCheckCard(system, roll, {
    damageButton: hit && weapon ? weapon.name : "",
    actorId: actor.id
  });
  const message = await roll.toMessage({
    type: "roll",
    system,
    speaker: ChatMessage.getSpeaker({ actor }),
    content
  });

  // A used modifier that `consumes` ends its effect (Center Stance's bonus, p.84)
  const consumed = new Set(applied.filter(m => m.enabled && m.consumes).map(m => m.consumes));
  for (const uuid of consumed) {
    await (await fromUuid(uuid))?.delete();
  }

  if (request.after) {
    await request.after(message, choices);
  }
  return message;
}

/**
 * Render a check's card from its stored context.
 * @param {object} system  RollMessageData source
 * @param {Roll} roll
 * @param {{damageButton?: string, actorId?: string}} [extra]  The weapon name on an attack's damage button; the
 *   roller's id for a damage card's Apply Wounds buttons
 * @returns {Promise<string>}
 */
export async function renderCheckCard(system, roll, { damageButton = "", actorId = "" } = {}) {
  const success = system.outcome.success;
  const missed =
    system.kind === "attack" ? "l5r4.ui.mechanics.rolls.missed" : "l5r4.ui.mechanics.rolls.failure";
  return foundry.applications.handlebars.renderTemplate(CHAT_TEMPLATES.checkCard, {
    ...system,
    tn: system.tn.effective === null ? null : system.tn,
    freeRaisesLeft: system.tn.freeRaises - system.tn.freeRaisesToTN,
    outcomeText: T(success ? "l5r4.ui.mechanics.rolls.success" : missed),
    appliedModifiers: system.modifiers
      .filter(m => m.enabled && (m.roll || m.keep || m.total))
      .map(m => ({ label: m.label, text: modifierText(m) })),
    roll: await roll.render(),
    damageButton,
    actorId
  });
}
