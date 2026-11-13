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
import {
  normalizeTraitKey,
  getEffectiveTrait,
  extractRollParams,
  resolveWeaponSkillTrait
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
   * Whether the sheet is an NPC's.
   * @param {Object} context - Sheet context
   * @returns {boolean}
   * @private
   */
  static _isNpc(context) {
    return context.sheetClassName?.includes("Npc") || context.actor.type === "npc";
  }

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
    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return undefined;
    }
    return RollHandler._once(`${context.actor.id}-skill-${item.id}`, () =>
      SkillRoll({
        actor: context.actor,
        actorTrait: getEffectiveTrait(context.actor, traitKey),
        skillRank: toInt(item.system?.rank),
        skillName: item.name,
        skillTrait: traitKey,
        askForOptions: !event.shiftKey
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
    return RollHandler._once(`${context.actor.id}-attack-${params.label}`, () =>
      SimpleRoll({
        diceRoll: params.diceRoll + params.traitBonus,
        diceKeep: params.diceKeep + params.traitBonus,
        modifier: toInt(el.dataset.modifier),
        rollName: params.label,
        askForOptions: !event.shiftKey,
        rollType: "attack",
        actor: context.actor
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

    const weaponSkill = resolveWeaponSkillTrait(context.actor, weapon);
    const associatedSkill = weapon.system.associatedSkill || null;
    const skillItem = associatedSkill
      ? context.actor.items.find(
          i => i.type === "skill" && i.name.toLowerCase() === associatedSkill.toLowerCase()
        )
      : null;
    const skillTrait = skillItem?.system.trait || weapon.system.fallbackTrait || "agi";

    return RollHandler._once(`${context.actor.id}-weapon-attack-${id}`, () =>
      weaponSkill.skillRank > 0 && skillItem
        ? SkillRoll({
            actorTrait: weaponSkill.traitValue,
            skillRank: weaponSkill.skillRank,
            skillName: associatedSkill,
            skillTrait,
            askForOptions: !event.shiftKey,
            actor: context.actor,
            rollType: "attack",
            weaponId: id
          })
        : SimpleRoll({
            diceRoll: weaponSkill.traitValue,
            diceKeep: weaponSkill.traitValue,
            rollName: `${weapon.name} ${T("l5r4.ui.mechanics.rolls.attackRoll")}`,
            askForOptions: !event.shiftKey,
            rollType: "attack",
            actor: context.actor,
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
    const traitRank = getEffectiveTrait(context.actor, traitKey);
    const options = {
      traitRank,
      askForOptions: !event.shiftKey,
      actor: context.actor
    };
    return RollHandler._once(`${context.actor.id}-trait-${traitKey}`, () =>
      RollHandler._isNpc(context)
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
    return RollHandler._once(`${context.actor.id}-ring-${systemRing}`, () =>
      SimpleRoll({
        rollName: element?.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${systemRing}`),
        ringName: systemRing,
        ringRank: toInt(element?.dataset?.ringRank),
        askForOptions: !event?.shiftKey,
        actor: context.actor
      })
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
