/**
 * @module services/dice/check/roll-check
 * @description L5R4Check: the one roll pipeline (roadmap/STAGE-08-ROLL-PIPELINE.md). A check names what it rolls;
 * the pipeline gathers its modifiers (collect.js), offers every choice the rules leave to the roller in one dialog
 * (AUTOMATION.md §4), spends a Void Point, builds the pool with the Ten Dice Rule last, rolls, compares with the
 * TN, and posts a `roll` ChatMessage holding the whole context.
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
import { ARROW_ARMOR_FACTOR } from "../../../config/game-mechanics.js";
import { F, T } from "../../../utils/localization.js";
import { toInt } from "../../../utils/type-coercion.js";
import { getEffectiveTrait } from "../../../utils/mechanics.js";
import { getStackedModifiers } from "../../../utils/modifier-stacking.js";
import {
  buildPool,
  getCheckResult,
  getMaxRaises,
  getPoolFormula,
  getTn
} from "../../../utils/check.js";
import { getRaiseAllocation, getManeuverCost } from "../../../utils/damage.js";
import { canEmbraceTaint, getHighestRing, getLostBonus } from "../../../utils/taint.js";
import { askGmAllow } from "../../gm-allow.js";
import { spendVoidPoint } from "../resources/void-points.js";
import { getTargets } from "../resources/target-resolver.js";
import { isVoidOverLimit } from "../../effects/uses.js";
import { applyTrackChange } from "../../ledger.js";
import { formatModifier, renderCheckCard } from "./card.js";
import { getCheckContext } from "./collect.js";

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
 * Roll a check through the pipeline and post its card.
 *
 * @param {CheckRequest} request
 * @returns {Promise<ChatMessage|null>} The posted message, or null when the roller cancels or the roll cannot be made
 */
