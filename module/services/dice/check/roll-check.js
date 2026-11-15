/**
 * @module services/dice/check/roll-check
 * @description L5R4Check: the one roll pipeline (roadmap/STAGE-08-ROLL-PIPELINE.md). A check names what it rolls;
 * the pipeline gathers its modifiers (collect.js), offers every choice the rules leave to the roller in one dialog
 * (AUTOMATION.md §4), spends a Void Point, builds the pool with the Ten Dice Rule last, rolls, compares with the
 * TN, and posts a `roll` ChatMessage holding the whole context.
 *
 * Rules: Roll & Keep p.75, Ten Dice Rule and exploding dice p.77, Void Points p.78 (never on damage), Raises and
 * Free Raises p.79, Unskilled Rolls p.80, wound penalties on the TN p.82 (decision 2), the Honor Roll p.92,
 * Emphases p.133, Embracing the Taint p.279.
 */

import { SYS_ID } from "../../../config/constants.js";
import { CHAT_TEMPLATES, DIALOG_TEMPLATES } from "../../../config/templates.js";
import { ARROW_ARMOR_FACTOR } from "../../../config/game-mechanics.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import { gmMayAllow } from "../../gm-allow.js";
import { stackModifiers } from "../../../utils/modifier-stacking.js";
import {
  buildPool,
  evaluateCheck,
  maxRaises,
  poolFormula,
  targetNumber
} from "../../../utils/check.js";
import { allocateRaises, maneuverCost } from "../../../utils/damage.js";
import { canEmbraceTaint, highestRing, lostBonus } from "../../../utils/taint.js";
import { spendVoidPoint } from "../resources/void-manager.js";
import { resolveTargets } from "../resources/target-resolver.js";
import { collectCheck } from "./collect.js";
import { voidOverLimit } from "../../effects/uses.js";
import { recordTrackChange } from "../../ledger.js";

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
 * The damage pool an attack stores for its damage button: the caller's (a stat block's damage), or the weapon's
 * prepared pool, Strength or the bow and arrow included (pp.82, 199). None for other rolls.
 * @param {CheckRequest} request
 * @returns {{label: string, roll: number, keep: number, bonus: number, explode: number}|null}
 */
function attackDamage(request) {
  if (request.kind !== "attack") {
    return null;
  }
  if (request.damage) {
    return { bonus: 0, explode: 10, ...request.damage };
  }
  const weapon = request.weapon;
  if (!weapon) {
    return null;
  }
  return {
    label: weapon.name,
    roll: toInt(weapon.system.derivedDamageRoll ?? weapon.system.damageRoll),
    keep: toInt(weapon.system.derivedDamageKeep ?? weapon.system.damageKeep),
    bonus: 0,
    explode: weapon.system.damageExplode
  };
}

/**
 * An attack's maneuvers from the dialog's choices, bounded (user input). Without Raises allowed (an Unskilled
 * attack, p.80) only Grapple, which costs none, remains.
 * @param {object} choice  `maneuver.*` fields of the dialog
 * @param {boolean} raisesAllowed
 * @returns {object}
 */
