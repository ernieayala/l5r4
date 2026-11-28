/**
 * @module services/dice/check/terms
 * @description The terms of one check in the roll pipeline (roll-check.js): what it rolls before the roller chooses
 * (target, gathered modifiers, pool, Unskilled state, Void, Taint, wound penalty, TN, Emphases), the dialog's context,
 * the terms the roller's choices and the caller's preparation set, and whether the Raises pay for an attack's
 * maneuvers. Dialog choices are user input, so each is coerced and bounded here. The modifiers are built in
 * modifiers.js.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/28_raises.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/38_maneuvers.md, p.86-87
 * game-rules/40_grappling.md, p.88
 * game-rules/89_shadowlands_taint.md, p.279
 */

import { toInt } from "../../../utils/type-coercion.js";
import { buildPool, getMaxRaises, isForRange } from "../../../utils/check.js";
import { getRaiseAllocation, getManeuverCost } from "../../../utils/damage.js";
import { canEmbraceTaint, getHighestRing, getLostBonus } from "../../../utils/taint.js";
import { getTargets } from "../resources/target-resolver.js";
import { isVoidOverLimit } from "../../effects/uses.js";
import { formatModifier, formatTnChanges } from "./card.js";
import { getCheckContext } from "./collect.js";
import { buildAppliedModifiers, buildCheckModifiers } from "./modifiers.js";

/**
 * The check's terms before the roller chooses: its target, gathered modifiers, pool, Unskilled state, Void, Taint,
 * wound penalty, TN, and Emphases; and whether a damage roll takes Free Raises, as a grapple Hit does (#167).
 * @param {CheckRequest} request
 * @returns {object}
 */
export function buildCheck(request) {
  const { actor, kind } = request;
  const isDamage = kind === "damage";
  const { autoTn, targetData } = getTargets(actor, kind === "attack" ? "attack" : null);
  const target = request.target !== undefined ? request.target : (targetData?.actor ?? null);
  const { skill, trait, ring, options, weapon = null } = request;
  const ctx = getCheckContext(actor, { kind, skill, trait, ring, target, weapon, options });
  // An Unskilled Roll in a Skill an UnskilledAs rule covers counts as that many ranks, so it is not Unskilled
  // game-rules/30_skill_rolls_expanded.md, p.80
  const countsAs = request.unskilled ? ctx.unskilledAs : 0;
  const unskilled = Boolean(request.unskilled) && !countsAs;
  const check = {
    request,
    actor,
    kind,
    isDamage,
    takesFreeRaises: isDamage && Boolean(request.takesFreeRaises),
    target,
    ctx,
    unskilled,
    ...buildTaintTerms(request),
    isSkill: ["skill", "attack"].includes(kind),
    basePool: countsAs ? { ...request.base, roll: request.base.roll + countsAs } : request.base,
    voidState: voidOf(actor),
    // A Void Point can raise a Skill from 0 to 1 for the roll, which is then not Unskilled
    // game-rules/25_rings_and_traits.md, p.78
    voidSkillAllowed: unskilled && !isDamage,
    woundPenalty: isDamage ? 0 : toInt(actor.system.woundPenalty),
    defaultTn: toInt(request.tn ?? 0) || (kind === "attack" ? autoTn : 0),
    emphases: unskilled ? [] : (request.emphases ?? []).filter(Boolean)
  };
  check.modifiers = buildOfferedModifiers(check);
  return check;
}

/**
 * The check dialog's template context: the pool, the modifiers and Substitutes offered, the TN, the Raises the roll
 * allows, the Void Point, the Emphases, and the attack's, social, and Taint options.
 * @param {object} check - From buildCheck
 * @returns {object}
 */
export function buildDialogContext(check) {
  const { request, actor, ctx, isDamage, unskilled, voidSkillAllowed, modifiers } = check;
  const base = buildPool({ ...check.basePool, modifiers });
  const offered = getRaiseLimits(check, { unskilled: unskilled && !voidSkillAllowed });
  return {
    pool: `${base.roll}k${base.keep}${base.bonus ? formatModifier({ total: base.bonus }) : ""}`,
    modifiers: modifiers.map(m => ({ ...m, text: formatModifier(m) })),
    substitutes: ctx.substitutes.map(s => ({ ...s, text: `${s.replace} → ${s.with}` })),
    hasTn: !isDamage,
    tn: check.defaultTn,
    tnChanges: formatTnChanges(ctx.tnModifiers),
    woundPenalty: check.woundPenalty,
    raisesAllowed: offered.allowed,
    unskilled,
    voidSkill: voidSkillAllowed,
    maxRaises: offered.max,
    minRaises: offered.min,
    freeRaises: offered.free,
    damageFreeRaises: check.takesFreeRaises,
    voidAllowed: !isDamage,
    voidPoints: check.voidState.points,
    voidOverLimit: !isDamage && isVoidOverLimit(actor),
    emphases: check.emphases,
    isAttack: check.kind === "attack",
    ranged: Boolean(request.ranged),
    socialResistance: check.isSkill,
    honorRank: toInt(actor.system.honor?.rank),
    embraceTaint: check.embraceAllowed
  };
}