export async function rollCheck(request) {
  const { actor, kind } = request;
  const isDamage = kind === "damage";
  // A weapon needing more Strength than its wielder has cannot be used, though the GM may allow it
  // game-rules/74_weapons.md, p.199
  const minStrength = kind === "attack" ? toInt(request.weapon?.system.minStrength) : 0;
  const strength = getEffectiveTrait(actor, "str");
  if (
    minStrength > strength &&
    !(await askGmAllow({
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
  const { autoTn, targetData } = getTargets(actor, kind === "attack" ? "attack" : null);
  const target = request.target !== undefined ? request.target : (targetData?.actor ?? null);
  const ctx = getCheckContext(actor, {
    kind,
    skill: request.skill,
    trait: request.trait,
    ring: request.ring,
    target,
    weapon: request.weapon ?? null
  });
  // An Unskilled Roll in a Skill an UnskilledAs rule covers counts as that many ranks, so it is not Unskilled
  // game-rules/30_skill_rolls_expanded.md, p.80
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
  // The Raises a roll allows, Unskilled or not; RaiseRule rules move the Void Ring cap and may require Raises
  // game-rules/28_raises.md, p.79
  // game-rules/30_skill_rolls_expanded.md, p.80
  const getRaiseLimits = isUnskilled => {
    const allowed = !isDamage && !isUnskilled;
    const max = allowed
      ? Math.max(0, getMaxRaises(voidState.ring, isUnskilled) + ctx.raises.cap)
      : 0;
    return {
      allowed,
      max,
      min: Math.min(Math.max(0, ctx.raises.minimum), max),
      free: allowed ? ctx.freeRaises : 0
    };
  };
  // A Void Point can raise a Skill from 0 to 1 for the roll, which is then not Unskilled
  // game-rules/25_rings_and_traits.md, p.78
  const voidSkillAllowed = unskilled && !isDamage;
  const offered = getRaiseLimits(unskilled && !voidSkillAllowed);
  const taint = {
    rank: toInt(actor.system.shadowTaint.rank),
    highestRing: getHighestRing(actor.system.rings),
    kind,
    trait: request.trait
  };
  const embraceAllowed = canEmbraceTaint(taint);
  // A Lost character adds the Taint Rank to every physical Trait roll, always
  // game-rules/89_shadowlands_taint.md, p.279
  const lost = getLostBonus(taint);
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
  const defaultTn = toInt(request.tn ?? 0) || (kind === "attack" ? autoTn : 0);
  const emphases = unskilled ? [] : (request.emphases ?? []).filter(Boolean);
  const isSkill = ["skill", "attack"].includes(kind);

  let choices = {};
  if (request.askForOptions !== false) {
    const base = buildPool({ ...basePool, modifiers });
    choices = await askChoices(request, {
      pool: `${base.roll}k${base.keep}${base.bonus ? formatModifier({ total: base.bonus }) : ""}`,
      modifiers: modifiers.map(m => ({ ...m, text: formatModifier(m) })),
      substitutes: ctx.substitutes.map(s => ({ ...s, text: `${s.replace} → ${s.with}` })),
      hasTn: !isDamage,
      tn: defaultTn,
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
      voidOverLimit: !isDamage && isVoidOverLimit(actor),
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
  // Embracing the Taint: +1k1 for a point of Taint
  // game-rules/89_shadowlands_taint.md, p.279
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

  // A Void Point spent on the Skill's rank: it rolls as Rank 1, not Unskilled
  // game-rules/25_rings_and_traits.md, p.78
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
  } = getRaiseLimits(rolledUnskilled);
  const raises = raisesAllowed
    ? Math.min(Math.max(minimum, toInt(choices.raises ?? minimum)), maximum)
    : 0;
  const freeRaisesToTn = Math.min(Math.max(0, toInt(choices.freeRaisesToTn)), freeRaises);
  const voidPoint = !isDamage && Boolean(choices.void);
  const emphasis = emphases.includes(choices.emphasis) ? choices.emphasis : "";
  const keepOverride = toInt(choices.keep) > 0 ? toInt(choices.keep) : null;
  let tnBase = Math.max(0, toInt(choices.tn ?? defaultTn));
  const applyWound = choices.woundPenalty ?? true;

  const prepared = request.prepare ? await request.prepare(choices) : {};
  if (prepared === null) {
    return null;
  }
  applied.push(...(prepared.modifiers ?? []));
  // Free Raises from the roll's own preparation (a duel's Focus, maho blood) obey the same rule: none on an Unskilled
  // Roll
  // game-rules/30_skill_rolls_expanded.md, p.80
  const totalFreeRaises = raisesAllowed ? freeRaises + toInt(prepared.freeRaises) : 0;

  // An attack's maneuvers, paid for out of its Raises; dialog values are user input
  // game-rules/38_maneuvers.md, p.86-87
  const maneuvers =
    kind === "attack" ? buildManeuvers(choices.maneuver ?? {}, raisesAllowed) : null;
  if (maneuvers) {
    const cost = getManeuverCost(maneuvers, ctx.raises.maneuverCosts);
    const { affordable, increasedDamage } = getRaiseAllocation({
      raises,
      freeRaises: totalFreeRaises - freeRaisesToTn,
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

  // Each Void Point use is its own point
  // game-rules/25_rings_and_traits.md, p.78
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
    // A weapon whose dice never explode stays so; otherwise the lowest threshold wins
    // game-rules/74_weapons.md, p.202
    explode: request.explode === null ? null : Math.min(request.explode ?? 10, ctx.explode ?? 10),
    rerollOnes: Boolean(emphasis) || ctx.rerollOnes,
    keepOverride,
    littleTruths
  });
  const roll = new foundry.dice.Roll(getPoolFormula(pool));
  await roll.evaluate();
  if (embrace) {
    await applyTrackChange(actor, "taint", { points: 1, reason: T("l5r4.ui.taint.embraceReason") });
  }

  // A TN change for the other attack range drops out, as a modifier does
  const tnModifiers = isDamage
    ? []
    : ctx.tnModifiers
        .filter(m => !m.range || m.range === range)
        .map(({ label: l, value, type, fromTarget }) => ({ label: l, value, type, fromTarget }));
  // An attack starting a grapple ignores the armor in the target's Armor TN
  // game-rules/40_grappling.md, p.88
  const armorBonus = toInt(target?.system.armorTn?.bonus);
  if (maneuvers?.grapple && armorBonus) {
    tnModifiers.push({
      label: T("l5r4.ui.combat.grappleIgnoresArmor"),
      value: -armorBonus,
      fromTarget: true
    });
  }
  // An Armor Piercing arrow ignores the armor in the target's Armor TN, a Flesh Cutter doubles it
  // game-rules/74_weapons.md, p.199
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
    : getTn({
        base: tnBase,
        raises,
        freeRaisesToTn,
        woundPenalty: applyWound ? woundPenalty : 0,
        // TN changes of one type do not stack, as on the sheet (module/utils/modifier-stacking.js)
        modifiers: [
          getStackedModifiers(tnModifiers.map(m => ({ total: m.value, type: m.type }))).total
        ]
      });
  const outcome = getCheckResult(roll.total, tn);

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
      // The key is stored in posted roll messages (RollMessageData), so it keeps its name
      freeRaisesToTN: freeRaisesToTn,
      woundPenalty: tn === null || !applyWound ? 0 : woundPenalty,
      modifiers: tn === null ? [] : tnModifiers,
      // The target's Armor TN against this attack: the base and the target's own changes, without the attacker's
      // Raises, wound penalty, or other TN changes (the Feint bonus reads it)
      // game-rules/38_maneuvers.md, p.86
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
    ...(attackDamageOf(request) ? { damage: attackDamageOf(request) } : {}),
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

  // A used modifier that `consumes` ends its effect (Center Stance's bonus)
  // game-rules/36_stances.md, p.84
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
 * prepared pool, Strength or the bow and arrow included. None for other rolls.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/74_weapons.md, p.199
 * @param {CheckRequest} request
 * @returns {{label: string, roll: number, keep: number, bonus: number, explode: number}|null}
 */
function attackDamageOf(request) {
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
 * attack) only Grapple, which costs none, remains.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * @param {object} choice - `maneuver.*` fields of the dialog
 * @param {boolean} raisesAllowed
 * @returns {object}
 */
function buildManeuvers(choice, raisesAllowed) {
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
    ok: { label: T("l5r4.ui.common.roll"), callback: (_event, button) => formDataOf(button.form) },
    rejectClose: false,
    modal: true
  });
}
