/**
 * @module setup/migrations/items/skill-attack-rules
 * @description An attack with a Weapon Skill now reads "skill" rules (Ernie's ruling, #173), so a rule written twice,
 * once for "skill" and once for "attack", would count twice on such an attack. Items made before then (Consumed's
 * Perfection, Toku's Lesson) lose the "attack" copy, as the packs did; effects (a stored Fatigued or Fasting) keep it
 * for a stat block's attack, which has no Skill, and their "skill" copy leaves attacks out, as the statuses now do
 * (module/config/status-effects.js).
 * game-rules/29_types_of_rolls.md, p.80
 */

import { getSkillAttackTwins } from "../../../utils/selectors.js";

/**
 * Drop the "attack" copy of each rule an item also has for "skill".
 * @param {Item} item
 * @returns {Promise<void>}
 */
export async function migrateItemSkillAttackRules(item) {
  const rules = item._source.system?.rules ?? [];
  const drop = new Set(getSkillAttackTwins(rules).map(twin => twin.attack));
  if (drop.size) {
    await item.update(
      { "system.rules": rules.filter((_rule, i) => !drop.has(i)) },
      { render: false }
    );
  }
}

/**
 * Keep an effect's "skill" copy of each rule it also has for "attack" off attacks.
 * @param {ActiveEffect} effect
 * @returns {Promise<void>}
 */
export async function migrateEffectSkillAttackRules(effect) {
  const rules = effect._source.system?.rules ?? [];
  const restrict = new Set(getSkillAttackTwins(rules).map(twin => twin.skill));
  if (restrict.size) {
    const update = rules.map((rule, i) =>
      restrict.has(i)
        ? { ...rule, predicate: [...(rule.predicate ?? []), { not: "check:attack" }] }
        : rule
    );
    await effect.update({ "system.rules": update }, { render: false });
  }
}