/**
 * The terms the roller's choices set: the modifiers applied, the Raises, the Void Point, the Emphasis, the kept
 * dice, and the TN. Dialog choices are user input, so each is coerced and bounded (CLAUDE.md, trust boundaries).
 * @param {object} check - From buildCheck
 * @param {object} choices - The dialog's values; empty when the dialog was skipped
 * @returns {object}
 */
export function buildChosenTerms(check, choices) {
  const range = getCheckRange(check, choices);
  // Embracing the Taint: +1k1 for a point of Taint
  // game-rules/89_shadowlands_taint.md, p.279
  const embrace = check.embraceAllowed && Boolean(choices.embraceTaint);
  // A Void Point spent on the Skill's rank: it rolls as Rank 1, not Unskilled
  // game-rules/25_rings_and_traits.md, p.78
  const voidSkill = check.voidSkillAllowed && Boolean(choices.voidSkill);
  const rolledUnskilled = check.unskilled && !voidSkill;
  const { allowed, max, min, free } = getRaiseLimits(check, { unskilled: rolledUnskilled });
  const damageFreeRaises = check.takesFreeRaises
    ? Math.max(0, toInt(choices.damageFreeRaises ?? free))
    : 0;
  return {
    range,
    embrace,
    voidSkill,
    rolledUnskilled,
    raisesAllowed: allowed,
    freeRaises: free,
    applied: buildAppliedModifiers(check, choices, { range, embrace, voidSkill, damageFreeRaises }),
    raises: allowed ? Math.min(Math.max(min, toInt(choices.raises ?? min)), max) : 0,
    freeRaisesToTn: Math.min(Math.max(0, toInt(choices.freeRaisesToTn)), free),
    voidPoint: !check.isDamage && Boolean(choices.void),
    emphasis: check.emphases.includes(choices.emphasis) ? choices.emphasis : "",
    keepOverride: toInt(choices.keep) > 0 ? toInt(choices.keep) : null,
    tnBase: Math.max(0, toInt(choices.tn ?? check.defaultTn)),
    applyWound: choices.woundPenalty ?? true
  };
}

/**
 * The terms the caller's preparation adds: its modifiers, its Free Raises and those of them it spends on the TN, its
 * TN, and its label suffix. Free Raises from the roll's own preparation (maho blood) obey the same rule: none on an
 * Unskilled Roll.
 * game-rules/28_raises.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {object} chosen - From buildChosenTerms
 * @param {object} prepared - What the request's `prepare` returned
 * @returns {{applied: object[], totalFreeRaises: number, freeRaisesToTn: number, tnBase: number,
 *   labelSuffix: string|undefined}}
 */
export function buildPreparedTerms(chosen, prepared) {
  const allowed = chosen.raisesAllowed;
  return {
    applied: [...chosen.applied, ...(prepared.modifiers ?? [])],
    totalFreeRaises: allowed ? chosen.freeRaises + toInt(prepared.freeRaises) : 0,
    freeRaisesToTn: chosen.freeRaisesToTn + (allowed ? toInt(prepared.freeRaisesToTn) : 0),
    tnBase: prepared.tn !== undefined ? prepared.tn : chosen.tnBase,
    labelSuffix: prepared.labelSuffix
  };
}

/**
 * An attack's maneuvers and whether its Raises pay for them; dialog values are user input. None for other rolls.
 * game-rules/38_maneuvers.md, p.86-87
 * @param {object} check - From buildCheck
 * @param {object} choices - The dialog's values
 * @param {object} terms - The chosen and prepared terms
 * @returns {{maneuvers: object, cost: number, affordable: boolean}|null}
 */