function readManeuvers(choice, raisesAllowed) {
  const pick = key => raisesAllowed && Boolean(choice[key]);
  return {
    calledShot: raisesAllowed ? Math.min(4, Math.max(0, toInt(choice.calledShot))) : 0,
    location: raisesAllowed ? String(choice.location ?? "").trim() : "",
    disarm: pick("disarm"),
    extraAttack: pick("extraAttack"),
    feint: pick("feint"),
    knockdown: pick("knockdown"),
    fourLegged: pick("fourLegged"),
    grapple: Boolean(choice.grapple),
    increasedDamage: 0
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
  // A weapon needing more Strength than its wielder has cannot be used, though the GM may allow it (p.199)
  const minStrength = kind === "attack" ? toInt(request.weapon?.system.minStrength) : 0;
  const strength = getEffectiveTrait(actor, "str");
  if (
    minStrength > strength &&
    !(await gmMayAllow({
      title: request.weapon.name,
      reason: F("l5r4.equipment.weapons.belowMinStrength", {
        name: actor.name,
        min: minStrength,
        weapon: request.weapon.name
      }),
      ask: T("l5r4.equipment.weapons.belowMinStrengthGM")
    }))
  ) {
    return null;
  }
  const { autoTN, targetData } = resolveTargets(actor, kind === "attack" ? "attack" : null);
  const target = request.target !== undefined ? request.target : (targetData?.actor ?? null);
  const ctx = collectCheck(actor, {
    kind,
    skill: request.skill,
    trait: request.trait,
    ring: request.ring,
    target,
    weapon: request.weapon ?? null
  });
  // An Unskilled Roll in a Skill an UnskilledAs rule covers counts as that many ranks, so it is not Unskilled (p.80)
  const countsAs = request.unskilled ? ctx.unskilledAs : 0;
  const unskilled = Boolean(request.unskilled) && !countsAs;
  const basePool = countsAs
    ? { ...request.base, roll: request.base.roll + countsAs }
    : request.base;
  const modifiers = [
    ...ctx.modifiers,
    ...(request.modifiers ?? []).map(m => ({ roll: 0, keep: 0, total: 0, enabled: true, ...m }))
  ];
  const voidState = voidOf(actor);
  // The Raises a roll allows, Unskilled or not (pp.79-80); RaiseRule rules move the Void Ring cap and may require
  // Raises
  const raiseLimits = isUnskilled => {
    const allowed = !isDamage && !isUnskilled;
    const max = allowed ? Math.max(0, maxRaises(voidState.ring, isUnskilled) + ctx.raises.cap) : 0;
    return {
      allowed,
      max,
      min: Math.min(Math.max(0, ctx.raises.minimum), max),
      free: allowed ? ctx.freeRaises : 0
    };
  };
  // A Void Point can raise a Skill from 0 to 1 for the roll, which is then not Unskilled (p.78)
  const voidSkillAllowed = unskilled && !isDamage;
  const offered = raiseLimits(unskilled && !voidSkillAllowed);
  const taint = {
    rank: toInt(actor.system.shadowTaint.rank),
    highestRing: highestRing(actor.system.rings),
    kind,
    trait: request.trait
  };
  const embraceAllowed = canEmbraceTaint(taint);
  // A Lost character adds the Taint Rank to every physical Trait roll, always (p.279)
  const lost = lostBonus(taint);
  if (lost) {
    modifiers.push({
      label: T("l5r4.ui.taint.lost"),
      roll: 0,
      keep: 0,
      total: lost,
      enabled: true
    });
  }
  const woundPenalty = isDamage ? 0 : toInt(actor.system.woundPenalty);
  const defaultTN = toInt(request.tn ?? 0) || (kind === "attack" ? autoTN : 0);
  const emphases = unskilled ? [] : (request.emphases ?? []).filter(Boolean);
  const isSkill = ["skill", "attack"].includes(kind);

  let choices = {};
  if (request.askForOptions !== false) {
    const base = buildPool({ ...basePool, modifiers });
    choices = await askChoices(request, {
      pool: `${base.roll}k${base.keep}${base.bonus ? modifierText({ total: base.bonus }) : ""}`,
      modifiers: modifiers.map(m => ({ ...m, text: modifierText(m) })),
      substitutes: ctx.substitutes.map(s => ({ ...s, text: `${s.replace} → ${s.with}` })),
      hasTN: !isDamage,
      tn: defaultTN,
      tnModifiers: ctx.tnModifiers,
      woundPenalty,
      raisesAllowed: offered.allowed,
      unskilled,
      voidSkill: voidSkillAllowed,
      maxRaises: offered.max,
      minRaises: offered.min,
      freeRaises: offered.free,
      voidAllowed: !isDamage,
      voidPoints: voidState.points,
      voidOverLimit: !isDamage && voidOverLimit(actor),
      emphases,
      isAttack: kind === "attack",
      ranged: Boolean(request.ranged),
      socialResistance: isSkill,
      honorRank: toInt(actor.system.honor?.rank),
      embraceTaint: embraceAllowed
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
  // Embracing the Taint: +1k1 for a point of Taint (p.279)
  const embrace = embraceAllowed && Boolean(choices.embraceTaint);
  if (embrace) {
    applied.push({ label: T("l5r4.ui.taint.embrace"), roll: 1, keep: 1, total: 0, enabled: true });
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

  // A Void Point spent on the Skill's rank: it rolls as Rank 1, not Unskilled (p.78)
  const voidSkill = voidSkillAllowed && Boolean(choices.voidSkill);
  if (voidSkill) {
    applied.push({
      label: T("l5r4.ui.check.voidSkill"),
      roll: 1,
      keep: 0,
      total: 0,
      enabled: true
    });
  }
  const rolledUnskilled = unskilled && !voidSkill;
  const {
    allowed: raisesAllowed,
    max: maximum,
    min: minimum,
    free: freeRaises
  } = raiseLimits(rolledUnskilled);
  const raises = raisesAllowed
    ? Math.min(Math.max(minimum, toInt(choices.raises ?? minimum)), maximum)
    : 0;
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
  // Free Raises from the roll's own preparation (a duel's Focus, maho blood) obey the same rule: none on an Unskilled
  // Roll (p.80)
  const totalFreeRaises = raisesAllowed ? freeRaises + toInt(prepared.freeRaises) : 0;

  // An attack's maneuvers, paid for out of its Raises (pp.86-87); dialog values are user input
  const maneuvers = kind === "attack" ? readManeuvers(choices.maneuver ?? {}, raisesAllowed) : null;
  if (maneuvers) {
    const cost = maneuverCost(maneuvers, ctx.raises.maneuverCosts);
    const { affordable, increasedDamage } = allocateRaises({
      raises,
      freeRaises: totalFreeRaises - freeRaisesToTN,
      cost
    });
    if (!affordable) {
      ui.notifications?.warn(F("l5r4.ui.combat.notEnoughRaises", { cost, raises }));
      return null;
    }
    maneuvers.increasedDamage = increasedDamage;
  }
  if (prepared.tn !== undefined) {
    tnBase = prepared.tn;
  }

  // Each Void Point use is its own point (p.78)
  for (let i = 0; i < Number(voidPoint) + Number(voidSkill); i++) {
    const spent = await spendVoidPoint(actor);
    if (!spent.success) {
      ui.notifications?.warn(spent.message);
      return null;
    }
  }

  const littleTruths = game.settings.get(SYS_ID, "LtException");
  const pool = buildPool({
    ...basePool,
    modifiers: applied,
    voidPoint,
    unskilled: rolledUnskilled,
    // A weapon whose dice never explode stays so (p.202); otherwise the lowest threshold wins
    explode: request.explode === null ? null : Math.min(request.explode ?? 10, ctx.explode ?? 10),
    rerollOnes: Boolean(emphasis) || ctx.rerollOnes,
    keepOverride,
    littleTruths
  });
  const roll = new foundry.dice.Roll(poolFormula(pool));
  await roll.evaluate();
  if (embrace) {
    await recordTrackChange(actor, "taint", 1, T("l5r4.ui.taint.embraceReason"));
  }

  // A TN change for the other attack range drops out, as a modifier does
  const tnModifiers = isDamage
    ? []
    : ctx.tnModifiers
        .filter(m => !m.range || m.range === range)
        .map(({ label: l, value, type, fromTarget }) => ({ label: l, value, type, fromTarget }));
  // An attack starting a grapple ignores the armor in the target's Armor TN (p.88)
  const armorBonus = toInt(target?.system.armorTn?.bonus);
  if (maneuvers?.grapple && armorBonus) {
    tnModifiers.push({
      label: T("l5r4.ui.combat.grappleIgnoresArmor"),
      value: -armorBonus,
      fromTarget: true
    });
  }
  // An Armor Piercing arrow ignores the armor in the target's Armor TN, a Flesh Cutter doubles it (p.199)
  const arrow =
    kind === "attack" && request.weapon?.system.isBow ? request.weapon.system.arrow : null;
  const arrowFactor = ARROW_ARMOR_FACTOR[arrow];
  if (arrowFactor !== undefined && armorBonus) {
    tnModifiers.push({
      label: T(`l5r4.ui.combat.arrowArmor.${arrow}`),
      value: (arrowFactor - 1) * armorBonus,
      fromTarget: true
    });
  }
  const tn = isDamage
    ? null
    : targetNumber({
        base: tnBase,
        raises,
        freeRaisesToTN,
        woundPenalty: applyWound ? woundPenalty : 0,
        // TN changes of one type do not stack, as on the sheet (module/utils/modifier-stacking.js)
        modifiers: [stackModifiers(tnModifiers.map(m => ({ total: m.value, type: m.type }))).total]
      });
  const outcome = evaluateCheck(roll.total, tn);

  let label = request.label;
  if (rolledUnskilled) {
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
  const system = {
    actorUuid: actor.uuid,
    kind,
    label,
    skill: request.skill ?? "",
    pool: { ...pool, unskilled: rolledUnskilled },
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
      // The target's Armor TN against this attack: the base and the target's own changes, without the attacker's
      // Raises, wound penalty, or other TN changes (the Feint bonus reads it, p.86)
      armor:
        kind === "attack" && tn !== null
          ? tnBase + tnModifiers.filter(m => m.fromTarget).reduce((sum, m) => sum + m.value, 0)
          : 0,
      effective: tn
    },
    target: { uuid: target?.uuid ?? "", name: target?.name ?? "" },
    outcome: {
      total: roll.total,
      success: outcome?.success ?? null,
      margin: outcome?.margin ?? null
    },
    weaponUuid: weapon?.uuid ?? "",
    notes: [
      // A Note rule's text is a localization key (the system's own, such as Prone's) or a GM's plain text
      ...ctx.notes.map(text => T(text)),
      ...ctx.actions
        .filter(a => !a.range || a.range === range)
        .map(({ label: source, action }) =>
          F("l5r4.ui.check.actionNote", { action: T(`l5r4.ui.check.actions.${action}`), source })
        )
    ],
    conditions: target ? ctx.applyConditions : [],
    ...(maneuvers ? { maneuvers } : {}),
    ...(attackDamage(request) ? { damage: attackDamage(request) } : {}),
    sources: isDamage ? ctx.damageSources : [],
    ignoreReduction: isDamage ? ctx.ignoreReduction : 0,
    attackOf: request.attackOf ?? ""
  };

  const content = await renderCheckCard(system, roll, { actorId: actor.id });
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
 * The lines a hit's maneuvers add to its card (pp.86-88): what each did, and the Contested Strength roll Knockdown
 * and Disarm call for. A Called Shot's effect is the GM's (STAGE-10 decision 1).
 * @param {object} maneuvers
 * @returns {string[]}
 */
function maneuverNotes(maneuvers) {
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

/** Roll kinds the Honor Roll can re-roll: Skill, Trait, Ring, and Spell Casting rolls (p.92). */
const HONOR_ROLL_KINDS = new Set(["skill", "attack", "trait", "ring", "spell", "maho"]);

/**
 * Whether a check's card offers the optional Honor Roll (p.92; roadmap/STAGE-11 decision 3): the world setting is on
 * and the roll failed, and it is not itself an Honor Roll. Whether the roller still has it this session is checked on
 * the click (module/services/dice/check/chat-actions.js, honorRoll).
 * @param {object} system  RollMessageData source
 * @returns {boolean}
 */
export function offersHonorRoll(system) {
  return (
    game.settings.get(SYS_ID, "honorRoll") &&
    system.outcome.success === false &&
    HONOR_ROLL_KINDS.has(system.kind) &&
    !system.honorRollOf
  );
}

/**
 * Render a check's card from its stored context.
 * @param {object} system  RollMessageData source
 * @param {Roll} roll
 * @param {{actorId?: string}} [extra]  The roller's id
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
      .map(m => ({ label: m.label, text: modifierText(m) })),
    roll: await roll.render(),
    damageButton: hit && !maneuvers.grapple ? (system.damage?.label ?? "") : "",
    maneuverNotes: hit ? maneuverNotes(maneuvers) : [],
    contest: hit && Boolean(system.target?.uuid) && (maneuvers.knockdown || maneuvers.disarm),
    grappleButton: hit && Boolean(system.target?.uuid) && maneuvers.grapple,
    applyTarget: system.kind === "damage" ? system.target?.name : "",
    honorRoll: offersHonorRoll(system),
    actorId
  });
}
