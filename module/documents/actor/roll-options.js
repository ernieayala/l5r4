/**
 * @module documents/actor/roll-options
 * @description The actor's roll options, the facts rule predicates test (roadmap/STAGE-07-RULE-ENGINE.md), set at
 * fixed points of preparation as module/documents/actor/rules.js reaches them: `status:<id>` for every active status
 * (stances included), `armor:worn`, `ring:<ring>:<value>`, `trait:<trait>:<value>`, `wound:<rank>`,
 * `skill:<skill>:<rank>`, `clan:<name>`, `family:<name>`, `school:<name>`, `item:<type>:<name>` for owned Advantages,
 * Disadvantages, Techniques, kata, kiho, tattoos, and spells, `honor-rank:<n>`, `glory-rank:<n>`, `status-rank:<n>`,
 * `taint-rank:<n>`, `insight:<n>`, `school-rank:<n>`, plus RollOption rules (rules.js).
 */

import { getHighestSchoolRank } from "../../utils/mechanics.js";
import { toInt } from "../../utils/type-coercion.js";

/** Item types an `item:<type>:<name>` roll option names, for prerequisites such as owning an Advantage. */
const optionItemTypes = new Set([
  "advantage",
  "disadvantage",
  "technique",
  "kata",
  "kiho",
  "tattoo",
  "spell"
]);

/**
 * Seed `actor.rollOptions` with the status, worn armor, owned-item, and rank roll options, at the end of the
 * "initial" Active Effect phase.
 * @param {Actor} actor
 */
export function prepareInitialRollOptions(actor) {
  actor.rollOptions = new Set([...actor.statuses].map(status => `status:${status}`));
  if (actor.items.some(item => item.type === "armor" && item.system.equipped)) {
    actor.rollOptions.add("armor:worn");
  }
  prepareItemRollOptions(actor, actor.rollOptions);
  for (const track of ["honor", "glory", "status"]) {
    if (actor.system[track]) {
      actor.rollOptions.add(`${track}-rank:${toInt(actor.system[track].rank)}`);
    }
  }
  actor.rollOptions.add(`taint-rank:${toInt(actor.system.shadowTaint.rank)}`);
}

/**
 * Add the rank roll options once Traits and Rings are known: `ring:<ring>:<value>`, `trait:<trait>:<value>`, and for
 * a PC `insight:<n>` and, with a School, `school-rank:<n>`.
 * @param {Actor} actor - Its `rollOptions` are extended in place
 * @param {object} sys - The actor's prepared system data, after prepareTraitsAndRings
 */
export function prepareRankRollOptions(actor, sys) {
  const options = actor.rollOptions;
  for (const ring of ["air", "earth", "fire", "water"]) {
    options.add(`ring:${ring}:${toInt(sys.rings[ring])}`);
  }
  options.add(`ring:void:${toInt(sys.rings.void.rank)}`);
  for (const [trait, value] of Object.entries(sys._derived.traitsEff)) {
    options.add(`trait:${trait}:${toInt(value)}`);
  }
  if (sys.insight) {
    options.add(`insight:${toInt(sys.insight.rank)}`);
    if (actor.items.some(item => item.type === "school")) {
      options.add(`school-rank:${getHighestSchoolRank(actor)}`);
    }
  }
}

/**
 * Add the `wound:<rank>` roll option for the current Wound Rank.
 * @param {Actor} actor
 * @param {object} sys
 * @param {object} current - The current entry of `sys.woundLevels`.
 */
export function prepareWoundRollOption(actor, sys, current) {
  const rank = Object.keys(sys.woundLevels).find(key => sys.woundLevels[key] === current);
  actor.rollOptions.add(`wound:${rank}`);
}

/**
 * The roll options of what the actor owns: `skill:<skill>:<rank>`, `clan:<name>`, `family:<name>`, `school:<name>`,
 * and `item:<type>:<name>`. Names are in lower case, as roll selectors are.
 * @param {Actor} actor
 * @param {Set<string>} options - Extended in place.
 */
function prepareItemRollOptions(actor, options) {
  for (const item of actor.items) {
    const name = item.name.toLowerCase().trim();
    if (item.type === "skill") {
      options.add(`skill:${name}:${toInt(item.system.rank)}`);
    } else if (["clan", "family", "school"].includes(item.type)) {
      options.add(`${item.type}:${name}`);
    } else if (optionItemTypes.has(item.type)) {
      options.add(`item:${item.type}:${name}`);
    }
  }
}
