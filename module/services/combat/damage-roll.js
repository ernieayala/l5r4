/**
 * @module services/combat/damage-roll
 * @description The damage roll of a hit, from its attack message's stored context, through the roll pipeline: the
 * damage pool stored at the attack, Increased Damage, the Feint bonus, a Disarm's own pool, the weapon's rules, and
 * the attack's target. The damage card it posts is applied through module/services/combat/damage.js.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/38_maneuvers.md, p.86-87
 */

import { TN_PER_RAISE } from "../../config/game-mechanics.js";
import { T } from "../../utils/localization.js";
import { toInt } from "../../utils/type-coercion.js";
import { MANEUVER_RAISES, getFeintBonus } from "../../utils/damage.js";
import { rollCheck } from "../dice/check/roll-check.js";

/**
 * Disarm damage, without Strength.
 * game-rules/38_maneuvers.md, p.86
 */
const DISARM_DAMAGE = Object.freeze({ roll: 2, keep: 1 });

/**
 * Roll damage for a hit from its attack message: the damage pool stored at the attack, Increased Damage +1k0 per
 * Raise left, the Feint bonus, 2k1 for a Disarm, the weapon's own rules, and the attack's target.
 * game-rules/32_attack_and_defense.md, p.82
 * game-rules/38_maneuvers.md, p.86-87
 * @param {ChatMessage} message - A `roll` message of kind "attack" that hit
 * @param {{askForOptions?: boolean}} [options]
 * @returns {Promise<ChatMessage|null>}
 */
export async function rollDamageFromAttack(message, { askForOptions = true } = {}) {
  const attack = message.system;
  const actor = fromUuidSync(attack.actorUuid);
  if (!actor) {
    ui.notifications?.warn(T("l5r4.ui.notifications.actorNotFound"));
    return null;
  }
  if (!actor.isOwner) {
    ui.notifications?.warn(T("l5r4.ui.notifications.noPermissionDamage"));
    return null;
  }
  const weapon = attack.weaponUuid ? fromUuidSync(attack.weaponUuid) : null;
  const spec = attack.damage.label
    ? attack.damage
    : // An attack posted before its damage pool was stored: the weapon's pool now
      {
        label: weapon?.name ?? "",
        roll: toInt(weapon?.system.derivedDamageRoll ?? weapon?.system.damageRoll),
        keep: toInt(weapon?.system.derivedDamageKeep ?? weapon?.system.damageKeep),
        bonus: 0,
        explode: weapon ? weapon.system.damageExplode : 10
      };
  const maneuvers = attack.maneuvers;
  const base = maneuvers.disarm
    ? { ...DISARM_DAMAGE, bonus: 0 }
    : { roll: spec.roll, keep: spec.keep, bonus: spec.bonus };
  const modifiers = [];
  if (maneuvers.increasedDamage) {
    modifiers.push({ label: T("l5r4.ui.check.increasedDamage"), roll: maneuvers.increasedDamage });
  }
  // Feint: half what the attack beat the target's Armor TN by, the Feint's own 2 Raises counted (Ernie's ruling):
  // the attacker's wound penalty and other Raises do not shrink it
  // game-rules/38_maneuvers.md, p.86
  const feint = maneuvers.feint
    ? getFeintBonus(
        attack.outcome.total - (attack.tn.armor + TN_PER_RAISE * MANEUVER_RAISES.feint),
        actor.system.insightRank
      )
    : 0;
  if (feint) {
    modifiers.push({ label: T("l5r4.ui.combat.feint"), total: feint });
  }
  const target = attack.target.uuid ? (fromUuidSync(attack.target.uuid) ?? null) : null;
  return rollCheck({
    actor,
    kind: "damage",
    label: `${T("l5r4.ui.check.damageFor")} ${spec.label}`,
    base,
    weapon,
    explode: spec.explode ?? null,
    modifiers,
    target,
    attackOf: message.id,
    askForOptions
  });
}
