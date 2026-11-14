/**
 * Roll Handler Module
 *
 * Sheet actions that start rolls. Each handler reads what to roll from the sheet (an item row or data-* attributes)
 * and hands it to a roll service; the roll pipeline (module/services/dice/check/) gathers every modifier, so
 * handlers add none (AUTOMATION.md B1-B3). A normal click shows the roll dialog; Shift-click skips it.
 *
 * @module sheets/handlers/roll-handler
 */

import { SkillRoll } from "../../services/dice/rolls/skill-roll.js";
import { SimpleRoll } from "../../services/dice/rolls/simple-roll.js";
import { TraitRoll } from "../../services/dice/rolls/trait-roll.js";
import { RingRoll } from "../../services/dice/rolls/ring-roll.js";
import {
  normalizeTraitKey,
  getEffectiveTrait,
  extractRollParams,
  resolveWeaponSkillTrait,
  ringRank
} from "../../utils/mechanics.js";
import { toInt } from "../../utils/type-coercion.js";
import { T } from "../../utils/localization.js";

/**
 * Static roll actions for actor sheets.
 *
 * A roll already in progress for the same actor, roll type, and item is ignored, so a double click rolls once.
 */
export class RollHandler {
  /**
   * Rolls in progress, keyed "actorId-rollType-itemId" or "actorId-rollType".
   * @type {Set<string>}
   * @private
   */
  static _rollInProgress = new Set();

  /**
   * The element an action targets: the delegated element, or the event's current target.
   * @param {HTMLElement|null} element
   * @param {Event} event
   * @returns {HTMLElement}
   * @private
   */
  static _getElement(element, event) {
    return element || event.currentTarget;
  }

  /**
   * Run a roll unless the same roll is already in progress.
   * @param {string} key - Roll key
   * @param {function(): Promise<*>} roll
   * @returns {Promise<*>}
   * @private
   */
  static async _once(key, roll) {
    if (RollHandler._rollInProgress.has(key)) {
      return undefined;
    }
    RollHandler._rollInProgress.add(key);
    try {
      return await roll();
    } finally {
      RollHandler._rollInProgress.delete(key);
    }
  }