export function getManeuverPayment(check, choices, terms) {
  if (check.kind !== "attack") {
    return null;
  }
  const { raises, totalFreeRaises, freeRaisesToTn } = terms;
  const maneuvers = buildManeuvers(choices.maneuver ?? {}, { raisesAllowed: terms.raisesAllowed });
  const cost = getManeuverCost(maneuvers, check.ctx.raises.maneuverCosts);
  const { affordable, increasedDamage } = getRaiseAllocation({
    raises,
    freeRaises: totalFreeRaises - freeRaisesToTn,
    cost
  });
  maneuvers.increasedDamage = increasedDamage;
  maneuvers.cost = cost;
  return { maneuvers, cost, affordable };
}

/**
 * The modifiers the dialog offers. Only an attack's range changes in the dialog, so any other roll is not offered a
 * modifier for a range it lacks (#171).
 * @param {object} check - From buildCheck, before its modifiers
 * @returns {object[]}
 */
function buildOfferedModifiers(check) {
  const offered = buildCheckModifiers(check);
  if (check.kind === "attack") {
    return offered;
  }
  const range = getCheckRange(check, {});
  return offered.filter(m => isForRange(m, range));
}

/**
 * The roll's attack range, which range-limited rules, TN changes, and action costs test: an attack's from its Ranged
 * box (user input), a damage roll's from its attack (#171). Every other roll has none, so a rule limited to one range
 * never applies to it.
 * @param {object} check - From buildCheck
 * @param {object} choices - The dialog's values
 * @returns {"melee"|"ranged"|null}
 */
function getCheckRange(check, choices) {
  const { kind, request } = check;
  if (kind === "attack") {
    return (choices.isRanged ?? Boolean(request.ranged)) ? "ranged" : "melee";
  }
  return kind === "damage" && ["melee", "ranged"].includes(request.range) ? request.range : null;
}

/**
 * Whether the roller may embrace the Taint on this roll, and the Lost character's bonus to it.
 * game-rules/89_shadowlands_taint.md, p.279
 * @param {CheckRequest} request
 * @returns {{embraceAllowed: boolean, lost: number}}
 */
function buildTaintTerms({ actor, kind, trait }) {
  const taint = {
    rank: toInt(actor.system.shadowTaint.rank),
    highestRing: getHighestRing(actor.system.rings),
    kind,
    trait
  };
  return { embraceAllowed: canEmbraceTaint(taint), lost: getLostBonus(taint) };
}

/**
 * The Raises a roll allows, Unskilled or not; RaiseRule rules move the Void Ring cap and may require Raises. The
 * Free Raises offered are those of rules and those the caller grants, so either kind may lower the TN. A damage roll
 * that takes Free Raises (a grapple Hit) is offered the caller's, with no Raises.
 * game-rules/28_raises.md, p.79
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/40_grappling.md, p.88
 * @param {object} check - From buildCheck
 * @param {object} roll
 * @param {boolean} roll.unskilled - The roll is Unskilled
 * @returns {{allowed: boolean, max: number, min: number, free: number}}
 */
function getRaiseLimits(check, { unskilled }) {
  const { isDamage, voidState, ctx, request } = check;
  const allowed = !isDamage && !unskilled;
  const max = allowed ? Math.max(0, getMaxRaises(voidState.ring, unskilled) + ctx.raises.cap) : 0;
  return {
    allowed,
    max,
    min: Math.min(Math.max(0, ctx.raises.minimum), max),
    free: allowed || check.takesFreeRaises ? ctx.freeRaises + toInt(request.freeRaises) : 0
  };
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
 * An attack's maneuvers from the dialog's choices, bounded (user input). Without Raises allowed (an Unskilled
 * attack) only Grapple, which costs none, remains.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {object} choice - `maneuver.*` fields of the dialog
 * @param {object} roll
 * @param {boolean} roll.raisesAllowed - The roll allows Raises
 * @returns {object}
 */
function buildManeuvers(choice, { raisesAllowed }) {
  const isPicked = key => raisesAllowed && Boolean(choice[key]);
  return {
    calledShot: raisesAllowed ? Math.min(4, Math.max(0, toInt(choice.calledShot))) : 0,
    location: raisesAllowed ? String(choice.location ?? "").trim() : "",
    disarm: isPicked("disarm"),
    extraAttack: isPicked("extraAttack"),
    feint: isPicked("feint"),
    knockdown: isPicked("knockdown"),
    fourLegged: isPicked("fourLegged"),
    grapple: Boolean(choice.grapple),
    increasedDamage: 0
  };
}
