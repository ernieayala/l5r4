/**
 * @fileoverview Roll Handler - Actor Sheet Roll Operations
 * 
 * Centralizes all roll-related functionality for actor sheets, providing consistent
 * roll interfaces for skills, attacks, damage, traits, and weapons. Integrates with
 * the dice service and applies game mechanics like wound penalties and stance bonuses.
 * 
 * **Responsibilities:**
 * - Process skill rolls with trait resolution
 * - Handle attack rolls with stance bonuses
 * - Execute damage rolls with trait bonuses
 * - Perform trait rolls (pure ability checks)
 * - Manage weapon attack rolls with skill/trait associations
 * - Apply wound penalties and modifiers
 * - Detect actor type (PC vs NPC) for appropriate roll handling
 * 
 * **Integration:**
 * Used by BaseActorSheet and child sheets via composition. All methods receive
 * explicit context for accessing actor data and performing dice service calls.
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link ../../services/dice/index.js|Dice Service}
 */

import { SkillRoll } from "../../services/dice/rolls/skill-roll.js";
import { NpcRoll } from "../../services/dice/rolls/npc-roll.js";
import { TraitRoll } from "../../services/dice/rolls/trait-roll.js";
import { getStanceAttackBonuses, getStanceDamageBonuses } from "../../services/stance/rolls/attack-bonuses.js";
import { normalizeTraitKey, getEffectiveTrait, extractRollParams, resolveWeaponSkillTrait, readWoundPenalty } from "../../utils/mechanics.js";
import { toInt } from "../../utils/type-coercion.js";
import { T } from "../../utils/localization.js";

/**
 * Roll Handler Class
 * Provides comprehensive roll functionality for actor sheets.
 */
export class RollHandler {
  /**
   * Shared skill roll handler for both PC and NPC sheets.
   * Automatically detects actor type and applies appropriate roll logic.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {string} [context.sheetClassName] - Optional sheet class name for NPC detection
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The clicked element within a skill item row
   * @returns {void}
   */
  static skillRoll(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const row = el?.closest?.(".item");
    const item = row ? context.actor.items.get(row.dataset.itemId) : null;
    if (!item) return;

    const traitKey = normalizeTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return;
    }
    const actorTrait = getEffectiveTrait(context.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = context.sheetClassName?.includes("Npc") || context.actor.type === "npc";
    
    // Determine if this is an attack roll (weapon/bow skill)
    const rollType = item.type === "weapon" || item.type === "bow" ? "attack" : null;
    
    // Apply stance bonuses for attack rolls
    let rollBonus = toInt(item.system?.rollBonus);
    let keepBonus = toInt(item.system?.keepBonus);
    if (rollType === "attack") {
      const stanceBonuses = getStanceAttackBonuses(context.actor);
      rollBonus += stanceBonuses.roll;
      keepBonus += stanceBonuses.keep;
    }

    SkillRoll({
      actor: context.actor,
      woundPenalty: readWoundPenalty(context.actor),
      actorTrait,
      skillRank: toInt(item.system?.rank),
      skillName: item.name,
      askForOptions: event.shiftKey,
      npc: isNpc,
      skillTrait: traitKey,
      rollType,
      rollBonus,
      keepBonus,
      totalBonus: toInt(item.system?.totalBonus)
    });
  }