  /**
   * Roll a Skill from its row: (Skill + Trait)k(Trait) (p.79).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the skill row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async skillRoll(context, event, element) {
    event.preventDefault();
    const row = RollHandler._getElement(element, event)?.closest?.(".item");
    const item = row ? context.actor.items.get(row.dataset.itemId) : null;
    if (!item) {
      return undefined;
    }
    return RollHandler.rollSkill(context.actor, item, !event.shiftKey);
  }

  /**
   * Roll a Skill item: (Skill + Trait)k(Trait) with its own Trait (p.79). The sheet's row and a hotbar macro both
   * roll through here.
   * @param {Actor} actor
   * @param {Item} item  A skill the actor owns
   * @param {boolean} askForOptions  Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollSkill(actor, item, askForOptions) {
    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return undefined;
    }
    return RollHandler._once(`${actor.id}-skill-${item.id}`, () =>
      SkillRoll({
        actor,
        actorTrait: getEffectiveTrait(actor, traitKey),
        skillRank: toInt(item.system?.rank),
        skillName: item.name,
        skillTrait: traitKey,
        askForOptions
      })
    );
  }

  /**
   * Roll an NPC attack from data-roll / data-keep (plus data-trait and data-modifier).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async attackRoll(context, event, element) {
    event.preventDefault();
    const el = RollHandler._getElement(element, event);
    const params = extractRollParams(el, context.actor);
    // The stat block pairs attack N with damage N; the attack stores it for its damage button. dataset is user input.
    const num = ["1", "2", "3"].includes(el.dataset.attackNum) ? el.dataset.attackNum : null;
    const damage = num ? context.actor.system[`damage${num}`] : null;
    return RollHandler._once(`${context.actor.id}-attack-${params.label}`, () =>
      SimpleRoll({
        diceRoll: params.diceRoll + params.traitBonus,
        diceKeep: params.diceKeep + params.traitBonus,
        modifier: toInt(el.dataset.modifier),
        rollName: params.label,
        askForOptions: !event.shiftKey,
        rollType: "attack",
        actor: context.actor,
        damage:
          damage && (damage.roll || damage.keep)
            ? {
                label: params.label,
                roll: toInt(damage.roll),
                keep: toInt(damage.keep),
                bonus: toInt(damage.modifier)
              }
            : null
      })
    );
  }

  /**
   * Attack with a weapon from its row: its associated Skill with that Skill's Trait, or the fallback Trait alone as
   * an Unskilled Roll when the character lacks the Skill (p.80).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the weapon row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async weaponAttackRoll(context, event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const weapon = id ? context.actor.items.get(id) : null;
    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noValidWeapon"));
      return undefined;
    }
    return RollHandler.rollWeaponAttack(context.actor, weapon, !event.shiftKey);
  }

  /**
   * Attack with a weapon item: its associated Skill with that Skill's Trait, or the fallback Trait alone as an
   * Unskilled Roll when the character lacks the Skill (p.80). The sheet's row and a hotbar macro both attack through
   * here.
   * @param {Actor} actor
   * @param {Item} weapon  A weapon or bow the actor owns
   * @param {boolean} askForOptions  Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollWeaponAttack(actor, weapon, askForOptions) {
    const id = weapon.id;
    const weaponSkill = resolveWeaponSkillTrait(actor, weapon);
    const associatedSkill = weapon.system.associatedSkill || null;
    const skillItem = associatedSkill
      ? actor.items.find(
          i => i.type === "skill" && i.name.toLowerCase() === associatedSkill.toLowerCase()
        )
      : null;
    const skillTrait = skillItem?.system.trait || weapon.system.fallbackTrait || "agi";

    return RollHandler._once(`${actor.id}-weapon-attack-${id}`, () =>
      weaponSkill.skillRank > 0 && skillItem
        ? SkillRoll({
            actorTrait: weaponSkill.traitValue,
            skillRank: weaponSkill.skillRank,
            skillName: associatedSkill,
            skillTrait,
            askForOptions,
            actor,
            rollType: "attack",
            weaponId: id
          })
        : SimpleRoll({
            diceRoll: weaponSkill.traitValue,
            diceKeep: weaponSkill.traitValue,
            rollName: `${weapon.name} ${T("l5r4.ui.mechanics.rolls.attackRoll")}`,
            askForOptions,
            rollType: "attack",
            actor,
            untrained: true,
            weaponId: id,
            isBow: weapon.type === "bow" || Boolean(weapon.system.isBow),
            skillName: associatedSkill,
            skillTrait
          })
    );
  }

  /**
   * Roll NPC damage from data-roll / data-keep (plus data-trait and data-modifier).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async damageRoll(context, event, element) {
    event.preventDefault();
    const el = RollHandler._getElement(element, event);
    const params = extractRollParams(el, context.actor);
    return RollHandler._once(`${context.actor.id}-damage-${params.label}`, () =>
      SimpleRoll({
        diceRoll: params.diceRoll + params.traitBonus,
        diceKeep: params.diceKeep + params.traitBonus,
        modifier: toInt(el.dataset.modifier),
        rollName: params.label,
        askForOptions: !event.shiftKey,
        rollType: "damage",
        actor: context.actor
      })
    );
  }

  /**
   * Roll a Trait (p.80): roll and keep its rank.
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the trait block
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async traitRoll(context, event, element) {
    event.preventDefault();
    const block = element.closest(".trait");
    // The rank element inside this trait block names the Trait
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait || element.dataset.traitName || "ref"
    );
    return RollHandler.rollTrait(context.actor, traitKey, !event.shiftKey);
  }

  /**
   * Roll a Trait by key: roll and keep its rank (p.80). An NPC's goes through its stat-block roll. The sheet and a
   * hotbar macro both roll through here.
   * @param {Actor} actor
   * @param {string} traitKey
   * @param {boolean} askForOptions  Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollTrait(actor, traitKey, askForOptions) {
    const options = { traitRank: getEffectiveTrait(actor, traitKey), askForOptions, actor };
    return RollHandler._once(`${actor.id}-trait-${traitKey}`, () =>
      actor.type === "npc"
        ? SimpleRoll({ ...options, traitName: traitKey })
        : TraitRoll({ ...options, traitName: traitKey })
    );
  }

  /**
   * Roll an NPC Ring (p.80) from data-system-ring and data-ring-rank.
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async npcRingRoll(context, event, element) {
    event?.preventDefault?.();
    const systemRing = String(element?.dataset?.systemRing || "void").toLowerCase();
    return RollHandler.rollRing(context.actor, systemRing, !event?.shiftKey);
  }

  /**
   * Roll a Ring by key: roll and keep its rank (p.80). A PC's dialog can make it a Spell Casting Roll; an NPC's goes
   * through its stat-block roll. Both sheets and a hotbar macro roll through here.
   * @param {Actor} actor
   * @param {string} ring  air, earth, fire, water, or void
   * @param {boolean} askForOptions  Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollRing(actor, ring, askForOptions) {
    const rank = ringRank(actor, ring);
    const ringName = T(`l5r4.ui.mechanics.rings.${ring}`);
    return RollHandler._once(`${actor.id}-ring-${ring}`, () =>
      actor.type === "npc"
        ? SimpleRoll({ rollName: ringName, ringName: ring, ringRank: rank, askForOptions, actor })
        : RingRoll({ ringRank: rank, ringName, systemRing: ring, askForOptions, actor })
    );
  }

  /**
   * Roll an XkY pool from the clicked element's data-roll, data-keep, data-rolllabel, data-trait, and
   * data-rolltype ("attack", "damage", or a plain roll).
   * @param {Object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async npcSimpleRoll(context, event) {
    event?.preventDefault?.();
    const ds = event.currentTarget?.dataset || {};
    const rollType = ds.rolltype || "simple";
    const rollName = `${ds.rolllabel || ""} ${ds.trait || ""}`.trim();
    return RollHandler._once(`${context.actor.id}-simple-${rollType}-${rollName}`, () =>
      SimpleRoll({
        diceRoll: toInt(ds.roll),
        diceKeep: toInt(ds.keep),
        rollName,
        askForOptions: !event.shiftKey,
        rollType,
        actor: context.actor
      })
    );
  }
}
