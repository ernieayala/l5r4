/**
 * @module services/links
 * @description What a text link does when clicked (roadmap/STAGE-14): each routes to a flow an earlier stage built
 * and computes no rule itself.
 *
 * - Check: opens the roll dialog for the acting character through the roll pipeline, filled from the link and
 *   still editable (decision 2). A Skill the character lacks rolls Unskilled with the link's Trait.
 * - Damage: rolls a damage card the damage card's Apply buttons apply (module/services/combat/damage.js).
 * - Condition: applies the status to the targeted tokens, else the controlled ones.
 * - Fear: a Fear test for those tokens.
 * game-rules/30_skill_rolls_expanded.md, p.80
 * game-rules/42_fear.md, p.90
 */

import { F, T } from "../utils/localization.js";
import { getEffectiveTrait, ringRankOf } from "../utils/mechanics.js";
import { rollCheck } from "./dice/check/roll-check.js";
import { getRollActor } from "./dice/resources/void-points.js";
import { formatSkillLabel } from "./dice/rolls/skill-roll.js";
import { buildSkillRequest } from "./combat/flow.js";
import { applyEffectAnywhere } from "./effects/apply.js";
import { testFearRank } from "./fear.js";

/**
 * The text a link shows when it has no `{label}`.
 * @param {import("../utils/link-syntax.js").LinkSpec} spec - A link that parsed
 * @returns {string}
 */
export function formatLinkText(spec) {
  if (spec.label) {
    return spec.label;
  }
  if (spec.type === "Check") {
    const what = spec.skill
      ? [formatSkillLabel(spec.skill), spec.trait ? formatTraitName(spec.trait) : ""]
          .filter(Boolean)
          .join(" / ")
      : spec.trait
        ? formatTraitName(spec.trait)
        : T(`l5r4.ui.mechanics.rings.${spec.ring}`);
    return spec.tn ? F("l5r4.ui.links.checkTn", { what, tn: spec.tn }) : what;
  }
  if (spec.type === "Damage") {
    const { roll, keep, bonus } = spec.pool;
    const pool = `${roll}k${keep}${bonus > 0 ? `+${bonus}` : bonus < 0 ? bonus : ""}`;
    return F("l5r4.ui.links.damage", { pool });
  }
  if (spec.type === "Condition") {
    return T(CONFIG.statusEffects[spec.condition]?.name ?? spec.condition);
  }
  return F("l5r4.ui.links.fear", { rank: spec.rank });
}

/**
 * The roll pipeline request for a Check link and a character: a Skill, Trait, or Ring roll with the link's TN, its
 * dialog shown. Null, with a warning, when a Skill the character lacks has no Trait to roll with.
 * @param {Actor} actor
 * @param {{skill: string, trait: string, ring: string, tn: number|null, label?: string}} spec
 * @returns {object|null}
 */
export function checkRequestOf(actor, spec) {
  const label = formatLinkText({ ...spec, type: "Check" });
  const common = { label, askForOptions: true, ...(spec.tn ? { tn: spec.tn } : {}) };
  if (spec.skill) {
    const key = spec.skill.toLowerCase().trim();
    const item = actor.items.find(i => i.type === "skill" && i.name.toLowerCase().trim() === key);
    const trait = spec.trait || item?.system.trait;
    if (!trait) {
      ui.notifications?.warn(F("l5r4.ui.links.needTrait", { skill: spec.skill, name: actor.name }));
      return null;
    }
    return { ...buildSkillRequest(actor, key, trait), kind: "skill", ...common };
  }
  if (spec.trait) {
    const rank = getEffectiveTrait(actor, spec.trait);
    return { actor, kind: "trait", trait: spec.trait, base: { roll: rank, keep: rank }, ...common };
  }
  const rank = ringRankOf(actor, spec.ring);
  return { actor, kind: "ring", ring: spec.ring, base: { roll: rank, keep: rank }, ...common };
}

/**
 * Run a link that parsed.
 * @param {import("../utils/link-syntax.js").LinkSpec} spec
 * @returns {Promise<unknown>}
 */
export async function onLinkClick(spec) {
  if (spec.type === "Check" || spec.type === "Damage") {
    const actor = getRollActor();
    if (!actor) {
      ui.notifications?.warn(T("l5r4.ui.links.noActor"));
      return null;
    }
    if (spec.type === "Damage") {
      return rollCheck({
        actor,
        kind: "damage",
        label: formatLinkText(spec),
        base: spec.pool,
        askForOptions: true
      });
    }
    const request = checkRequestOf(actor, spec);
    return request ? rollCheck(request) : null;
  }
  const actors = getLinkTargets();
  if (!actors.length) {
    ui.notifications?.warn(T("l5r4.ui.links.noTargets"));
    return null;
  }
  for (const actor of actors) {
    if (spec.type === "Condition") {
      await applyEffectAnywhere(actor, spec.condition);
    } else {
      await testFearRank({ character: actor, fearRank: spec.rank });
    }
  }
  return null;
}

/**
 * The localized name of a Trait key or the Void Ring.
 * @param {string} trait
 * @returns {string}
 */
function formatTraitName(trait) {
  return T(trait === "void" ? "l5r4.ui.mechanics.rings.void" : `l5r4.ui.mechanics.traits.${trait}`);
}

/**
 * The actors a Condition or Fear link acts on: the targeted tokens', else the controlled tokens'.
 * @returns {Actor[]}
 */
function getLinkTargets() {
  const targeted = [...game.user.targets].map(token => token.actor);
  const tokens = targeted.length ? targeted : canvas.tokens.controlled.map(token => token.actor);
  return [...new Set(tokens.filter(Boolean))];
}