  /**
   * Shared attack roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses and stance bonuses.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  static attackRoll(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, context.actor);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = getStanceAttackBonuses(context.actor);
    let rollName = `${context.actor.name}: ${params.label}`.trim();
    let description = params.description;
    
    // Add stance bonus information to description
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      description = description ? `${description} (Full Attack: ${bonusText})` : `Full Attack: ${bonusText}`;
    }

    return NpcRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: context.actor
    });
  }

  /**
   * Handle weapon attack rolls using weapon skill/trait associations.
   * Uses the weapon's associated skill if the character has it, otherwise falls back to the weapon's trait.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with weapon dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  static weaponAttackRoll(context, event, element) {
    event.preventDefault();
    const row = element.closest(".item");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    const weapon = id ? context.actor.items.get(id) : null;
    
    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn(game.i18n.localize("l5r4.ui.notifications.noValidWeapon"));
      return;
    }

    // Resolve weapon skill/trait association
    const weaponSkill = resolveWeaponSkillTrait(context.actor, weapon);
    
    // Apply stance bonuses to attack rolls
    const stanceBonuses = getStanceAttackBonuses(context.actor);
    
    // Check if weapon attack is untrained (no skill rank)
    const isUntrained = weaponSkill.skillRank === 0;
    
    const rollName = `${context.actor.name}: ${weapon.name} ${game.i18n.localize("l5r4.ui.mechanics.rolls.attackRoll")}`;
    const description = `${weaponSkill.description}`
      + `${(stanceBonuses.roll > 0 || stanceBonuses.keep > 0) ? ` (${game.i18n.localize("l5r4.ui.mechanics.stances.fullAttack")}: +${stanceBonuses.roll}k${stanceBonuses.keep})` : ''}`
      + `${isUntrained ? ` (${game.i18n.localize("l5r4.ui.mechanics.rolls.unskilled")})` : ''}`;

    return NpcRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll: weaponSkill.rollBonus + stanceBonuses.roll,
      diceKeep: weaponSkill.keepBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "attack",
      actor: context.actor,
      untrained: isUntrained,
      weaponId: id
    });
  }

  /**
   * Shared damage roll handler using extractRollParams utility.
   * Extracts roll parameters from dataset and applies trait bonuses and stance bonuses.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - The triggering event (shift-click for options)
   * @param {HTMLElement} element - The element with roll dataset attributes
   * @returns {Promise<any>} Roll result from Dice.NpcRoll
   */
  static damageRoll(context, event, element) {
    event.preventDefault();
    const el = /** @type {HTMLElement} */ (element || event.currentTarget);
    const params = extractRollParams(el, context.actor);
    
    // Apply stance bonuses to damage rolls
    const stanceBonuses = getStanceDamageBonuses(context.actor);
    const rollName = `${context.actor.name}: ${params.label}`.trim();
    let description = params.description;
    
    // Add stance bonus information to description
    if (stanceBonuses.roll > 0 || stanceBonuses.keep > 0) {
      const bonusText = `+${stanceBonuses.roll}k${stanceBonuses.keep}`;
      description = description ? `${description} (Full Attack: ${bonusText})` : `Full Attack: ${bonusText}`;
    }

    return NpcRoll({
      diceRoll: params.diceRoll + params.traitBonus + stanceBonuses.roll,
      diceKeep: params.diceKeep + params.traitBonus + stanceBonuses.keep,
      rollName,
      description,
      toggleOptions: event.shiftKey,
      rollType: "damage",
      actor: context.actor
    });
  }

  /**
   * Shared trait roll handler for both PC and NPC sheets.
   * Automatically detects actor type and uses appropriate roll method.
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {string} [context.sheetClassName] - Optional sheet class name for NPC detection
   * @param {Event} event - The triggering event (shift-click for PC options)
   * @param {HTMLElement} element - The trait element with dataset attributes
   * @returns {Promise<any>} Roll result from appropriate Dice method
   */
  static traitRoll(context, event, element) {
    event.preventDefault();
    const block = element.closest(".trait");
    const traitKey = normalizeTraitKey(
      block?.querySelector(".trait-rank")?.dataset.trait
      || element.dataset.traitName
      || "ref"
    );

    const traitValue = getEffectiveTrait(context.actor, traitKey);

    // Determine if this is an NPC sheet
    const isNpc = context.sheetClassName?.includes("Npc") || context.actor.type === "npc";

    if (isNpc) {
      return NpcRoll({
        npc: true,
        rollName: element?.dataset?.traitName || traitKey,
        traitName: traitKey,
        traitRank: traitValue
      });
    } else {
      return TraitRoll({
        traitRank: traitValue,
        traitName: traitKey,
        askForOptions: event.shiftKey,
        actor: context.actor
      });
    }
  }

  /**
   * NPC ring roll handler for streamlined ring-based rolls.
   * Processes ring-based rolls using dataset attributes for roll parameters.
   * Provides a simplified interface optimized for GM use during gameplay.
   * 
   * **Dataset Attributes:**
   * - `data-ring-name`: Display name for the ring (e.g., "Fire", "Water")
   * - `data-system-ring`: System ring identifier for localization lookup
   * - `data-ring-rank`: Numeric rank value for the ring (1-9)
   * 
   * **Roll Processing:**
   * - Uses Dice.NpcRoll() for specialized NPC roll handling
   * - Applies localized ring names from translation keys
   * - Defaults to "void" ring if no system ring specified
   * - Bypasses complex PC trait calculation systems
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event from ring roll element
   * @param {HTMLElement} element - Element containing dataset attributes
   * @returns {Promise<any>} Roll result processed by dice service
   * 
   * @example
   * // Template usage
   * <button data-action="roll-ring" 
   *         data-ring-name="Fire" 
   *         data-system-ring="fire" 
   *         data-ring-rank="3">
   *   Roll Fire Ring
   * </button>
   */
  static npcRingRoll(context, event, element) {
    event?.preventDefault?.();
    const ringName = element?.dataset?.ringName || T(`l5r4.ui.mechanics.rings.${element?.dataset?.systemRing || "void"}`);
    const systemRing = String(element?.dataset?.systemRing || "void").toLowerCase();
    const ringRank = toInt(element?.dataset?.ringRank);
    return NpcRoll({
      npc: true,
      rollName: ringName,
      ringName: systemRing,
      ringRank
    });
  }

  /**
   * NPC simple roll handler for dataset-driven rolls.
   * Processes basic NPC rolls using data attributes for roll parameters,
   * providing a streamlined interface for common NPC actions without
   * complex trait resolution or skill lookup.
   * 
   * **Dataset Attributes:**
   * - `data-roll`: Number of dice to roll (e.g., "5" for 5d10)
   * - `data-keep`: Number of dice to keep (e.g., "3" for keep 3)
   * - `data-rolllabel`: Display label for the roll type
   * - `data-trait`: Trait name being rolled (for display)
   * - `data-rolltype`: Roll category ("simple", "attack", "damage", etc.)
   * 
   * **Roll Processing:**
   * - Extracts roll parameters from element dataset
   * - Constructs descriptive roll name from actor and action
   * - Applies wound penalties automatically
   * - Supports shift-click for roll options dialog
   * - Uses NpcRoll() for specialized NPC roll handling
   * 
   * **Usage Examples:**
   * ```html
   * <!-- Basic trait roll -->
   * <div class="simple-roll" 
   *      data-roll="4" 
   *      data-keep="2" 
   *      data-rolllabel="Agility" 
   *      data-trait="agility">
   * 
   * <!-- Attack roll -->
   * <div class="simple-roll" 
   *      data-roll="6" 
   *      data-keep="3" 
   *      data-rolllabel="Katana Attack" 
   *      data-rolltype="attack">
   * ```
   * 
   * @param {object} context - Handler context
   * @param {Actor} context.actor - The actor document
   * @param {Event} event - Click event from simple roll element
   * @returns {Promise<any>} Roll result processed by dice service
   */
  static async npcSimpleRoll(context, event) {
    event?.preventDefault?.();
    const ds = event.currentTarget?.dataset || {};
    const diceRoll = toInt(ds.roll);
    const diceKeep = toInt(ds.keep);
    const rollTypeLabel = ds.rolllabel || "";
    const trait = ds.trait || "";
    const rollType = ds.rolltype || "simple";
    const rollName = `${context.actor.name}: ${rollTypeLabel} ${trait}`.trim();

    return NpcRoll({
      woundPenalty: readWoundPenalty(context.actor),
      diceRoll,
      diceKeep,
      rollName,
      toggleOptions: event.shiftKey,
      rollType
    });
  }
}
